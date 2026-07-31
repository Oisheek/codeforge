import { Intent } from "./intent.js";

const DEFAULT_PLAN = Object.freeze({
  requiresRAG: false,
  requiresThinking: false,
  requiresTools: false,
  requiresWrite: false,
  requiresGit: false,
  steps: [],
});

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
        requiresRAG: true,
        steps: [
          "retrieve",
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
        steps: [
          "retrieve",
          "context",
          "think",
          "route",
          "generate",
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

export function createExecutionPlan(intent) {
  return createPlan(intent);
}