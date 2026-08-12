import { Intent } from "./intent.js";

const DEFAULT_PLAN = Object.freeze({
  requiresRAG: false,
  requiresThinking: false,
  requiresTools: false,
  requiresWrite: false,
  requiresGit: false,
  directFileTarget: false,
  fileTargets: [],
  steps: [],
});

const FILE_PATH_PATTERN =
  /(?:^|[\s"'`(])((?:\.{0,2}[\\/])?(?:[\w@.-]+[\\/])*[\w@.-]+\.[a-z0-9]+)(?=$|[\s"'`),:;])/gi;

const CROSS_FILE_PATTERNS = [
  /\b(repository|repo|codebase|project[- ]wide|repository[- ]wide)\b/i,

  /\b(across|throughout)\s+(?:the\s+)?(?:project|repository|repo|codebase)\b/i,

  /\b(dependencies|dependents|dependency|imports|importers|references|usages|callers|callees)\b/i,

  /\b(interaction|interactions|integration|relationship|relationships|compatible|compatibility)\b/i,

  /\b(find|search|locate|discover)\b/i,
];

const PROJECT_REFERENCE_PATTERNS = [
  /*
   * Explicit repository scope.
   */
  /\b(repository|repo|codebase|project[- ]wide|repository[- ]wide)\b/i,

  /*
   * Direct references to the current project.
   *
   * Examples:
   *   "our system"
   *   "this project"
   *   "current codebase"
   */
  /\b(?:our|this|current)\s+(?:system|project|codebase|repository|repo|implementation|architecture)\b/i,

  /*
   * References to CodeForge subsystems/components.
   *
   * Examples:
   *   "our routing system"
   *   "our fallback"
   *   "this executor"
   */
  /\b(?:our|this|current)\s+(?:routing(?:\s+system)?|router|fallback|provider|executor|retrieval|rag|planner|agent|terminal|cli|tooling|tools?)\b/i,

  /*
   * Repository implementation terminology.
   */
  /\b(?:implementation|implemented|source code)\b/i,

  /*
   * Source-code relationships.
   */
  /\b(?:imports|importers|exports|dependencies|dependents|references|usages|callers|callees)\b/i,
];

function referencesProjectImplementation(
  prompt = ""
) {
  if (typeof prompt !== "string") {
    return false;
  }

  return PROJECT_REFERENCE_PATTERNS.some(
    (pattern) =>
      pattern.test(prompt)
  );
}



function getExplicitFileTargets(
  prompt = ""
) {
  if (typeof prompt !== "string") {
    return [];
  }

  const targets = [];

  for (
    const match
    of prompt.matchAll(
      FILE_PATH_PATTERN
    )
  ) {
    const target =
      match[1];

    if (
      target &&
      !targets.includes(target)
    ) {
      targets.push(target);
    }
  }

  return targets;
}

function requiresCrossFileContext(
  prompt = ""
) {
  if (typeof prompt !== "string") {
    return false;
  }

  return CROSS_FILE_PATTERNS.some(
    (pattern) =>
      pattern.test(prompt)
  );
}

function applyRetrievalPolicy(
  plan,
  prompt
) {
  const fileTargets =
    getExplicitFileTargets(
      prompt
    );

  const crossFileContext =
    requiresCrossFileContext(
      prompt
    );
    
const projectReference =
  referencesProjectImplementation(
    prompt
  );

  const directFileTarget =
    fileTargets.length === 1 &&
    !crossFileContext;

  /*
   * A direct file request is better served by
   * repository tools than broad RAG retrieval.
   */
  if (directFileTarget) {
    return {
      ...plan,

      requiresRAG: false,
      requiresTools: true,

      directFileTarget: true,
      fileTargets,

      steps:
        plan.steps
          .filter(
            (step) =>
              step !== "retrieve"
          )
          .includes("tool")
            ? plan.steps.filter(
                (step) =>
                  step !== "retrieve"
              )
            : [
                "tool",
                ...plan.steps.filter(
                  (step) =>
                    step !== "retrieve"
                ),
              ],
    };
  }

  /*
   * EXPLAIN is repository-independent by
   * default.
   *
   * Only enable RAG when the actual prompt
   * refers to the current repository/codebase.
   */
  if (
  plan.intent ===
    Intent.EXPLAIN &&
  projectReference
) {
    return {
      ...plan,

      requiresRAG: true,

      directFileTarget: false,
      fileTargets,

      steps: [
        "retrieve",
        ...plan.steps.filter(
          (step) =>
            step !== "retrieve"
        ),
      ],
    };
  }

  return {
    ...plan,
    directFileTarget: false,
    fileTargets,
  };
}

function createPlan(intent) {
  switch (intent) {
    case Intent.CHAT:
      return {
        ...DEFAULT_PLAN,
        intent,
        steps: [
          "context",
          "route",
          "generate",
        ],
      };

    case Intent.EXPLAIN:
  return {
    ...DEFAULT_PLAN,
    intent,
    steps: [
      "context",
      "route",
      "generate",
    ],
  };

    case Intent.PLAN:
      return {
        ...DEFAULT_PLAN,
        intent,
        requiresThinking: true,
        steps: [
          "context",
          "think",
          "route",
          "generate",
        ],
      };

    case Intent.SEARCH:
      return {
        ...DEFAULT_PLAN,
        intent,
        requiresRAG: true,
        requiresTools: true,
        steps: [
          "retrieve",
          "tool",
          "context",
          "route",
          "generate",
        ],
      };

   case Intent.DEBUG:
  return {
    ...DEFAULT_PLAN,
    intent,
    requiresRAG: true,
    requiresThinking: true,
    requiresTools: true,
    requiresWrite: true,
    steps: [
      "retrieve",
      "context",
      "think",
      "route",
      "generate",
      "write",
      "verify",
    ],
  };

    case Intent.REVIEW:
      return {
        ...DEFAULT_PLAN,
        intent,
        requiresRAG: true,
        requiresThinking: true,
        steps: [
          "retrieve",
          "context",
          "think",
          "route",
          "generate",
        ],
      };

    case Intent.REFACTOR:
      return {
        ...DEFAULT_PLAN,
        intent,
        requiresRAG: true,
        requiresThinking: true,
        requiresWrite: true,
        steps: [
          "retrieve",
          "context",
          "think",
          "route",
          "generate",
          "write",
        ],
      };

    case Intent.TEST:
      return {
        ...DEFAULT_PLAN,
        intent,
        requiresRAG: true,
        requiresWrite: true,
        steps: [
          "retrieve",
          "context",
          "route",
          "generate",
          "write",
        ],
      };

    case Intent.CODE:
      return {
        ...DEFAULT_PLAN,
        intent,
        requiresRAG: true,
        requiresThinking: true,
        requiresWrite: true,
        steps: [
          "retrieve",
          "context",
          "think",
          "route",
          "generate",
          "write",
        ],
      };

    default:
      return {
        ...DEFAULT_PLAN,
        intent: Intent.CHAT,
        steps: [
          "context",
          "route",
          "generate",
        ],
      };
  }
}

export function createExecutionPlan(
  intent,
  {
    prompt = "",
  } = {}
) {
  const plan =
    createPlan(intent);

  return applyRetrievalPolicy(
    plan,
    prompt
  );
}