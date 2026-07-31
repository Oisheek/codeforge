/**
 * packages/retrieval/ranker.js
 */

export class Ranker {
    constructor(options = {}) {
        this.weights = {
            exact: 100,
            prefix: 50,
            substring: 25,
            kind: 10,
            ...options.weights,
        };
    }

    /**
     * Score search results.
     */
    score(results, query = "") {
        const q = query.toLowerCase();

        return results.map(result => {
            let score = result.score ?? 0;

            const name = result.symbol?.name ??
                         result.name ??
                         "";

            const lower = name.toLowerCase();

            if (lower === q) {
                score += this.weights.exact;
            }
            else if (lower.startsWith(q)) {
                score += this.weights.prefix;
            }
            else if (lower.includes(q)) {
                score += this.weights.substring;
            }

            if (result.symbol?.kind) {
                score += this.weights.kind;
            }

            return {
                ...result,
                score,
            };
        });
    }

    /**
     * Sort by descending score.
     */
    rank(results) {
        return [...results].sort(
            (a, b) => b.score - a.score
        );
    }

    /**
     * Convenience method.
     */
    rankQuery(results, query) {
        return this.rank(
            this.score(results, query)
        );
    }
}

export function createRanker(options) {
    return new Ranker(options);
}