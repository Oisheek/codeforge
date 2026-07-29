/**
 * packages/retrieval/parser/parseRepository.js
 */

import { parseFile } from "./parseFile.js";

/**
 * Parse an indexed repository.
 *
 * @param {Array} repositoryIndex
 * @param {Object|null} cache
 * @returns {Promise<Object>}
 */
export async function parseRepository(
    repositoryIndex,
    cache = null
) {
    const files = [];

    for (const file of repositoryIndex) {
        try {
            // Cache hit
            if (
                cache &&
                cache.has(file.path, file.hash)
            ) {
                const cached = cache.get(file.path);

                if (cached?.parsed) {
                    files.push(cached.parsed);
                    continue;
                }
            }

            // Reserved for future incremental parsing
            const previousTree = null;

            const parsed = await parseFile(
                file,
                previousTree
            );

            if (cache) {
                cache.set(
                    file.path,
                    file.hash,
                    {
                        parsed,
                    }
                );
            }

            files.push(parsed);
        } catch (error) {
            console.warn(
                `Failed to parse ${file.path}:`,
                error.message
            );
        }
    }

    if (cache) {
        await cache.save();
    }

    return {
        files,

        metrics: {
            total: repositoryIndex.length,
            parsed: files.filter(f => f.supported).length,
            skipped: files.filter(f => !f.supported).length,
        },
    };
}