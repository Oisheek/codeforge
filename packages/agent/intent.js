export const Intent = {
  CHAT: "chat",
  EXPLAIN: "explain",
  PLAN: "plan",
  CODE: "code",
  DEBUG: "debug",
  REVIEW: "review",
  REFACTOR: "refactor",
  TEST: "test",
  SEARCH: "search",
};

export function detectIntent(input) {
  const text = input.trim().toLowerCase();

  if (/review|audit|inspect/.test(text))
    return Intent.REVIEW;

  if (/fix|bug|error|debug/.test(text))
    return Intent.DEBUG;

  if (/refactor|cleanup|improve/.test(text))
    return Intent.REFACTOR;

  if (/test|unit test|integration/.test(text))
    return Intent.TEST;

  if (/plan|design|architecture/.test(text))
    return Intent.PLAN;

  if (/search|find|locate/.test(text))
    return Intent.SEARCH;

  if (/explain|what is|why/.test(text))
    return Intent.EXPLAIN;

  if (/create|build|add|implement|write/.test(text))
    return Intent.CODE;

  return Intent.CHAT;
}