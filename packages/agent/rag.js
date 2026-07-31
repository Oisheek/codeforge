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
    throw new Error("Repository retriever has not been initialized.");
  }

  const results =
    (await repository.retriever.search(query, options)) ?? [];

  return {
    enabled: true,
    query,
    results: Array.isArray(results) ? results : [results].filter(Boolean),
    stats: {
      retrieved: Array.isArray(results)
        ? results.length
        : results
          ? 1
          : 0,
    },
  };
}