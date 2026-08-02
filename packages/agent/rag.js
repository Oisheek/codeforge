const DEFAULT_RETRIEVAL_OPTIONS =
  Object.freeze({
    limit: 6,
    maxSourceLength: 2500,
  });

export async function retrieveContext({
  repository,
  plan,
  query,
  options = {},
}) {
  if (!plan?.requiresRAG) {
    return {
      enabled: false,
      query,
      results: [],
      stats: {
        retrieved: 0,
      },
    };
  }

  if (!repository?.retriever) {
    throw new Error(
      "Repository retriever has not been initialized."
    );
  }

  const retrievalOptions = {
    ...DEFAULT_RETRIEVAL_OPTIONS,
    ...options,
  };

  const results =
    (await repository.retriever.search(
      query,
      retrievalOptions
    )) ?? [];

  const normalizedResults =
    Array.isArray(results)
      ? results
      : [results].filter(Boolean);

  return {
    enabled: true,
    query,
    results: normalizedResults,

    stats: {
      retrieved:
        normalizedResults.length,

      limit:
        retrievalOptions.limit,

      maxSourceLength:
        retrievalOptions.maxSourceLength,
    },
  };
}