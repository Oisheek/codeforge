/**
 * Estimate the size of a text in tokens.
 * Approximation: 1 token ≈ 4 characters.
 */
export function estimateTokens(text = "") {
    return Math.ceil(text.length / 4);
}

/**
 * Compute the token cost of a retrieval result.
 */
export function estimateResultTokens(result) {
    return estimateTokens(result.content ?? "");
}

/**
 * Select results that fit within a token budget.
 */
export function allocateBudget(
    results,
    maxTokens = 12000
) {
    const selected = [];
    let usedTokens = 0;

    for (const result of results) {
        const cost = estimateResultTokens(result);

        if (usedTokens + cost > maxTokens) {
            continue;
        }

        selected.push({
            ...result,
            estimatedTokens: cost,
        });

        usedTokens += cost;
    }

    return {
        results: selected,
        usedTokens,
        remainingTokens: Math.max(
            0,
            maxTokens - usedTokens
        ),
        budget: maxTokens,
    };
}

/**
 * Truncate oversized content to fit a token limit.
 */
export function truncateToBudget(
    text,
    maxTokens
) {
    const maxChars = maxTokens * 4;

    if (text.length <= maxChars) {
        return text;
    }

    return (
        text.slice(0, maxChars) +
        "\n\n/* ... truncated ... */"
    );
}