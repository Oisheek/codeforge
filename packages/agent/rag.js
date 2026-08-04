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
function shrinkExcerpt(
  content,
  maxLength
) {
  if (
    typeof content !== "string" ||
    content.length <= maxLength
  ) {
    return content;
  }

  if (maxLength <= 0) {
    return "";
  }

  /*
   * Preserve evidence from both ends of an
   * already relevance-centered retrieval excerpt.
   *
   * Taking only content.slice(0, maxLength)
   * can discard relevant symbols located later
   * in the retrieved excerpt.
   */
  const separator = "\n...\n";

  if (
    maxLength <=
    separator.length + 2
  ) {
    return content.slice(
      0,
      maxLength
    );
  }

  const available =
    maxLength -
    separator.length;

  const headLength =
    Math.ceil(
      available / 2
    );

  const tailLength =
    Math.floor(
      available / 2
    );

  return (
    content.slice(
      0,
      headLength
    ) +
    separator +
    content.slice(
      content.length -
        tailLength
    )
  );
}
function selectResultsWithinBudget(
  results,
  tokenBudget
) {
  const budget =
    createContextBudget(
      tokenBudget
    );

  if (
    !Array.isArray(results) ||
    results.length === 0
  ) {
    return {
      results: [],

      stats: {
        selected: 0,
        estimatedTokens: 0,
        tokenBudget,

        remainingTokens:
          Math.max(
            0,
            tokenBudget
          ),

        utilization: 0,
      },
    };
  }

  /*
   * Breadth-first RAG packing.
   *
   * Start with the smallest useful excerpt
   * from every retrieved result. This gives
   * architectural/cross-file queries the best
   * chance of preserving every relevant file.
   *
   * Once breadth has been established, expand
   * higher-ranked results with the remaining
   * context budget.
   */
  const MIN_EXCERPT_LENGTH = 300;

  const selected = [];

  /*
   * First pass:
   *
   * Establish breadth using a minimal excerpt
   * for every result.
   *
   * Importantly, each candidate is measured
   * using the real formatted representation,
   * so file metadata and formatting overhead
   * are included in the budget calculation.
   */
  for (const result of results) {
    const candidate = {
      ...result,

      content:
        shrinkExcerpt(
          result?.content,
          MIN_EXCERPT_LENGTH
        ),
    };

    const candidateResults = [
      ...selected,
      candidate,
    ];

    const candidateText =
      formatRetrievalResults(
        candidateResults
      );

    const candidateTokens =
  budget.estimate(
    candidateText
  );
if (
  candidateTokens <=
  tokenBudget
) {
  selected.push(
    candidate
  );
}
  }

  /*
   * Second pass:
   *
   * Expand selected results in ranking order.
   *
   * Try progressively larger excerpts instead
   * of jumping directly from 300 characters to
   * the full source. This allows unused context
   * budget to be packed much more efficiently.
   */
  const expansionSizes = [
    500,
    800,
    1200,
    1600,
    2000,
    2500,
  ];

  for (
    let index = 0;
    index < selected.length;
    index += 1
  ) {
    const originalResult =
      results.find(
        (result) =>
          result.path ===
          selected[index].path
      );

    if (
      !originalResult ||
      typeof originalResult.content !==
        "string"
    ) {
      continue;
    }

    for (
      const maxLength of
      expansionSizes
    ) {
      if (
        maxLength <=
        (
          selected[index].content
            ?.length ?? 0
        )
      ) {
        continue;
      }

      const expanded = {
        ...originalResult,

        content:
          shrinkExcerpt(
            originalResult.content,
            maxLength
          ),
      };

      const expandedResults = [
        ...selected,
      ];

      expandedResults[index] =
        expanded;

      const expandedText =
        formatRetrievalResults(
          expandedResults
        );

      if (
        budget.estimate(
          expandedText
        ) <= tokenBudget
      ) {
        selected[index] =
          expanded;

        continue;
      }

      /*
       * Expansion sizes are ascending.
       * If this size does not fit, larger
       * excerpts will not fit either.
       */
      break;
    }

    /*
     * Finally try the complete retrieved
     * excerpt. This matters when the original
     * source length lies between configured
     * expansion sizes or exceeds 2500 due to
     * excerpt markers.
     */
    if (
      originalResult.content.length >
      (
        selected[index].content
          ?.length ?? 0
      )
    ) {
      const fullyExpandedResults = [
        ...selected,
      ];

      fullyExpandedResults[index] = {
        ...originalResult,
      };

      const fullyExpandedText =
        formatRetrievalResults(
          fullyExpandedResults
        );

      if (
        budget.estimate(
          fullyExpandedText
        ) <= tokenBudget
      ) {
        selected[index] = {
          ...originalResult,
        };
      }
    }
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