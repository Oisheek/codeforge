import { OpenRouter } from "@openrouter/sdk";

export function createOpenRouterTools(
  tools = []
) {
  if (!Array.isArray(tools)) {
    throw new TypeError(
      "OpenRouter tools must be an array."
    );
  }

  return tools.map((tool) => {
    if (
      !tool ||
      typeof tool !== "object" ||
      typeof tool.name !== "string" ||
      typeof tool.description !== "string"
    ) {
      throw new TypeError(
        "Invalid OpenRouter tool definition."
      );
    }

    return {
      type: "function",

      function: {
        name: tool.name,
        description: tool.description,

        parameters:
          tool.inputSchema ?? {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
      },
    };
  });
}

/**
 * Convert CodeForge's canonical message format
 * into the format expected by @openrouter/sdk.
 *
 * CodeForge internally uses:
 *
 * {
 *   role: "tool",
 *   tool_call_id: "call_123"
 * }
 *
 * OpenRouter SDK expects:
 *
 * {
 *   role: "tool",
 *   toolCallId: "call_123"
 * }
 */
function normalizeMessages(
  messages = []
) {
  return messages.map((message) => {
    if (
      message?.role !== "tool"
    ) {
      return message;
    }

    const toolCallId =
      message.toolCallId ??
      message.tool_call_id;

    const {
      tool_call_id,
      ...rest
    } = message;

    return {
      ...rest,
      toolCallId,
    };
  });
}

export function createOpenRouter(
  config
) {
  if (!config.apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured."
    );
  }

  const client = new OpenRouter({
    apiKey: config.apiKey,
  });

  function buildRequest({
    messages,
    model,
    temperature =
      config.temperature,
    maxTokens =
      config.maxTokens,
    thinking,
    tools,
    stream = false,
    ...options
  }) {
    if (
      typeof model !== "string" ||
      model.trim().length === 0
    ) {
      throw new Error(
        "OpenRouter model is required."
      );
    }

    const request = {
      model,

      messages:
        normalizeMessages(
          messages
        ),

      temperature,

      max_tokens:
        maxTokens,

      stream,

      ...options,
    };

    if (
      Array.isArray(tools) &&
      tools.length > 0
    ) {
      request.tools = tools;
      request.tool_choice =
        "auto";
    }

    // Future-proof reasoning support.
    if (thinking?.enabled) {
      request.reasoning = {
        effort:
          thinking.budget ??
          "medium",
      };
    }

    return request;
  }

  function normalizeResponse(
    response
  ) {
    const rawMessage =
      response.choices?.[0]
        ?.message ??
      null;

    const toolCalls =
      rawMessage?.toolCalls ??
      rawMessage?.tool_calls ??
      [];

    const normalizedToolCalls =
      Array.isArray(toolCalls)
        ? toolCalls
        : [];

    const message =
      rawMessage
        ? {
            ...rawMessage,

            // CodeForge canonical format.
            tool_calls:
              normalizedToolCalls,
          }
        : null;

    return {
      id:
        response.id,

      model:
        response.model,

      usage:
        response.usage,

      finishReason:
        response.choices?.[0]
          ?.finishReason ??
        response.choices?.[0]
          ?.finish_reason,

      message,

      toolCalls:
        normalizedToolCalls,

      raw:
        response,
    };
  }

  function normalizeError(
    error
  ) {
    const message =
      error?.message ??
      error?.error?.message ??
      error?.body?.error
        ?.message ??
      error?.response?.data
        ?.error?.message ??
      "OpenRouter request failed.";

    const code =
      error?.code ??
      error?.error?.code ??
      error?.body?.error
        ?.code ??
      "provider_error";

    const status =
      error?.status ??
      error?.statusCode ??
      error?.response
        ?.status;

    return {
      code,
      status,
      message,
      cause:
        error,
    };
  }

  async function generate({
    messages,
    model,
    temperature,
    maxTokens,
    thinking,
    tools,
    ...options
  }) {
    try {
      const request =
        buildRequest({
          messages,
          model,
          temperature,
          maxTokens,
          thinking,
          tools,
          stream: false,
          ...options,
        });

      const response =
        await client.chat.send({
          chatRequest:
            request,
        });

      return normalizeResponse(
        response
      );
    } catch (error) {
      throw normalizeError(
        error
      );
    }
  }

  // Backward compatibility.
  async function chat(
    options
  ) {
    const response =
      await generate(
        options
      );

    return response.message;
  }

  async function stream({
    messages,
    model,
    temperature,
    maxTokens,
    thinking,
    tools,
    ...options
  }) {
    try {
      const request =
        buildRequest({
          messages,
          model,
          temperature,
          maxTokens,
          thinking,

          // Keep tool support available
          // for streaming requests too.
          tools,

          stream: true,
          ...options,
        });

      return await client.chat.send({
        chatRequest:
          request,
      });
    } catch (error) {
      throw normalizeError(
        error
      );
    }
  }

  return {
    generate,
    chat,
    stream,
  };
}