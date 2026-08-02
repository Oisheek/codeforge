function createToolCallError(
  code,
  message,
  details = null
) {
  const error = new Error(message);

  error.code = code;
  error.details = details;

  return error;
}

function parseArguments(value) {
  if (value == null || value === "") {
    return {};
  }

  if (
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value;
  }

  if (typeof value !== "string") {
    throw createToolCallError(
      "invalid_tool_arguments",
      "Tool call arguments must be a JSON object or JSON string."
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw createToolCallError(
      "invalid_tool_arguments",
      "Tool call arguments contain invalid JSON."
    );
  }

  if (
    parsed == null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw createToolCallError(
      "invalid_tool_arguments",
      "Tool call arguments must resolve to an object."
    );
  }

  return parsed;
}

export function normalizeToolCall(
  toolCall
) {
  if (
    !toolCall ||
    typeof toolCall !== "object"
  ) {
    throw createToolCallError(
      "invalid_tool_call",
      "Tool call must be an object."
    );
  }

  const id =
    toolCall.id ?? null;

  const type =
    toolCall.type ?? "function";

  const fn =
    toolCall.function;

  if (
    !fn ||
    typeof fn !== "object"
  ) {
    throw createToolCallError(
      "invalid_tool_call",
      "Tool call does not contain a function definition."
    );
  }

  if (
    typeof fn.name !== "string" ||
    fn.name.trim().length === 0
  ) {
    throw createToolCallError(
      "invalid_tool_name",
      "Tool call does not contain a valid tool name."
    );
  }

  return {
    id,
    type,
    name: fn.name.trim(),
    arguments:
      parseArguments(
        fn.arguments
      ),
  };
}

export function normalizeToolCalls(
  toolCalls = []
) {
  if (toolCalls == null) {
    return [];
  }

  if (!Array.isArray(toolCalls)) {
    throw createToolCallError(
      "invalid_tool_calls",
      "Tool calls must be an array."
    );
  }

  return toolCalls.map(
    normalizeToolCall
  );
}

export function resolveToolCalls(
  toolCalls,
  registry
) {
  const normalized =
    normalizeToolCalls(toolCalls);

  if (normalized.length === 0) {
    return [];
  }

  if (
    !registry ||
    typeof registry.get !== "function"
  ) {
    throw createToolCallError(
      "tool_registry_required",
      "A tool registry is required to resolve tool calls."
    );
  }

  return normalized.map(
    (toolCall) => {
      const tool =
        registry.get(
          toolCall.name
        );

      if (!tool) {
        throw createToolCallError(
          "tool_not_found",
          `Tool is not registered: ${toolCall.name}`,
          {
            tool:
              toolCall.name,
          }
        );
      }

      return {
        ...toolCall,
        tool,
      };
    }
  );
  
}

export function createToolCallFailure({
  toolCall,
  error,
}) {
  const id =
  typeof toolCall?.id === "string" &&
  toolCall.id.trim().length > 0
    ? toolCall.id
    : `invalid_tool_call_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;

  const name =
    typeof toolCall?.function?.name === "string"
      ? toolCall.function.name.trim()
      : null;

  return {
    id,
    name,
    arguments: null,

    result: {
      success: false,
      tool: name,

      output: null,

      error: {
        code:
          error?.code ??
          "invalid_tool_call",

        message:
          error?.message ??
          "Invalid tool call.",

        details:
          error?.details ?? null,
      },

      metadata: {
        source: "model",
        sideEffect: "none",
        approval: "never",

        authorization: {
          allowed: false,
          code:
            error?.code ??
            "invalid_tool_call",
          reason:
            error?.message ??
            "Invalid tool call.",
          requiresApproval: false,
        },
      },

      timing: {
        startedAt: Date.now(),
        completedAt: Date.now(),
        durationMs: 0,
      },
    },
  };
}