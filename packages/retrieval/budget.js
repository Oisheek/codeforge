/**
 * packages/retrieval/budget.js
 *
 * Context budget manager.
 */

export class ContextBudget {
    constructor(limit = 16000) {
        this.limit = limit;
    }

    /**
     * Estimate token count.
     *
     * Default heuristic:
     * 1 token ≈ 4 characters.
     */
    estimate(text = "") {
        return Math.ceil(text.length / 4);
    }

    /**
     * Select as many items as fit within the budget.
     */
    select(items) {
        let used = 0;

        const selected = [];

        for (const item of items) {
            const text =
                item.text ??
                item.metadata?.text ??
                "";

            const cost = this.estimate(text);

            if (used + cost > this.limit) {
                break;
            }

            used += cost;
            selected.push(item);
        }

        return {
            items: selected,
            used,
            remaining: this.limit - used,
            limit: this.limit,
            utilization:
                this.limit === 0
                    ? 0
                    : used / this.limit,
        };
    }

    /**
     * Check whether a single item fits.
     */
    fits(item) {
        const text =
            item.text ??
            item.metadata?.text ??
            "";

        return this.estimate(text) <= this.limit;
    }

    /**
     * Remaining budget after using some tokens.
     */
    remaining(used) {
        return Math.max(0, this.limit - used);
    }

    /**
     * Budget statistics.
     */
    stats() {
        return {
            limit: this.limit,
        };
    }
}

/**
 * Factory.
 */
export function createContextBudget(limit) {
    return new ContextBudget(limit);
}