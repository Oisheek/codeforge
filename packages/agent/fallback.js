const DEFAULT_OPTIONS = Object.freeze({
  maxAttempts: 3,

  retryableErrors: [
    "rate_limit",
    "timeout",
    "overloaded",
    "network",
    "provider_error",
  ],
});

function isRetryable(
  error,
  options
) {
  if (!error) {
    return false;
  }

  return options.retryableErrors.includes(
    error.code
  );
}

function findNextModel(
  route,
  models = {}
) {
  const candidates = [
    {
      role: "fallback",
      model: models.fallback,
    },
    {
      role: "emergency",
      model: models.emergency,
    },
  ];

  return (
    candidates.find(
      (candidate) =>
        typeof candidate.model ===
          "string" &&
        candidate.model.length > 0 &&
        candidate.model !== route.model
    ) ?? null
  );
}

export function getFallbackRoute({
  error,
  route,
  providers = [],
  models = {},
  options = {},
}) {
  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (!isRetryable(error, config)) {
    return null;
  }

  const attempt =
    route.attempt ?? 1;

  if (attempt >= config.maxAttempts) {
    return null;
  }

  const nextModel =
    findNextModel(
      route,
      models
    );

  if (nextModel) {
    return {
      ...route,

      modelRole:
        nextModel.role,

      model:
        nextModel.model,

      attempt:
        attempt + 1,
    };
  }

  const currentIndex =
    providers.findIndex(
      (provider) =>
        provider.name ===
        route.provider
    );

  if (currentIndex === -1) {
    return null;
  }

  const nextProvider =
    providers[currentIndex + 1];

  if (!nextProvider) {
    return null;
  }

  return {
    ...route,

    provider:
      nextProvider.name,

    modelRole: "fallback",

    model:
      nextProvider.defaultModel ??
      null,

    attempt:
      attempt + 1,
  };
}