export function routeRequest({
  plan,
  config = {},
  providers = [],
}) {
  const defaults = {
  provider: config.provider ?? "openrouter",
  model: config.model,
  stream: config.stream ?? false,
  temperature: config.temperature ?? 0.2,
  maxTokens: config.maxTokens ?? 4096,
  thinking: false,
};

  if (!plan) {
    return defaults;
  }

  const route = {
    ...defaults,
    thinking: Boolean(plan.requiresThinking),
  };

  // Reasoning model
  if (route.thinking && config.reasoningModel) {
    route.model = config.reasoningModel;
  }

  // Fast model
  if (
    plan.intent === "chat" &&
    config.fastModel
  ) {
    route.model = config.fastModel;
  }

  // Coding model
  if (
    ["code", "debug", "review", "refactor", "test"].includes(plan.intent) &&
    config.codeModel
  ) {
    route.model = config.codeModel;
  }

  // Validate provider
  if (
    providers.length > 0 &&
    !providers.some((p) => p.name === route.provider)
  ) {
    route.provider = providers[0].name;
  }

  return route;
}