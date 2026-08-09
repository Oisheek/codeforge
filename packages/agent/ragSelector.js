const RAG_SCOPES = Object.freeze([
  "none",
  "file",
  "symbol",
  "repository",
]);

const DEFAULT_DECISION = Object.freeze({
  required: false,
  scope: "none",
  confidence: 0,
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

function normalizeScope(scope) {
  if (
    typeof scope !== "string"
  ) {
    return null;
  }

  const normalized =
    scope.trim().toLowerCase();

  if (
    !RAG_SCOPES.includes(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
}

function extractJson(text) {
  if (
    typeof text !== "string"
  ) {
    return null;
  }

  const trimmed =
    text.trim();

  /*
   * Normal JSON response.
   */
  try {
    return JSON.parse(
      trimmed
    );
  } catch {
    // Continue.
  }

  /*
   * Fenced JSON.
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
   * Embedded JSON object.
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

function normalizeDecision(
  value,
  fallback = DEFAULT_DECISION
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return {
      ...fallback,
    };
  }

  const scope =
    normalizeScope(
      value.scope
    );

  if (!scope) {
    return {
      ...fallback,
    };
  }

  const required =
    Boolean(
      value.required
    );

  /*
   * "none" and "required: true" are contradictory.
   * Normalize this rather than allowing an invalid
   * execution decision through the pipeline.
   */
  if (
    required &&
    scope === "none"
  ) {
    return {
      ...fallback,
    };
  }

  /*
   * If the model says RAG is not required,
   * scope must be none.
   */
  if (
    !required &&
    scope !== "none"
  ) {
    return {
      ...fallback,
    };
  }

  return {
    required,

    scope,

    confidence:
      clampConfidence(
        value.confidence
      ),
  };
}

function hasExplicitRepositorySignal(
  prompt = ""
) {
  if (
    typeof prompt !== "string"
  ) {
    return false;
  }

  const normalized =
    prompt.toLowerCase();

  return (
    /\b(repository|repo|codebase)\b/.test(
      normalized
    ) ||
    /\b(our|this|current)\s+(system|project|codebase|repository|implementation|architecture)\b/.test(
      normalized
    ) ||
    /\b(our|this)\s+(routing|router|fallback|provider|executor|retrieval|rag|planner|agent|terminal|cli|tool|tools?)\b/.test(
      normalized
    )
  );
}

function isGeneralCodeRequest({
  prompt = "",
  plan = {},
} = {}) {
  if (
    plan?.directFileTarget
  ) {
    return false;
  }

  if (
    plan?.intent !== "code"
  ) {
    return false;
  }

  return !hasExplicitRepositorySignal(
    prompt
  );
}

function buildDeterministicFallback({
  prompt = "",
  plan = {},
} = {}) {
  /*
   * These rules are deliberately conservative.
   *
   * They are NOT the primary decision mechanism.
   * They only protect execution if the selector
   * model is unavailable or returns invalid output.
   */

  if (
    plan?.directFileTarget
  ) {
    return {
      required: true,
      scope: "file",
      confidence: 0,
    };
  }

  if (
    typeof prompt !== "string"
  ) {
    return {
      ...DEFAULT_DECISION,
    };
  }

  const normalized =
    prompt.toLowerCase();

  /*
   * Explicit repository references.
   */
  if (
    /\b(repository|repo|codebase)\b/.test(
      normalized
    )
  ) {
    return {
      required: true,
      scope: "repository",
      confidence: 0,
    };
  }

  /*
   * Explicit current-project references.
   */
  if (
    /\b(our|this|current)\s+(system|project|codebase|repository|implementation|architecture)\b/.test(
      normalized
    )
  ) {
    return {
      required: true,
      scope: "repository",
      confidence: 0,
    };
  }

  /*
   * Explicit implementation questions about
   * the current project.
   */
  if (
    /\b(our|this)\s+(routing|router|fallback|provider|executor|retrieval|rag|planner|agent|terminal|cli|tool|tools?)\b/.test(
      normalized
    )
  ) {
    return {
      required: true,
      scope: "repository",
      confidence: 0,
    };
  }

    /*
   * General programming requests do not require
   * repository context unless an explicit project
   * reference was already matched above.
   */
  if (
    plan?.intent === "code" &&
    !plan?.directFileTarget
  ) {
    return {
      ...DEFAULT_DECISION,
    };
  }

  /*
   * A plan that explicitly requires repository
   * information remains a safe fallback signal.
   */
  if (
    plan?.requiresRAG
  ) {
    return {
      required: true,
      scope: "repository",
      confidence: 0,
    };
  }

  return {
    ...DEFAULT_DECISION,
  };
}

function buildSelectorPrompt({
  prompt,
  plan,
}) {
  return [
    "You are CodeForge's repository-context selector.",
    "",
    "Your ONLY task is to decide whether the user's request",
    "requires information from the current repository.",
    "",
    "Do NOT answer the user's question.",
    "Do NOT explain your decision.",
    "Return ONLY valid JSON.",
    "",
    "Use one of these scopes:",
    "- none: repository information is not needed",
    "- file: a specific repository file is needed",
    "- symbol: a specific repository symbol is needed",
    "- repository: multiple repository files or architectural context are needed",
    "",
    "Return exactly this shape:",
    JSON.stringify(
      {
        required: false,
        scope: "none",
        confidence: 0.0,
      },
      null,
      2
    ),
    "",
    "Decision rules:",
"",
"NONE — general programming/CS knowledge that does not depend on this codebase.",
"Examples: \"explain recursion\", \"write a JavaScript function\", \"what is dependency injection?\", \"how does HTTP work?\", \"explain binary search\".",
"",
"REPOSITORY — requires understanding how this project's components are built or interact. Answering accurately depends on the actual implementation, not general knowledge.",
"Examples: \"how does our routing system work?\", \"how does model selection interact with routing and execution?\", \"how does our fallback system work?\", \"explain our executor\", \"why does CodeForge use this provider?\", \"how is retrieval implemented in this project?\".",
"",
"FILE — the user names one or more specific files or paths, and the question stays scoped to that file's contents rather than how it fits into the broader system.",
"Examples: \"open packages/agent/router.js\", \"explain packages/agent/executor.js\", \"what functions are defined in packages/agent/router.js?\".",
"",
"SYMBOL — the user asks about a specific function, class, or variable rather than a whole file or the system as a whole.",
"",
"Critical rule:",
"- If the user asks how multiple components of the current system interact, choose repository scope.",
"- If the user asks about \"our\", \"this system\", or a named CodeForge component in an implementation context, choose repository scope.",
"- If answering accurately requires inspecting the current project's implementation, choose repository scope.",
"- Never choose \"none\" merely because the question is phrased generally. Determine whether \"our\" or the surrounding context makes it repository-specific.",
"- If the user names a specific file AND asks how it interacts with other parts of the system (not just what's inside that file), choose repository scope, not file scope. File scope is only for questions that stay contained within the named file(s).",
"- If ambiguous between \"none\" and \"repository\", prefer repository scope — a missed repository lookup produces a generic answer to a project-specific question, which is worse than an unnecessary lookup.",
"- If ambiguous between \"file\" and \"repository\", prefer repository scope, since it has access to full project context and can still resolve file-specific questions accurately.",
    "",
    `User request: ${prompt}`,
    `Planner signal (fallback only): ${Boolean(
  plan?.requiresRAG
)}`,
`Direct file target: ${Boolean(
  plan?.directFileTarget
)}`,
  ].join("\n");
}

/**
 * Create CodeForge's dedicated RAG-selection model.
 *
 * This model decides whether repository context is needed.
 * It does not perform retrieval.
 */
export function createRagSelector({
  provider,
  model,
  maxTokens = 128,
} = {}) {
async function select({
  prompt = "",
  plan = {},
} = {}) {
  const fallback =
    buildDeterministicFallback({
      prompt,
      plan,
    });



  /*
   * No configured selector model:
   * preserve safe deterministic behavior.
   */

    /*
     * No configured selector model:
     * preserve safe deterministic behavior.
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
        plan,
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
                "You are a repository-context classifier. Output JSON only.",
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

      const decision =
        normalizeDecision(
          parsed,
          fallback
        );

      /*
       * Invalid model output must never
       * disable safe fallback behavior.
       */
      if (
        !parsed ||
        !normalizeScope(
          parsed.scope
        )
      ) {
        return {
          ...fallback,
          source: "fallback",
        };
      }

      /*
       * Reject contradictory decisions.
       */
      if (
        Boolean(
          parsed.required
        ) &&
        normalizeScope(
          parsed.scope
        ) === "none"
      ) {
        return {
          ...fallback,
          source: "fallback",
        };
      }

      if (
        !Boolean(
          parsed.required
        ) &&
        normalizeScope(
          parsed.scope
        ) !== "none"
      ) {
        return {
          ...fallback,
          source: "fallback",
        };
      }

      if (
  isGeneralCodeRequest({
    prompt,
    plan,
  })
) {
  return {
    required: false,
    scope: "none",
    confidence: decision.confidence,
    source: "model",
  };
}

return {
  ...decision,
  source: "model",
};
    } catch {
      /*
       * RAG selection is advisory.
       * Selector failure must never crash execution.
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
  RAG_SCOPES,
  normalizeDecision,
};