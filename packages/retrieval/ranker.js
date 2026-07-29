import { graph } from "./graph.js";

/**
 * Rank retrieval candidates.
 */
export function rankResults(query, results) {
    const terms = tokenize(query);

    return results
        .map((result) => ({
            ...result,
            score: scoreResult(result, terms),
        }))
        .sort((a, b) => b.score - a.score);
}

/**
 * Score a single retrieval result.
 */
export function scoreResult(result, terms) {
    let score = 0;

    const path = (result.path ?? "").toLowerCase();
    const content = (result.content ?? "").toLowerCase();

    // File path matches
    for (const term of terms) {
        if (path.includes(term)) {
            score += 10;
        }
    }

    // Content matches
    for (const term of terms) {
        const matches = content.match(
            new RegExp(escapeRegex(term), "g")
        );

        if (matches) {
            score += matches.length * 2;
        }
    }

    // Symbol matches
    for (const term of terms) {
        score += graph.findSymbol(term).length * 20;
    }

    // Export bonus
    if ((result.exports?.length ?? 0) > 0) {
        score += 5;
    }

    // Import bonus
    if ((result.imports?.length ?? 0) > 0) {
        score += 2;
    }

    return score;
}

/**
 * Normalize a search query.
 */
function tokenize(query) {
    return query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
}

/**
 * Escape RegExp characters.
 */
function escapeRegex(text) {
    return text.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}