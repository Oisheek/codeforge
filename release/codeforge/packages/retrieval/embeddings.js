/**
 * packages/retrieval/embeddings.js
 *
 * Embedding provider abstraction and vector store.
 */

/**
 * Base embedding provider.
 */
export class EmbeddingProvider {
    async embed(_text) {
        throw new Error("embed() not implemented");
    }

    async embedBatch(texts) {
        return Promise.all(
            texts.map(text => this.embed(text))
        );
    }
}

/**
 * Normalize a vector.
 */
export function normalizeVector(vector) {
    const magnitude = Math.sqrt(
        vector.reduce((sum, value) => sum + value * value, 0)
    );

    if (magnitude === 0) {
        return [...vector];
    }

    return vector.map(value => value / magnitude);
}

/**
 * In-memory embedding store.
 */
export class EmbeddingStore {
    constructor() {
        this.clear();
    }

    clear() {
        this.vectors = new Map();
    }

    set(key, embedding, metadata = {}) {
        this.vectors.set(key, {
            embedding: normalizeVector(embedding),
            metadata,
            createdAt: Date.now(),
        });
    }

    setMany(entries) {
        for (const entry of entries) {
            this.set(
                entry.key,
                entry.embedding,
                entry.metadata
            );
        }
    }

    get(key) {
        return this.vectors.get(key) ?? null;
    }

    has(key) {
        return this.vectors.has(key);
    }

    delete(key) {
        return this.vectors.delete(key);
    }

    entries() {
        return [...this.vectors.entries()];
    }

    size() {
        return this.vectors.size;
    }

    stats() {
        return {
            vectors: this.vectors.size,
        };
    }
}

/**
 * Cosine similarity.
 */
export function cosineSimilarity(a, b) {
    if (
        !Array.isArray(a) ||
        !Array.isArray(b) ||
        a.length !== b.length ||
        a.length === 0
    ) {
        return 0;
    }

    let dot = 0;

    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }

    if (magA === 0 || magB === 0) {
        return 0;
    }

    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Search embeddings.
 */
export function searchEmbeddings(queryVector, store) {
    const query = normalizeVector(queryVector);

    return store
        .entries()
        .map(([key, value]) => ({
            key,
            score: cosineSimilarity(
                query,
                value.embedding
            ),
            metadata: value.metadata,
        }))
        .sort((a, b) => b.score - a.score);
}

/**
 * Default singleton store.
 */
export const embeddingStore = new EmbeddingStore();