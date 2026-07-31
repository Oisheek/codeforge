export const Intent = Object.freeze({
  CHAT: "chat",
  EXPLAIN: "explain",
  PLAN: "plan",
  CODE: "code",
  DEBUG: "debug",
  REVIEW: "review",
  REFACTOR: "refactor",
  TEST: "test",
  SEARCH: "search",
});

const PATTERNS = [
  {
    intent: Intent.REVIEW,
    regex:
      /\b(review|audit|inspect|evaluate|analyze|analyse|check|assess)\b/i,
  },
  {
    intent: Intent.DEBUG,
    regex:
      /\b(debug|fix|bug|error|exception|crash|issue|failure|trace|stack)\b/i,
  },
  {
    intent: Intent.REFACTOR,
    regex:
      /\b(refactor|cleanup|clean up|optimize|optimise|rewrite|rename|restructure|improve)\b/i,
  },
  {
    intent: Intent.TEST,
    regex:
      /\b(test|testing|unit test|integration test|e2e|end[- ]to[- ]end|spec)\b/i,
  },
  {
    intent: Intent.PLAN,
    regex:
      /\b(plan|design|architecture|architect|roadmap|strategy|approach)\b/i,
  },
  {
    intent: Intent.SEARCH,
    regex:
      /\b(search|find|locate|lookup|look up|grep|where is|show me)\b/i,
  },
  {
    intent: Intent.EXPLAIN,
    regex:
      /\b(explain|describe|what is|why|how does|understand|clarify)\b/i,
  },
  {
    intent: Intent.CODE,
    regex:
      /\b(create|build|implement|generate|write|add|develop|make)\b/i,
  },
];

function normalize(text) {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function detectIntent(input = "") {
  const text = normalize(input);

  for (const { intent, regex } of PATTERNS) {
    if (regex.test(text)) {
      return intent;
    }
  }

  return Intent.CHAT;
}