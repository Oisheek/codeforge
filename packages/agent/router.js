const CODING_INTENTS = new Set([
  "code",
  "debug",
  "review",
  "refactor",
  "test",
]);

function resolveModelRole(plan) {
  if (!plan) {
    return "general";
  }

  if (plan.requiresThinking) {
    return "planner";
  }

  if (plan.intent === "chat") {
    return "fast";
  }

  if (CODING_INTENTS.has(plan.intent)) {
    return "coding";
  }

  return "general";
}

function resolveModel(
  role,
  models = {}
) {
  return (
    models[role] ??
    models.fallback ??
    models.emergency ??
    null
  );
}

export function routeRequest({
  plan,
  config = {},
  providers = [],
}) {
  const modelRole =
    resolveModelRole(plan);

  const defaults = {
    provider:
      config.provider ??
      "openrouter",

    modelRole,

    model: resolveModel(
      modelRole,
      config.models
    ),

    stream:
      config.stream ??
      false,

    temperature:
      config.temperature ??
      0.2,

    maxTokens:
      config.maxTokens ??
      4096,

    thinking: Boolean(
      plan?.requiresThinking
    ),
  };

  const route = {
    ...defaults,
  };

  // Validate provider
  if (
    providers.length > 0 &&
    !providers.some(
      (provider) =>
        provider.name ===
        route.provider
    )
  ) {
    route.provider =
      providers[0].name;
  }

  return route;
}