import { parseRepository } from "./parser/index.js";
import { graph } from "./graph.js";
import { rankResults } from "./ranker.js";
import { allocateBudget } from "./budget.js";
import {
    embeddingStore,
    searchEmbeddings,
} from "./embedding.js";

/**
 * Build the repository graph.
 */
export async function indexRepository(
    repositoryIndex,
    cache = null
) {
    graph.clear();

    const parsedFiles = await parseRepository(
        repositoryIndex,
        cache
    );

    for (const file of parsedFiles) {
        graph.addFile(file);
    }

    return graph;
}

/**
 * Retrieve relevant repository context.
 */
export async function retrieve(
    query,
    {
        maxTokens = 12000,
        embedding = null,
    } = {}
) {
    let candidates = graph.getFiles().map((file) => ({
        path: file.path,
        content: file.source,
        symbols: file.symbols,
        imports: file.imports,
        exports: file.exports,
    }));

    // Structural ranking
    candidates = rankResults(query, candidates);

    // Optional semantic ranking
    if (embedding) {
        const semantic = searchEmbeddings(
            embedding,
            embeddingStore
        );

        const scores = new Map(
            semantic.map((item) => [
                item.key,
                item.score,
            ])
        );

        candidates = candidates
            .map((candidate) => ({
                ...candidate,
                score:
                    (candidate.score ?? 0) +
                    (scores.get(candidate.path) ?? 0),
            }))
            .sort((a, b) => b.score - a.score);
    }

    // Token budget allocation
    return allocateBudget(
        candidates,
        maxTokens
    );
}