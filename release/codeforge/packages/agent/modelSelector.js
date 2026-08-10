const MODEL_ROLES = Object.freeze([
  "fast",
  "general",
  "coding",
  "planner",
  "heavyCoding",
  "subagent",
]);

const COMPLEXITIES = Object.freeze([
  "low",
  "medium",
  "high",
]);

const DEFAULT_SELECTION = Object.freeze({
  role: "general",
  confidence: 0,
  complexity: "medium",
  reasoningRequired: false,
  toolRequired: false,
});

function clampConfidence(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(1, number)
  );
}

function normalizeRole(
  role,
  availableRoles
) {
  if (
    typeof role !== "string"
  ) {
    return null;
  }

  const normalized =
    role.trim().toLowerCase();

  const canonicalRole =
    MODEL_ROLES.find(
      (candidate) =>
        candidate.toLowerCase() ===
        normalized
    );

  if (!canonicalRole) {
    return null;
  }

  if (
    Array.isArray(availableRoles) &&
    availableRoles.length > 0
  ) {
    const availableRole =
      availableRoles.find(
        (candidate) =>
          typeof candidate === "string" &&
          candidate.toLowerCase() ===
            normalized
      );

    if (!availableRole) {
      return null;
    }

    return availableRole;
  }

  return canonicalRole;
}

function normalizeComplexity(
  complexity
) {
  if (
    typeof complexity !== "string"
  ) {
    return "medium";
  }

  const normalized =
    complexity
      .trim()
      .toLowerCase();

  return COMPLEXITIES.includes(
    normalized
  )
    ? normalized
    : "medium";
}

function extractJson(text) {
  if (
    typeof text !== "string"
  ) {
    return null;
  }

  const trimmed = text.trim();

  /*
   * Normal JSON response.
   */
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue with fenced / embedded JSON.
  }

  /*
   * ```json
   * {...}
   * ```
   */
  const fenced =
    trimmed.match(
      /```(?:json)?\s*([\s\S]*?)\s*```/i
    );

  if (fenced) {
    try {
      return JSON.parse(
        fenced[1]
      );
    } catch {
      // Continue.
    }
  }

  /*
   * Some models add a short sentence before
   * the JSON object. Extract the outer object.
   */
  const start =
    trimmed.indexOf("{");

  const end =
    trimmed.lastIndexOf("}");

  if (
    start >= 0 &&
    end > start
  ) {
    try {
      return JSON.parse(
        trimmed.slice(
          start,
          end + 1
        )
      );
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeSelection(
  value,
  {
    availableRoles = [],
    fallback = DEFAULT_SELECTION,
  } = {}
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return {
      ...fallback,
    };
  }

  const role =
    normalizeRole(
      value.role,
      availableRoles
    );

  if (!role) {
    return {
      ...fallback,
    };
  }

  return {
  role,

  confidence:
    clampConfidence(
      value.confidence
    ),

  complexity:
    normalizeComplexity(
      value.complexity
    ),

  reasoningRequired:
    Boolean(
      value.reasoningRequired
    ),

  toolRequired:
    Boolean(
      value.toolRequired
    ),
};
}

function buildDeterministicFallback(
  {
    plan = {},
    intent = "",
    availableRoles = [],
  } = {}
) {
  let role = "general";

  if (
    plan.requiresThinking
  ) {
    role = "planner";
  } else if (
    [
      "code",
      "debug",
      "review",
      "refactor",
      "test",
    ].includes(intent)
  ) {
    role = "coding";
  } else if (
    intent === "chat"
  ) {
    role = "fast";
  }

  if (
    Array.isArray(
      availableRoles
    ) &&
    availableRoles.length > 0 &&
    !availableRoles.includes(role)
  ) {
    role =
      availableRoles.includes(
        "general"
      )
        ? "general"
        : availableRoles[0];
  }

return {
  role,

  confidence: 0,

  complexity:
    plan.requiresThinking
      ? "high"
      : "medium",

  reasoningRequired:
    Boolean(
      plan.requiresThinking
    ),

  toolRequired:
    Boolean(
      plan.requiresTools
    ),
};
}

function buildSelectorPrompt({
  prompt,
  intent,
  plan,
  ragDecision,
  availableRoles,
}) {
  return [
    "You are CodeForge's model selection agent.",
    "Your only task is to select the best model role for the user's task.",
    "",
    "Do not solve the user's task.",
    "Do not provide an explanation.",
    "Return ONLY valid JSON.",
    "",
    "Allowed roles:",
    ...availableRoles.map(
      (role) => `- ${role}`
    ),
    "",
    "Return exactly this shape:",
JSON.stringify(
  {
    role: "general",
    confidence: 0.0,
    complexity: "medium",
    reasoningRequired: false,
    toolRequired: false,
  },
  null,
  2
),
    "",
    `User request: ${prompt}`,
    `Detected intent: ${intent}`,
    `RAG required: ${Boolean(
  ragDecision?.required
)}`,
`RAG scope: ${ragDecision?.scope ?? "none"}`,
    `Requires thinking: ${Boolean(
      plan?.requiresThinking
    )}`,
    `Requires tools: ${Boolean(
      plan?.requiresTools
    )}`,
    `Requires write: ${Boolean(
      plan?.requiresWrite
    )}`,
  ].join("\n");
}

/**
 * Create the v1 model-selection agent.
 *
 * The selector model makes a small structured decision.
 * It does not execute tools and does not receive repository
 * contents.
 */
export function createModelSelector({
  provider,
  model,
  maxTokens = 256,
} = {}) {
async function select({
  prompt = "",
  intent = "chat",
  plan = {},
  ragDecision = null,
  availableRoles = MODEL_ROLES,
} = {}) {
    const fallback =
      buildDeterministicFallback({
        plan,
        intent,
        availableRoles,
      });

    /*
     * Selector is optional. If no selector model has been
     * configured, preserve deterministic v1 routing behavior.
     */
    if (
      !provider ||
      !model
    ) {
      return {
        ...fallback,
        source: "fallback",
      };
    }

    const selectorPrompt =
      buildSelectorPrompt({
        prompt,
        intent,
        plan,
        ragDecision,
        availableRoles,
      });

    try {
      const response =
        await provider.generate({
          model,
          temperature: 0,
          maxTokens,
          messages: [
            {
              role: "system",
              content:
                "You are a routing classifier. Output JSON only.",
            },
            {
              role: "user",
              content:
                selectorPrompt,
            },
          ],
        });

      const content =
        response?.message?.content;

      const parsed =
        extractJson(content);

      const selection =
        normalizeSelection(
          parsed,
          {
            availableRoles,
            fallback,
          }
        );

      /*
       * A confidence of zero combined with an invalid
       * selector response means we should preserve the
       * deterministic routing decision.
       */
      if (
        !parsed ||
        !normalizeRole(
          parsed.role,
          availableRoles
        )
      ) {
        return {
          ...fallback,
          source: "fallback",
        };
      }

      return {
        ...selection,
        source: "model",
      };
    } catch {
      /*
       * Model selection must never make CodeForge unusable.
       * If the selector fails, existing deterministic
       * routing remains authoritative.
       */
      return {
        ...fallback,
        source: "fallback",
      };
    }
  }

  return {
    select,
  };
}

export {
  MODEL_ROLES,
  COMPLEXITIES,
  normalizeSelection,
};