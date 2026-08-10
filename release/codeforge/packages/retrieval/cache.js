/**
 * packages/retrieval/cache.js
 *
 * Simple in-memory cache for retrieval artifacts.
 */

export class RetrievalCache {
    constructor() {
        this.clear();
    }

    clear() {
        this.cache = new Map();
    }

    /**
     * Check if a key exists.
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * Retrieve a cached value.
     */
    get(key) {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        return entry.value;
    }

    /**
     * Store a value.
     */
    set(key, value) {
        this.cache.set(key, {
            value,
            createdAt: Date.now(),
        });

        return value;
    }

    /**
     * Remove one cache entry.
     */
    delete(key) {
        return this.cache.delete(key);
    }

    /**
     * Number of cached entries.
     */
    size() {
        return this.cache.size;
    }

    /**
     * List all cache keys.
     */
    keys() {
        return [...this.cache.keys()];
    }

    /**
     * Cache statistics.
     */
    stats() {
        return {
            entries: this.cache.size,
        };
    }
}

/**
 * Factory.
 */
export function createRetrievalCache() {
    return new RetrievalCache();
}