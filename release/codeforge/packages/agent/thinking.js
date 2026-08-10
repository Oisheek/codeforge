const DEFAULT_OPTIONS = Object.freeze({
  enabled: false,
  mode: "standard",
  budget: "medium",
});

export function configureThinking({
  plan,
  route,
}) {
  if (!plan?.requiresThinking) {
    return DEFAULT_OPTIONS;
  }

  let mode = "standard";
  let budget = "medium";

  switch (plan.intent) {
    case "plan":
      mode = "deep";
      budget = "high";
      break;

    case "debug":
      mode = "deep";
      budget = "high";
      break;

    case "review":
      mode = "deep";
      budget = "high";
      break;

    case "refactor":
      mode = "deep";
      budget = "high";
      break;

    case "code":
      mode = "balanced";
      budget = "medium";
      break;

    default:
      mode = "standard";
      budget = "medium";
  }

  return {
    enabled: Boolean(route?.thinking),
    mode,
    budget,
  };
}