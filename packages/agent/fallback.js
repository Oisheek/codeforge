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

function isRetryable(error, options) {
  if (!error) {
    return false;
  }

  return options.retryableErrors.includes(error.code);
}

export function getFallbackRoute({
  error,
  route,
  providers = [],
  options = {},
}) {
  const config = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (!isRetryable(error, config)) {
    return null;
  }

  const currentIndex = providers.findIndex(
    (provider) => provider.name === route.provider
  );

  if (currentIndex === -1) {
    return null;
  }

  const nextProvider = providers[currentIndex + 1];

  if (!nextProvider) {
    return null;
  }

  return {
    ...route,
    provider: nextProvider.name,
    model: nextProvider.defaultModel,
    attempt: (route.attempt ?? 1) + 1,
  };
}