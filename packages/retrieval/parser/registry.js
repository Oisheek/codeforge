/**
 * packages/retrieval/parser/registry.js
 */

import Parser from "tree-sitter";

import * as languages from "./languages.js";

const parserCache = new Map();

const queryCache = new Map();

export function supportedLanguages() {
    return [
        "javascript",
        "typescript",
        "python",
        "java",
        "go",
        "rust",
        "c",
        "cpp",
        "csharp",
        "php",
        "ruby",
        "swift",
    ];
}
/* -------------------------------------------------------------------------- */
/* Parser                                                                      */
/* -------------------------------------------------------------------------- */

export function getParser(language) {
    if (parserCache.has(language)) {
        return parserCache.get(language);
    }

    const grammar = languages.getGrammar(language);

    if (!grammar) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const parser = new Parser();

    parser.setLanguage(grammar);

    parserCache.set(language, parser);

    return parser;
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                     */
/* -------------------------------------------------------------------------- */

export function getQueries(language) {
    if (queryCache.has(language)) {
        return queryCache.get(language);
    }

    const grammar = languages.getGrammar(language);

    const adapter = languages.getLanguage(language);

    if (!grammar || !adapter) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const compiled = {};

    for (const [name, source] of Object.entries(adapter.queries)) {
        if (!source?.trim()) {
            compiled[name] = null;
            continue;
        }

        compiled[name] = new Parser.Query(
            grammar,
            source
        );
    }

    queryCache.set(language, compiled);

    return compiled;
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                       */
/* -------------------------------------------------------------------------- */

export function clearRegistryCache() {
    parserCache.clear();
    queryCache.clear();
}

