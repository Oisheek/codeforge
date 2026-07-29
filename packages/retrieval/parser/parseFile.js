/**
 * packages/retrieval/parser/parseFile.js
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { getLanguageFromExtension } from "./languages.js";
import { getParser, getQueries } from "./registry.js";
import { traverse } from "./traverse.js";
import { createParsedFile } from "./types.js";

export async function parseFile(filePath) {
    const source = await fs.readFile(filePath, "utf8");

    const extension = path.extname(filePath);

    const language = getLanguageFromExtension(extension);

    if (!language) {
        return createParsedFile({
            path: filePath,
            name: path.basename(filePath),
            extension,
            supported: false,
            source,
        });
    }

    const parser = getParser(language);

    const tree = parser.parse(source);

    const queries = getQueries(language);

    const result = traverse({
        tree,
        source,
        file: filePath,
        language,
        queries,
    });

    return createParsedFile({
        path: filePath,

        name: path.basename(filePath),

        extension,

        language,

        hash: crypto
            .createHash("sha256")
            .update(source)
            .digest("hex"),

        size: Buffer.byteLength(source),

        source,

        ast: tree,

        imports: result.imports,
        exports: result.exports,
        symbols: result.symbols,
        calls: result.calls,
        comments: result.comments,
        todos: result.todos,

        diagnostics: result.diagnostics,
        metrics: result.metrics,
    });
}