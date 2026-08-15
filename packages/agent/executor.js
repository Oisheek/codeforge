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
  createToolCallFailure,
  resolveToolCalls,
} from "./toolCalls.js";

import {
  createModelSelector,
} from "./modelSelector.js";

import {
  createRagSelector,
} from "./ragSelector.js";


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
function getRepositoryToolPolicy(
  rag
) {
  if (
    !rag?.enabled ||
    !Array.isArray(rag.results)
  ) {
    return {
      suppressSearch: false,
      suppressRead: false,
      evidenceLevel: "none",
    };
  }

  const implementationResults =
    rag.results.filter(
      (result) =>
        result?.reason ===
        "implementation" &&
        typeof result?.content ===
        "string" &&
        result.content.trim().length >
        0
    );

  const substantialResults =
    implementationResults.filter(
      (result) =>
        result.content.trim().length >=
        500
    );

  const totalImplementationChars =
    implementationResults.reduce(
      (total, result) =>
        total +
        result.content.trim().length,
      0
    );

  const utilization =
    rag?.stats?.utilization ?? 0;

  const strongEvidence =
    implementationResults.length >= 2;

  const comprehensiveEvidence =
    substantialResults.length >= 3 ||
    (
      implementationResults.length >= 3 &&
      totalImplementationChars >= 2500 &&
      utilization >= 0.5
    );

  return {
    suppressSearch:
      strongEvidence,

    suppressRead:
      comprehensiveEvidence,

    evidenceLevel:
      comprehensiveEvidence
        ? "comprehensive"
        : strongEvidence
          ? "strong"
          : "weak",
  };
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

function estimateTextTokens(text = "") {
  if (typeof text !== "string") {
    return 0;
  }

  return Math.ceil(text.length / 4);
}

function measureModelContext({
  messages = [],
  tools = [],
}) {
  let systemChars = 0;
  let userChars = 0;
  let assistantChars = 0;
  let toolResultChars = 0;

  for (const message of messages) {
    const content =
      typeof message?.content === "string"
        ? message.content
        : "";

    switch (message?.role) {
      case "system":
        systemChars += content.length;
        break;

      case "user":
        userChars += content.length;
        break;

      case "assistant":
        assistantChars += content.length;
        break;

      case "tool":
        toolResultChars += content.length;
        break;

      default:
        break;
    }
  }

  const toolSchemaChars =
    JSON.stringify(
      tools ?? []
    ).length;

  const messageChars =
    systemChars +
    userChars +
    assistantChars +
    toolResultChars;

  const totalChars =
    messageChars +
    toolSchemaChars;

  return {
    messages:
      messages.length,

    chars: {
      system:
        systemChars,

      user:
        userChars,

      assistant:
        assistantChars,

      toolResults:
        toolResultChars,

      toolSchemas:
        toolSchemaChars,

      total:
        totalChars,
    },

    estimatedTokens: {
      system:
        Math.ceil(
          systemChars / 4
        ),

      user:
        Math.ceil(
          userChars / 4
        ),

      assistant:
        Math.ceil(
          assistantChars / 4
        ),

      toolResults:
        Math.ceil(
          toolResultChars / 4
        ),

      toolSchemas:
        Math.ceil(
          toolSchemaChars / 4
        ),

      total:
        Math.ceil(
          totalChars / 4
        ),
    },
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

function stableSerialize(value) {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value
      .map(stableSerialize)
      .join(",")}]`;
  }

  const keys =
    Object.keys(value).sort();

  return `{${keys
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableSerialize(
          value[key]
        )}`
    )
    .join(",")}}`;
}

function createToolCallFingerprint(
  name,
  args
) {
  return `${name}:${stableSerialize(
    args ?? {}
  )}`;
}

function createDuplicateToolResult({
  call,
  previous,
}) {
  const now = Date.now();

  return {
    success: false,
    tool: call.name,

    output: null,

    error: {
      code: "duplicate_tool_call",

      message:
        `Duplicate tool call skipped: ${call.name}`,

      details: {
        tool: call.name,
        previousToolCallId:
          previous?.id ?? null,
      },
    },

    metadata: {
      source: "agent",
      sideEffect:
        call.tool?.sideEffect ??
        "none",

      approval:
        call.tool?.approval ??
        "never",

      authorization: {
        allowed: false,
        code: "duplicate_tool_call",
        reason:
          "An identical side-effect-free tool call already completed during this execution.",
        requiresApproval: false,
      },
    },

    timing: {
      startedAt: now,
      completedAt: now,
      durationMs: 0,
    },
  };
}

function createToolBudgetResult({
  call,
  budget,
}) {
  const now = Date.now();

  return {
    success: false,
    tool: call.name,

    output: null,

    error: {
      code: "tool_budget_exceeded",

      message:
        `Tool budget exhausted for ${call.name}. Use the repository context and tool results already collected.`,

      details: {
        tool: call.name,
        used: budget.used,
        max: budget.max,
      },
    },

    metadata: {
      source: "agent",

      sideEffect:
        call.tool?.sideEffect ??
        "none",

      approval:
        call.tool?.approval ??
        "never",

      authorization: {
        allowed: false,
        code: "tool_budget_exceeded",
        reason:
          "The per-execution exploration budget for this tool has been exhausted.",
        requiresApproval: false,
      },
    },

    timing: {
      startedAt: now,
      completedAt: now,
      durationMs: 0,
    },
  };
}

async function executeResolvedToolCalls({
  toolCalls,
  registry,
  projectRoot,
  approvedTools = new Set(),
  allowedCapabilities,
  requestApproval = null,
  toolCallHistory = null,
  toolBudget = null,
  emit,
}) {
  const resolvedCalls =
    resolveToolCalls(
      toolCalls,
      registry
    );

  const results = [];

  for (const call of resolvedCalls) {
    const fingerprint =
      createToolCallFingerprint(
        call.name,
        call.arguments
      );

    const canDeduplicate =
      call.tool?.sideEffect ===
      "none" &&
      toolCallHistory instanceof Map;

    const previous =
      canDeduplicate
        ? toolCallHistory.get(
          fingerprint
        )
        : null;

    if (previous) {
      const result =
        createDuplicateToolResult({
          call,
          previous,
        });

      results.push({
        id: call.id,
        name: call.name,
        arguments: call.arguments,
        result,
      });

      emit({
        type: "stage:error",
        stage: "tool",

        detail:
          `${call.name}: duplicate call skipped`,

        data: {
          tool: call.name,
          toolCallId: call.id,
          success: false,
          duplicate: true,

          previousToolCallId:
            previous.id,

          error: result.error,
        },
      });

      continue;
    }

    const budget =
      toolBudget &&
        typeof toolBudget === "object"
        ? toolBudget[call.name]
        : null;

    if (
      budget &&
      budget.used >= budget.max
    ) {
      const result =
        createToolBudgetResult({
          call,
          budget,
        });

      results.push({
        id: call.id,
        name: call.name,
        arguments: call.arguments,
        result,
      });

      emit({
        type: "stage:error",
        stage: "tool",

        detail:
          `${call.name}: tool budget exhausted`,

        data: {
          tool: call.name,
          toolCallId: call.id,
          success: false,
          budgetExceeded: true,
          used: budget.used,
          max: budget.max,
          error: result.error,
        },
      });

      continue;
    }

    if (budget) {
      budget.used += 1;
    }

    emit({
      type: "stage:start",
      stage: "tool",
      detail: `Running ${call.name}`,
      data: {
        tool: call.name,
        toolCallId: call.id,
      },
    });
const approvalKey =
  createToolCallFingerprint(
    call.name,
    call.arguments
  );

const previouslyApproved =
  approvedTools.has(approvalKey);
    let result =
  await executeAuthorizedTool(
    call.tool,
    call.arguments,
    {
      projectRoot,
    },
    {
      allowedCapabilities,
      approval:
        previouslyApproved
          ? "approved"
          : null,
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
approvedTools.add(approvalKey);
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
    if (
      canDeduplicate &&
      result.success
    ) {
      toolCallHistory.set(
        fingerprint,
        {
          id: call.id,
          name: call.name,
          arguments:
            call.arguments,
        }
      );
    }
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
  const approvedTools = new Set();
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

  const plan =
    createExecutionPlan(
      intent,
      {
        prompt,
      }
    );

  emit({
    type: "stage:success",
    stage: "plan",
    detail: Array.isArray(plan?.steps)
      ? plan.steps.join(" → ")
      : "Plan ready",
  });

  emit({
    type: "stage:start",
    stage: "rag_select",
    detail: "Deciding whether repository context is needed",
  });

  const selectorProvider =
    config.selectors?.provider
      ? providers.find(
        (item) =>
          item?.name ===
          config.selectors.provider
      )?.provider ?? null
      : provider;

  const ragSelector =
    createRagSelector({
      provider:
        selectorProvider ?? provider,

      model:
        config.selectors?.rag ?? null,

      maxTokens:
        config.selectors?.maxTokens ?? 128,
    });

  const ragDecision =
    await ragSelector.select({
      prompt,
      plan,
    });

  const modelSelector =
    createModelSelector({
      provider:
        selectorProvider ?? provider,

      model:
        config.selectors?.model ?? null,

      maxTokens:
        config.selectors?.modelMaxTokens ?? 256,
    });

  const modelDecision =
    await modelSelector.select({
      prompt,
      intent,
      plan,
      ragDecision,

      availableRoles:
        Object.keys(
          config.models ?? {}
        ).filter(
          (role) =>
            ![
              "fallback",
              "emergency",
            ].includes(role)
        ),
    });

  emit({
    type: "stage:success",
    stage: "model_select",
    detail:
      `${modelDecision.role} · ${Math.round(
        modelDecision.confidence * 100
      )}%`,
    data: modelDecision,
  });
  const effectivePlan = {
    ...plan,

    requiresRAG:
      ragDecision.required &&
      !plan.directFileTarget,

    ragScope:
      ragDecision.scope,

    requiresThinking:
      modelDecision.reasoningRequired ||
      plan.requiresThinking,

    requiresTools:
      modelDecision.toolRequired ||
      plan.requiresTools,

    modelRole:
      modelDecision.role,

    modelDecision,
    ragDecision,
  };

  if (effectivePlan?.requiresRAG) {
    emit({
      type: "stage:start",
      stage: "retrieve",
      detail: "Searching repository context",
    });
  }

  let rag = {
    enabled: false,
    results: [],
    stats: {
      retrieved: 0,
      selected: 0,
      estimatedTokens: 0,
      tokenBudget: 0,
      remainingTokens: 0,
      utilization: 0,
    },
  };

  if (effectivePlan.requiresRAG) {
    rag =
      await retrieveContext({
        repository,
        plan: effectivePlan,
        query: prompt,
      });
  }

  const retrievalCount =
    rag?.results?.length ??
    rag?.chunks?.length ??
    rag?.documents?.length ??
    0;

  const retrievedContext =
    getRetrievedContext(rag);

  const retrievedFiles =
    retrievedContext.map(
      (result) =>
        result.path
    );

  if (effectivePlan?.requiresRAG) {
    emit({
      type: "stage:success",
      stage: "retrieve",
      detail:
        `${retrievalCount} result${retrievalCount === 1
          ? ""
          : "s"
        }`,
      data: {
        count: retrievalCount,
        files: retrievedFiles,
        results: retrievedContext,
      },
    });
  }
  const repositoryToolPolicy =
    getRepositoryToolPolicy(
      rag
    );

  const shouldAnswerFromRAG =
    repositoryToolPolicy
      .evidenceLevel ===
    "comprehensive";

  const modelAvailableTools =
    shouldAnswerFromRAG
      ? []
      : availableTools.filter(
        (tool) => {
          if (
            repositoryToolPolicy
              .suppressSearch &&
            tool.name ===
            "search_files"
          ) {
            return false;
          }

          if (
            repositoryToolPolicy
              .suppressRead &&
            tool.name ===
            "read_file"
          ) {
            return false;
          }

          return true;
        }
      );

  const modelTools =
    createOpenRouterTools(
      modelAvailableTools
    );

  emit({
    type: "stage:start",
    stage: "context",
    detail: "Building model context",
  });

  const context = buildContext({
    prompt,
    plan: effectivePlan,
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

  emit({
    type: "stage:start",
    stage: "route",
    detail: "Selecting provider and model",
  });

  let route = routeRequest({
    plan: effectivePlan,
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

  emit({
    type: "stage:start",
    stage: "thinking",
    detail: "Configuring reasoning",
  });

  const thinking = configureThinking({
    plan: effectivePlan,
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

  const configuredMaxToolRounds =
    config.maxToolRounds ?? 10;

  const maxToolRounds =
    repositoryToolPolicy
      .evidenceLevel ===
      "comprehensive"
      ? Math.min(
        configuredMaxToolRounds,
        3
      )
      : configuredMaxToolRounds;
  const maxToolProtocolErrors = 2;

  const verification = {
    required:
      effectivePlan.requiresWrite === true,

    attempted: false,

    succeeded: false,

    writeSinceLastVerification: false,
  };

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
      let toolProtocolErrors = 0;

      const toolCallHistory =
        new Map();

      const toolBudget = {
        search_files: {
          used: 0,
          max: 2,
        },

        read_file: {
          used: 0,
          max: 6,
        },

        execute_command: {
          used: 0,
          max: 3,
        },
      };

      while (true) {
        const contextMetrics =
          measureModelContext({
            messages,
            tools: modelTools,
          });

        emit({
          type: "context:metrics",
          stage: "context",
          data: {
            toolRound,
            ...contextMetrics,
          },
        });
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
        if (
          response &&
          Array.isArray(response.toolCalls) &&
          response.toolCalls.length === 0
        ) {
          emit({
            type: "stage:info",
            stage: "generate",
            detail: "Final model response received",
            data: {
              hasMessage: Boolean(response.message),
              contentType:
                typeof response.message?.content,
              contentLength:
                typeof response.message?.content === "string"
                  ? response.message.content.length
                  : 0,
              finishReason:
                response.finishReason ?? null,
              model:
                response.model ?? null,
            },
          });
        }
        const responseToolCalls =
          Array.isArray(response?.toolCalls)
            ? response.toolCalls
            : [];

        // Model produced a normal final response.
        // Model produced a normal final response.
        if (responseToolCalls.length === 0) {
          if (
            verification.required &&
            verification.writeSinceLastVerification &&
            !verification.attempted
          ) {
            messages.push({
              role: "user",
              content: [
                "Verification is required before completing this coding task.",
                "A project change was made, but no verification command has been executed yet.",
                "Use execute_command to run an appropriate verification command.",
                "Choose the verification command from the actual project context and available project tooling.",
                "Do not invent imports, exports, APIs, commands, or interfaces solely for verification.",
                "Do not provide the final answer until verification has been attempted.",
              ].join("\n"),
            });

            emit({
              type: "stage:error",
              stage: "verification",
              detail:
                "Model attempted to finish before verification.",
              data: {
                required:
                  verification.required,
                attempted:
                  verification.attempted,
                succeeded:
                  verification.succeeded,
              },
            });

            continue;
          }

          if (
            verification.required &&
            verification.attempted &&
            !verification.succeeded
          ) {
            messages.push({
              role: "user",
              content: [
                "The verification command failed.",
                "Do not provide the final answer yet.",
                "Use the verification failure output already provided in the tool result to diagnose the requested change.",
                "Only modify the implementation if the failure is relevant to the requested change.",
                "After making a relevant correction, run execute_command again to verify the change.",
                "Do not invent imports, exports, APIs, commands, or interfaces solely to make verification pass.",
              ].join("\n"),
            });

            emit({
              type: "stage:error",
              stage: "verification",
              detail:
                "Verification failed; model must diagnose and repair before completing.",
              data: {
                required:
                  verification.required,
                attempted:
                  verification.attempted,
                succeeded:
                  verification.succeeded,
              },
            });

            continue;
          }

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

        let roundResults;

        try {
          roundResults =
            await executeResolvedToolCalls({
              toolCalls:
                responseToolCalls,

              registry:
                tools,

              projectRoot:
                project.root,

              approvedTools,

              allowedCapabilities: [
                "filesystem.read",
                "filesystem.search",
                "filesystem.write",
                "process.execute",
              ],

              requestApproval,

              toolCallHistory,
              toolBudget,

              emit,
            });
        } catch (error) {
          const recoverableToolErrors =
            new Set([
              "invalid_tool_arguments",
              "invalid_tool_call",
              "invalid_tool_name",
              "invalid_tool_calls",
              "tool_not_found",
            ]);

          const recoverable =
            recoverableToolErrors.has(
              error?.code
            );

          if (!recoverable) {
            throw error;
          }
          toolProtocolErrors += 1;

          if (
            toolProtocolErrors >
            maxToolProtocolErrors
          ) {
            const protocolError =
              new Error(
                `Maximum tool protocol errors exceeded (${maxToolProtocolErrors}).`
              );

            protocolError.code =
              "max_tool_protocol_errors_exceeded";

            protocolError.cause =
              error;

            throw protocolError;
          }

          /*
           * Do not execute malformed calls.
           * Return a protocol error to the model so it can
           * correct the arguments on the next round.
           */
          roundResults =
            responseToolCalls.map(
              (toolCall) =>
                createToolCallFailure({
                  toolCall,
                  error,
                })
            );

          emit({
            type: "stage:error",
            stage: "tool",
            detail:
              `${error.message} Retrying with model correction.`,
            data: {
              code:
                error.code,

              protocolError:
                toolProtocolErrors,

              maxToolProtocolErrors,
            },
          });
        }

        for (const toolResult of roundResults) {
          if (
            toolResult.result?.success &&
            (
              toolResult.name === "edit_file" ||
              toolResult.name === "write_file"
            )
          ) {
            verification.writeSinceLastVerification =
              true;
          }

          if (
            toolResult.name === "execute_command" &&
            verification.required &&
            verification.writeSinceLastVerification
          ) {
            verification.attempted = true;

            verification.succeeded =
              toolResult.result?.success === true;

            verification.writeSinceLastVerification =
              !verification.succeeded;
          }
        }

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
          verification: {
            required:
              verification.required,

            attempted:
              verification.attempted,

            succeeded:
              verification.succeeded,
          },
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