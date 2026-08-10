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
    const filePath =
        typeof file === "string"
            ? file
            : file.path;

    const fileHash =
        typeof file === "string"
            ? null
            : file.hash;

    try {
        // Cache hit
        if (
            cache &&
            fileHash &&
            cache.has(filePath, fileHash)
        ) {
            const cached = cache.get(filePath);

            if (cached?.parsed) {
                files.push(cached.parsed);
                continue;
            }
        }

        const parsed = await parseFile(filePath);

        if (cache && fileHash) {
            cache.set(
                filePath,
                fileHash,
                {
                    parsed,
                }
            );
        }

        files.push(parsed);
    } catch (error) {
       console.error(`Failed to parse ${filePath}`);
console.error(error.stack);
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