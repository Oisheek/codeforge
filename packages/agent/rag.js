import {
  createContextBudget,
} from "../retrieval/budget.js";

import {
  formatRetrievalResults,
} from "./contextBuilder.js";

const DEFAULT_RETRIEVAL_OPTIONS =
  Object.freeze({
    limit: 6,
    maxSourceLength: 2500,

    // Aggregate estimated token budget for
    // repository evidence sent to the model.
    tokenBudget: 6000,
  });

function selectResultsWithinBudget(
  results,
  tokenBudget
) {
  const budget =
    createContextBudget(
      tokenBudget
    );

  const selected = [];

  for (const result of results) {
    const candidateResults = [
      ...selected,
      result,
    ];

    const text =
      formatRetrievalResults(
        candidateResults
      );

    if (
      budget.estimate(text) >
      tokenBudget
    ) {
      continue;
    }

    selected.push(result);
  }

  const finalText =
    formatRetrievalResults(
      selected
    );

  const estimatedTokens =
    budget.estimate(
      finalText
    );

  return {
    results: selected,

    stats: {
      selected:
        selected.length,

      estimatedTokens,

      tokenBudget,

      remainingTokens:
        Math.max(
          0,
          tokenBudget -
            estimatedTokens
        ),

      utilization:
        tokenBudget === 0
          ? 0
          : estimatedTokens /
            tokenBudget,
    },
  };
}
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

  const {
  tokenBudget,
  ...searchOptions
} = retrievalOptions;

const results =
  (await repository.retriever.search(
    query,
    searchOptions
  )) ?? [];

  const normalizedResults =
    Array.isArray(results)
      ? results
      : [results].filter(Boolean);

 const selection =
  selectResultsWithinBudget(
    normalizedResults,
    tokenBudget
  );

  return {
    enabled: true,
    query,
    results:
      selection.results,

    stats: {
      retrieved:
        normalizedResults.length,

      ...selection.stats,

      limit:
        retrievalOptions.limit,

      maxSourceLength:
        retrievalOptions.maxSourceLength,
    },
  };
}