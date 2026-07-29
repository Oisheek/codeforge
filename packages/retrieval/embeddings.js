/**
 * Embedding provider interface.
 */
export class EmbeddingProvider {
    async embed(_text) {
        throw new Error("embed() not implemented");
    }

    async embedBatch(texts) {
        return Promise.all(
            texts.map((text) => this.embed(text))
        );
    }
}

/**
 * In-memory embedding store.
 */
export class EmbeddingStore {
    constructor() {
        this.vectors = new Map();
    }

    set(key, embedding) {
        this.vectors.set(key, embedding);
    }

    get(key) {
        return this.vectors.get(key) ?? null;
    }

    has(key) {
        return this.vectors.has(key);
    }

    clear() {
        this.vectors.clear();
    }

    entries() {
        return [...this.vectors.entries()];
    }
}

/**
 * Cosine similarity between two vectors.
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
 * Rank stored embeddings by similarity.
 */
export function searchEmbeddings(queryVector, store) {
    return store
        .entries()
        .map(([key, vector]) => ({
            key,
            score: cosineSimilarity(queryVector, vector),
        }))
        .sort((a, b) => b.score - a.score);
}

export const embeddingStore = new EmbeddingStore();