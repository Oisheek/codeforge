/**
 * packages/retrieval/parser/registry.js
 */

import Parser from "tree-sitter";

import * as languages from "./languages.js";
import { getQuerySet } from "./queries/index.js";

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
    const querySet = getQuerySet(language);

    if (!grammar) {
        throw new Error(`Unsupported language: ${language}`);
    }

    if (!querySet) {
        throw new Error(`No query set registered for language: ${language}`);
    }

    const compiled = {};

    for (const [name, source] of Object.entries(querySet)) {
    if (!source?.trim()) {
        compiled[name] = null;
        continue;
    }

    try {
        compiled[name] = new Parser.Query(grammar, source);
    } catch (err) {
        console.error("\n========================================");
        console.error(`Failed language : ${language}`);
        console.error(`Failed query    : ${name}`);
        console.error("========================================");
        console.error(source);
        console.error("========================================\n");
        throw err;
    }
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