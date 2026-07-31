/**
 * packages/retrieval/parser.js
 *
 * Builds the complete retrieval pipeline for a repository.
 */

import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_IGNORE } from "../scanner/ignore.js";

import { parseRepository } from "./parser/index.js";

import { buildSymbolIndex } from "./symbols.js";
import { buildImportIndex } from "./imports.js";
import { buildRepositoryGraph } from "./graph.js";
import { createRetriever } from "./retriever.js";

async function collectFiles(root) {
    const files = [];

    async function walk(dir) {
        const entries = await fs.readdir(dir, {
            withFileTypes: true,
        });

        for (const entry of entries) {
            if (DEFAULT_IGNORE.includes(entry.name)) {
                continue;
            }

            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                await walk(fullPath);
            } else {
                files.push(fullPath);
            }
        }
    }

    await walk(root);

    return files;
}

/**
 * Build complete retrieval pipeline.
 */
export async function buildRepository(repositoryRoot, cache = null) {
    const fileIndex = await collectFiles(repositoryRoot);

    const repository = await parseRepository(fileIndex, cache);

    const symbols = buildSymbolIndex(repository);
    const imports = buildImportIndex(repository);

    const graph = buildRepositoryGraph(
        repository,
        symbols,
        imports
    );

    const retriever = createRetriever({
        repository,
        symbols,
        imports,
        graph,
    });

    return {
        repository,
        symbols,
        imports,
        graph,
        retriever,
    };
}