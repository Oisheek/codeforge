import { detectIntent } from "./intent.js";
import { createExecutionPlan } from "./planner.js";
import { retrieveContext } from "./rag.js";
import { buildContext } from "./contextBuilder.js";
import { routeRequest } from "./router.js";
import { configureThinking } from "./thinking.js";
import { getFallbackRoute } from "./fallback.js";
import {
  createOpenRouterTools,
} from "../providers/openrouter.js";
import {
  executeAuthorizedTool,
} from "../core/tool.js";

import {
  resolveToolCalls,
} from "./toolCalls.js";


function getAvailableTools(tools) {
  if (!tools) {
    return [];
  }

  if (
    typeof tools.describe !== "function" ||
    typeof tools.get !== "function"
  ) {
    throw new TypeError(
      "Invalid tool registry."
    );
  }

  return tools.describe();
}

function normalizeUsage(usage = {}) {
  const promptTokens =
    usage.promptTokens ??
    usage.prompt_tokens ??
    0;

  const completionTokens =
    usage.completionTokens ??
    usage.completion_tokens ??
    0;

  const reasoningTokens =
    usage.completionTokensDetails?.reasoningTokens ??
    usage.completion_tokens_details?.reasoning_tokens ??
    0;

  const totalTokens =
    usage.totalTokens ??
    usage.total_tokens ??
    promptTokens + completionTokens;

  const cost =
    typeof usage.cost === "number"
      ? usage.cost
      : null;

  return {
    promptTokens,
    completionTokens,
    reasoningTokens,
    totalTokens,
    cost,
  };
}

function getRetrievedContext(rag = {}) {
  const results = Array.isArray(rag.results)
    ? rag.results
    : [];

  return results
    .filter((result) => result?.path)
    .map((result) => ({
      path: result.path,
      score:
        Number.isFinite(result.score)
          ? result.score
          : null,
      reason: result.reason ?? null,
    }));
}

async function executeResolvedToolCalls({
  toolCalls,
  registry,
  projectRoot,
  allowedCapabilities,
  requestApproval = null,
  emit,
}) {
  const resolvedCalls =
    resolveToolCalls(
      toolCalls,
      registry
    );

  const results = [];

  for (const call of resolvedCalls) {
    emit({
      type: "stage:start",
      stage: "tool",
      detail: `Running ${call.name}`,
      data: {
        tool: call.name,
        toolCallId: call.id,
      },
    });

    let result =
  await executeAuthorizedTool(
    call.tool,
    call.arguments,
    {
      projectRoot,
    },
    {
      allowedCapabilities,
      approval: null,
    }
  );

if (
  !result.success &&
  result.error?.code ===
    "approval_required" &&
  typeof requestApproval ===
    "function"
) {
  emit({
    type: "stage:start",
    stage: "approval",
    detail:
      `Approval required for ${call.name}`,
    data: {
      tool: call.name,
      toolCallId: call.id,
      arguments: call.arguments,
    },
  });

  const approved =
    await requestApproval({
      tool: call.tool,
      toolName: call.name,
      toolCallId: call.id,
      arguments: call.arguments,
      authorization:
        result.metadata?.authorization ??
        null,
    });

  if (approved === true) {
    result =
      await executeAuthorizedTool(
        call.tool,
        call.arguments,
        {
          projectRoot,
        },
        {
          allowedCapabilities,
          approval: "approved",
        }
      );
  }
  
  else {
  result = {
    ...result,

    error: {
      code: "approval_denied",
      message:
        `Approval denied for tool: ${call.name}`,
      details: {
        tool: call.name,
        toolCallId: call.id,
      },
    },

    metadata: {
      ...result.metadata,

      authorization: {
        ...result.metadata?.authorization,
        allowed: false,
        code: "approval_denied",
        reason:
          "User denied tool execution.",
        requiresApproval: true,
      },
    },
  };
}

  emit({
    type:
      approved === true &&
      result.success
        ? "stage:success"
        : "stage:error",

    stage: "approval",

    detail:
      approved === true
        ? result.success
          ? `${call.name} approved`
          : `${call.name} approval execution failed`
        : `${call.name} denied`,

    data: {
      tool: call.name,
      toolCallId: call.id,
      approved:
        approved === true,
    },
  });
}

    results.push({
      id: call.id,
      name: call.name,
      arguments: call.arguments,
      result,
    });

    emit({
      type: result.success
        ? "stage:success"
        : "stage:error",

      stage: "tool",

      detail: result.success
        ? `${call.name} completed`
        : `${call.name}: ${result.error?.message ??
        "Tool execution failed"
        }`,

      data: {
        tool: call.name,
        toolCallId: call.id,
        success: result.success,
        error:
          result.error ?? null,
      },
    });
  }

  return results;
}

function createToolResultMessages(
  toolResults
) {
  return toolResults.map(
    ({ id, result }) => ({
      role: "tool",

      tool_call_id: id,

      content: JSON.stringify(
        result.success
          ? {
            success: true,
            output: result.output,
          }
          : {
            success: false,
            error: result.error,
          }
      ),
    })
  );
}

export async function execute({
  prompt,
  repository,
  provider,
  providers = [],
  tools = null,
  requestApproval = null,
  config = {},
  project = {},
  git = {},
  memory = {},
  systemPrompt = "",
  onEvent = null,
}) {
  const emit = (event) => {
    if (typeof onEvent === "function") {
      onEvent(event);
    }
  };
  const availableTools =
    getAvailableTools(tools);

  emit({
    type: "run:start",
    stage: "run",
    data: {
      toolCount: availableTools.length,
      tools: availableTools.map(
        (tool) => tool.name
      ),
    },
  });
  const modelTools =
    createOpenRouterTools(
      availableTools
    );
  // 1. Detect intent
  emit({
    type: "stage:start",
    stage: "intent",
    detail: "Detecting request intent",
  });

  const intent = detectIntent(prompt);

  emit({
    type: "stage:success",
    stage: "intent",
    detail:
      typeof intent === "string"
        ? intent
        : intent?.type ?? "Detected",
  });

  // 2. Build execution plan
  emit({
    type: "stage:start",
    stage: "plan",
    detail: "Building execution plan",
  });

  const plan = createExecutionPlan(intent);

  emit({
    type: "stage:success",
    stage: "plan",
    detail: Array.isArray(plan?.steps)
      ? plan.steps.join(" → ")
      : "Plan ready",
  });

  // 3. Retrieve repository context
  emit({
    type: "stage:start",
    stage: "retrieve",
    detail: "Searching repository context",
  });

  const rag = await retrieveContext({
    repository,
    plan,
    query: prompt,
  });

  const retrievalCount =
    rag?.results?.length ??
    rag?.chunks?.length ??
    rag?.documents?.length ??
    0;

  const retrievedContext =
    getRetrievedContext(rag);

  const retrievedFiles =
    retrievedContext.map(
      (result) => result.path
    );

  emit({
    type: "stage:success",
    stage: "retrieve",
    detail: `${retrievalCount} result${retrievalCount === 1 ? "" : "s"
      }`,
    data: {
      count: retrievalCount,
      files: retrievedFiles,
      results: retrievedContext,
    },
  });

  // 4. Build model context
  emit({
    type: "stage:start",
    stage: "context",
    detail: "Building model context",
  });

  const context = buildContext({
    prompt,
    plan,
    project,
    git,
    memory,
    rag,
    systemPrompt,
  });

  emit({
    type: "stage:success",
    stage: "context",
    detail: "Context ready",
  });

  // 5. Select provider/model
  emit({
    type: "stage:start",
    stage: "route",
    detail: "Selecting provider and model",
  });

  let route = routeRequest({
    plan,
    config,
    providers,
  });

  emit({
    type: "stage:success",
    stage: "route",
    detail:
      [
        route?.provider,
        route?.modelRole,
        route?.model,
      ]
        .filter(Boolean)
        .join(" · ") ||
      "Route selected",
    data: {
      provider:
        route?.provider ?? null,

      modelRole:
        route?.modelRole ?? null,

      model:
        route?.model ?? null,
    },
  });

  // 6. Configure reasoning
  emit({
    type: "stage:start",
    stage: "thinking",
    detail: "Configuring reasoning",
  });

  const thinking = configureThinking({
    plan,
    route,
  });

  emit({
    type: "stage:success",
    stage: "thinking",
    detail:
      thinking?.enabled === false
        ? "Disabled"
        : [
          thinking?.mode,
          thinking?.budget,
        ]
          .filter(
            (value) =>
              value !== undefined &&
              value !== null
          )
          .join(" · ") ||
        "Configured",
    data: {
      enabled:
        thinking?.enabled ?? false,
      mode:
        thinking?.mode ?? null,
      budget:
        thinking?.budget ?? null,
    },
  });

  let attempt = 0;

  const maxAttempts =
    config.maxAttempts ?? 3;

  const maxToolRounds =
    config.maxToolRounds ?? 10;

  const messages = [];

  if (context.system) {
    messages.push({
      role: "system",
      content: context.system,
    });
  }

  messages.push({
    role: "user",
    content:
      context.modelUser ??
      context.user,
  });

  while (attempt < maxAttempts) {
    const currentAttempt = attempt + 1;

    try {
      emit({
        type: "stage:start",
        stage: "generate",
        detail: `Calling ${route?.model ?? "model"
          } · attempt ${currentAttempt}/${maxAttempts}`,
        data: {
          provider:
            route?.provider ?? null,

          modelRole:
            route?.modelRole ?? null,

          model:
            route?.model ?? null,

          attempt: currentAttempt,
          maxAttempts,
        },
      });

      let response = null;
      let toolResults = [];
      let toolRound = 0;

      while (true) {
        response =
          await provider.generate({
            messages,
            model: route.model,
            temperature:
              route.temperature,
            maxTokens:
              route.maxTokens,
            thinking,
            tools: modelTools,
            stream: route.stream,
          });

        const responseToolCalls =
          Array.isArray(response?.toolCalls)
            ? response.toolCalls
            : [];

        // Model produced a normal final response.
        if (responseToolCalls.length === 0) {
          break;
        }

        if (toolRound >= maxToolRounds) {
          const error =
            new Error(
              `Maximum tool rounds exceeded (${maxToolRounds}).`
            );

          error.code =
            "max_tool_rounds_exceeded";

          throw error;
        }

        emit({
          type: "stage:start",
          stage: "tool_round",
          detail:
            `Tool round ${toolRound + 1}/${maxToolRounds}`,
          data: {
            round: toolRound + 1,
            maxToolRounds,
            count:
              responseToolCalls.length,
          },
        });

        const roundResults =
          await executeResolvedToolCalls({
            toolCalls:
              responseToolCalls,

            registry:
              tools,

            projectRoot:
              project.root,

            allowedCapabilities: [
              "filesystem.read",
              "filesystem.search",
              "filesystem.write",
            ],

            requestApproval,

            emit,
          });

        toolResults.push(
          ...roundResults
        );

        /*
         * Preserve the assistant turn that requested
         * the tools.
         */
        if (response.message) {
          messages.push(
            response.message
          );
        }

        const toolMessages =
          createToolResultMessages(
            roundResults
          );

        messages.push(
          ...toolMessages
        );

        toolRound += 1;

        emit({
          type: "stage:success",
          stage: "tool_round",
          detail:
            `Tool round ${toolRound} completed`,
          data: {
            round: toolRound,
            maxToolRounds,
            count:
              roundResults.length,
          },
        });
      }

      const usage =
        normalizeUsage(response?.usage);

      emit({
        type: "stage:success",
        stage: "generate",
        detail: `${route?.model ?? "Model"
          } completed`,
        data: {
          provider:
            route?.provider ?? null,

          modelRole:
            route?.modelRole ?? null,

          model:
            response?.model ??
            route?.model ??
            null,

          attempt: currentAttempt,
          maxAttempts,

          finishReason:
            response?.finishReason ??
            null,

          toolRounds: toolRound,

          usage,
        },
      });

      emit({
        type: "stage:success",
        stage: "complete",
        detail: "Execution complete",
        data: {
          attempts: currentAttempt,
          retrievalCount,
          retrievedFiles,
          retrievedContext,

          provider:
            route?.provider ?? null,

          modelRole:
            route?.modelRole ?? null,

          model:
            response?.model ??
            route?.model ??
            null,

          toolRounds:
            toolRound,

          usage,
        },
      });

      return {
        success: true,
        intent,
        plan,
        route,
        thinking,
        context,
        response,
        toolResults,
        telemetry: {
          attempts: currentAttempt,
          toolRounds: toolRound,
          retrievalCount,
          retrievedFiles,
          retrievedContext,
          usage,
        },
      };
    } catch (error) {
      emit({
        type: "stage:error",
        stage: "generate",
        detail:
          error?.message ??
          "Model request failed",
        data: {
          provider:
            route?.provider ?? null,
          model:
            route?.model ?? null,
          attempt: currentAttempt,
          maxAttempts,
        },
      });

      attempt += 1;

      emit({
        type: "stage:start",
        stage: "fallback",
        detail:
          "Checking fallback route",
      });

      const fallback =
        getFallbackRoute({
          error,
          route,
          providers,
          models: config.models,
          options: {
            maxAttempts,
          },
        });

      if (
        !fallback ||
        attempt >= maxAttempts
      ) {
        emit({
          type: "stage:error",
          stage: "fallback",
          detail: fallback
            ? "Maximum attempts reached"
            : "No fallback available",
          data: {
            attempts: attempt,
            maxAttempts,
          },
        });

        emit({
          type: "stage:error",
          stage: "complete",
          detail:
            error?.message ??
            "Execution failed",
          data: {
            attempts: attempt,
            retrievalCount,
            retrievedFiles,
          },
        });

        throw error;
      }

      route = fallback;

      emit({
        type: "stage:success",
        stage: "fallback",
        detail:
          [
            route?.provider,
            route?.modelRole,
            route?.model,
          ]
            .filter(Boolean)
            .join(" · ") ||
          "Fallback selected",
        data: {
          provider:
            route?.provider ?? null,

          modelRole:
            route?.modelRole ?? null,

          model:
            route?.model ?? null,

          nextAttempt:
            attempt + 1,

          maxAttempts,
        },
      });
    }
  }
}