const POLICY_DECISIONS = new Set([
  "allow",
  "deny",
  "approval_required",
]);

function createDecision({
  decision,
  code,
  reason = null,
}) {
  if (!POLICY_DECISIONS.has(decision)) {
    throw new TypeError(
      `Invalid policy decision: ${decision}`
    );
  }

  return Object.freeze({
    decision,
    code,
    reason,
  });
}

function allow(
  reason = null
) {
  return createDecision({
    decision: "allow",
    code: "policy_allowed",
    reason,
  });
}

function deny(reason) {
  return createDecision({
    decision: "deny",
    code: "policy_denied",
    reason,
  });
}

function requireApproval(reason) {
  return createDecision({
    decision: "approval_required",
    code: "policy_approval_required",
    reason,
  });
}

export function evaluateApprovalPolicy(
  tool,
  {
    trustedSources = ["builtin"],
  } = {}
) {
  if (
    !tool ||
    typeof tool !== "object"
  ) {
    throw new TypeError(
      "Tool is required for approval policy evaluation."
    );
  }

  if (!Array.isArray(trustedSources)) {
    throw new TypeError(
      "Trusted sources must be an array."
    );
  }

  /*
   * Explicit tool declarations take precedence.
   */

  if (tool.approval === "never") {
    return allow(
      "Tool does not require approval."
    );
  }

  if (tool.approval === "always") {
    return requireApproval(
      "Tool always requires explicit approval."
    );
  }

  /*
   * approval === "policy"
   *
   * Policy decisions are based on both the
   * tool source and its declared side effect.
   */

  const trusted =
    trustedSources.includes(tool.source);

  if (!trusted) {
    return requireApproval(
      `Tool source '${tool.source}' is not trusted.`
    );
  }

  if (tool.sideEffect === "none") {
    return allow(
      "Trusted read-only tool."
    );
  }

  if (tool.sideEffect === "write") {
    return requireApproval(
      "Tool can modify project state."
    );
  }

  if (tool.sideEffect === "execute") {
    return requireApproval(
      "Tool can execute commands."
    );
  }

  if (tool.sideEffect === "destructive") {
    return requireApproval(
      "Tool can perform destructive operations."
    );
  }

  return deny(
    `Unsupported tool side effect: ${tool.sideEffect}`
  );
}

export const PolicyDecision =
  Object.freeze({
    ALLOW: "allow",
    DENY: "deny",
    APPROVAL_REQUIRED:
      "approval_required",
  });
  