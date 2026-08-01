import {
  evaluateApprovalPolicy,
} from "./approvalPolicy.js";

const TOOL_SOURCES = new Set([
  "builtin",
  "plugin",
  "mcp",
]);

const SIDE_EFFECTS = new Set([
  "none",
  "write",
  "execute",
  "destructive",
]);

const APPROVAL_MODES = new Set([
  "never",
  "policy",
  "always",
]);


const APPROVAL_DECISIONS = new Set([
  "approved",
  "denied",
]);
function assertNonEmptyString(value, name) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new TypeError(
      `${name} must be a non-empty string.`
    );
  }
}

function normalizeCapabilities(capabilities) {
  if (capabilities == null) {
    return [];
  }

  if (!Array.isArray(capabilities)) {
    throw new TypeError(
      "Tool capabilities must be an array."
    );
  }

  return [
    ...new Set(
      capabilities.map((capability) => {
        assertNonEmptyString(
          capability,
          "Tool capability"
        );

        return capability.trim();
      })
    ),
  ];
}

function normalizeInputSchema(schema) {
  if (schema == null) {
    return {
      type: "object",
      properties: {},
      additionalProperties: false,
    };
  }

  if (
    typeof schema !== "object" ||
    Array.isArray(schema)
  ) {
    throw new TypeError(
      "Tool input schema must be an object."
    );
  }

  return schema;
}

export function defineTool({
  name,
  description,
  version = "1.0.0",
  source = "builtin",
  inputSchema,
  capabilities = [],
  sideEffect = "none",
  approval = "policy",
  execute,
}) {
  assertNonEmptyString(name, "Tool name");
  assertNonEmptyString(
    description,
    "Tool description"
  );
  assertNonEmptyString(
    version,
    "Tool version"
  );

  if (!TOOL_SOURCES.has(source)) {
    throw new TypeError(
      `Invalid tool source: ${source}`
    );
  }

  if (!SIDE_EFFECTS.has(sideEffect)) {
    throw new TypeError(
      `Invalid tool side effect: ${sideEffect}`
    );
  }

  if (!APPROVAL_MODES.has(approval)) {
    throw new TypeError(
      `Invalid tool approval mode: ${approval}`
    );
  }

  if (typeof execute !== "function") {
    throw new TypeError(
      "Tool execute must be a function."
    );
  }

  return Object.freeze({
    name: name.trim(),
    description: description.trim(),
    version: version.trim(),

    source,

    inputSchema:
      normalizeInputSchema(inputSchema),

    capabilities:
      Object.freeze(
        normalizeCapabilities(capabilities)
      ),

    sideEffect,
    approval,

    execute,
  });
}

export function createToolResult({
  tool,
  success,
  output = null,
  error = null,
  metadata = {},
  startedAt = null,
  completedAt = null,
}) {
  assertNonEmptyString(tool, "Tool result tool");

  if (typeof success !== "boolean") {
    throw new TypeError(
      "Tool result success must be a boolean."
    );
  }

  if (
    metadata == null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    throw new TypeError(
      "Tool result metadata must be an object."
    );
  }

  const durationMs =
    Number.isFinite(startedAt) &&
    Number.isFinite(completedAt)
      ? Math.max(
          0,
          completedAt - startedAt
        )
      : null;

  return {
    success,
    tool: tool.trim(),

    output:
      success
        ? output
        : null,

    error:
      success
        ? null
        : normalizeToolError(error),

    metadata,

    timing: {
      startedAt,
      completedAt,
      durationMs,
    },
  };
}
function normalizeAllowedCapabilities(
  capabilities
) {
  if (capabilities == null) {
    return null;
  }

  if (!Array.isArray(capabilities)) {
    throw new TypeError(
      "Allowed capabilities must be an array."
    );
  }

  return new Set(
    normalizeCapabilities(capabilities)
  );
}

function hasRequiredCapabilities(
  tool,
  allowedCapabilities
) {
  if (allowedCapabilities === null) {
    return true;
  }

  return tool.capabilities.every(
    (capability) =>
      allowedCapabilities.has(capability)
  );
}
export function authorizeToolExecution(
  tool,
  {
    allowedCapabilities = null,
    approval = null,
    policy = {},
  } = {}
) {
  if (!isTool(tool)) {
    throw new TypeError(
      "Invalid tool."
    );
  }

  const capabilities =
    normalizeAllowedCapabilities(
      allowedCapabilities
    );

  if (
    !hasRequiredCapabilities(
      tool,
      capabilities
    )
  ) {
    return {
      allowed: false,
      code: "capability_denied",
      reason:
        "Tool requires capabilities that are not allowed.",
      requiresApproval: false,
    };
  }

  if (
    approval != null &&
    !APPROVAL_DECISIONS.has(approval)
  ) {
    throw new TypeError(
      `Invalid approval decision: ${approval}`
    );
  }

  if (tool.approval === "never") {
    return {
      allowed: true,
      code: "allowed",
      reason: null,
      requiresApproval: false,
    };
  }

  if (approval === "denied") {
    return {
      allowed: false,
      code: "approval_denied",
      reason:
        "Tool execution was denied.",
      requiresApproval: true,
    };
  }

  if (approval === "approved") {
    return {
      allowed: true,
      code: "allowed",
      reason: null,
      requiresApproval: true,
    };
  }

  if (tool.approval === "always") {
    return {
      allowed: false,
      code: "approval_required",
      reason:
        "Tool always requires explicit approval.",
      requiresApproval: true,
    };
  }

  const policyDecision =
    evaluateApprovalPolicy(
      tool,
      policy
    );

  if (
    policyDecision.decision === "allow"
  ) {
    return {
      allowed: true,
      code: "allowed",
      reason: policyDecision.reason,
      requiresApproval: false,
    };
  }

  if (
    policyDecision.decision === "deny"
  ) {
    return {
      allowed: false,
      code: "policy_denied",
      reason: policyDecision.reason,
      requiresApproval: false,
    };
  }

  return {
    allowed: false,
    code: "approval_required",
    reason: policyDecision.reason,
    requiresApproval: true,
  };
}

export async function executeTool(
  tool,
  input,
  context = {}
) {
  if (!isTool(tool)) {
    throw new TypeError(
      "Invalid tool."
    );
  }

  if (
    context == null ||
    typeof context !== "object" ||
    Array.isArray(context)
  ) {
    throw new TypeError(
      "Tool execution context must be an object."
    );
  }

  const startedAt = Date.now();

  try {
    const output =
      await tool.execute(
        input,
        context
      );

    const completedAt = Date.now();

    return createToolResult({
      tool: tool.name,
      success: true,
      output,
      metadata: {
        source: tool.source,
        sideEffect: tool.sideEffect,
        approval: tool.approval,
      },
      startedAt,
      completedAt,
    });
  } catch (error) {
    const completedAt = Date.now();

    return createToolResult({
      tool: tool.name,
      success: false,
      error,
      metadata: {
        source: tool.source,
        sideEffect: tool.sideEffect,
        approval: tool.approval,
      },
      startedAt,
      completedAt,
    });
  }
}
export async function executeAuthorizedTool(
  tool,
  input,
  context = {},
  authorization = {}
) {
  const decision =
    authorizeToolExecution(
      tool,
      authorization
    );

  if (!decision.allowed) {
    const now = Date.now();

    return createToolResult({
      tool: tool.name,
      success: false,

      error: {
        code: decision.code,
        message: decision.reason,
        details: {
          requiresApproval:
            decision.requiresApproval,
        },
      },

      metadata: {
        source: tool.source,
        sideEffect: tool.sideEffect,
        approval: tool.approval,
        authorization: decision,
      },

      startedAt: now,
      completedAt: now,
    });
  }

  const result = await executeTool(
    tool,
    input,
    context
  );

  return {
    ...result,

    metadata: {
      ...result.metadata,
      authorization: decision,
    },
  };
}
export function normalizeToolError(error) {
  if (!error) {
    return {
      code: "tool_error",
      message: "Tool execution failed.",
    };
  }

  if (typeof error === "string") {
    return {
      code: "tool_error",
      message: error,
    };
  }

  return {
    code:
      error.code ??
      "tool_error",

    message:
      error.message ??
      "Tool execution failed.",

    details:
      error.details ??
      null,
  };
}

export function isTool(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.execute === "function" &&
    TOOL_SOURCES.has(value.source) &&
    SIDE_EFFECTS.has(value.sideEffect) &&
    APPROVAL_MODES.has(value.approval)
  );
}

export const ToolSource = Object.freeze({
  BUILTIN: "builtin",
  PLUGIN: "plugin",
  MCP: "mcp",
});

export const ToolSideEffect = Object.freeze({
  NONE: "none",
  WRITE: "write",
  EXECUTE: "execute",
  DESTRUCTIVE: "destructive",
});

export const ToolApproval = Object.freeze({
  NEVER: "never",
  POLICY: "policy",
  ALWAYS: "always",
});