/**
 * packages/retrieval/parser/languages.js
 *
 * Language registry.
 * Maps language identifiers to Tree-sitter grammars.
 */

import JavaScript from "tree-sitter-javascript";
import TypeScript from "tree-sitter-typescript";
import Python from "tree-sitter-python";
import Go from "tree-sitter-go";
import Rust from "tree-sitter-rust";
import Java from "tree-sitter-java";
import C from "tree-sitter-c";
import CPP from "tree-sitter-cpp";
import CSharp from "tree-sitter-c-sharp";
import PHP from "tree-sitter-php";
import Ruby from "tree-sitter-ruby";
import Swift from "tree-sitter-swift";

const LANGUAGES = new Map([
    [
        "javascript",
        {
            id: "javascript",
            grammar: JavaScript,
            extensions: [".js", ".mjs", ".cjs"],
            aliases: ["javascript", "js"],
        },
    ],

    [
        "jsx",
        {
            id: "jsx",
            grammar: JavaScript,
            extensions: [".jsx"],
            aliases: ["jsx"],
        },
    ],

    [
        "typescript",
        {
            id: "typescript",
            grammar: TypeScript.typescript,
            extensions: [".ts", ".mts", ".cts"],
            aliases: ["typescript", "ts"],
        },
    ],

    [
        "tsx",
        {
            id: "tsx",
            grammar: TypeScript.tsx,
            extensions: [".tsx"],
            aliases: ["tsx"],
        },
    ],

    [
        "python",
        {
            id: "python",
            grammar: Python,
            extensions: [".py"],
            aliases: ["python", "py"],
        },
    ],

    [
        "go",
        {
            id: "go",
            grammar: Go,
            extensions: [".go"],
            aliases: ["go", "golang"],
        },
    ],

    [
        "rust",
        {
            id: "rust",
            grammar: Rust,
            extensions: [".rs"],
            aliases: ["rust", "rs"],
        },
    ],

    [
        "java",
        {
            id: "java",
            grammar: Java,
            extensions: [".java"],
            aliases: ["java"],
        },
    ],

    [
        "c",
        {
            id: "c",
            grammar: C,
            extensions: [".c", ".h"],
            aliases: ["c"],
        },
    ],

    [
        "cpp",
        {
            id: "cpp",
            grammar: CPP,
            extensions: [
                ".cpp",
                ".cc",
                ".cxx",
                ".hpp",
                ".hh",
                ".hxx",
            ],
            aliases: ["cpp", "c++"],
        },
    ],

    [
        "csharp",
        {
            id: "csharp",
            grammar: CSharp,
            extensions: [".cs"],
            aliases: ["csharp", "c#"],
        },
    ],

    [
        "php",
        {
            id: "php",
            grammar: PHP,
            extensions: [".php"],
            aliases: ["php"],
        },
    ],

    [
        "ruby",
        {
            id: "ruby",
            grammar: Ruby,
            extensions: [".rb"],
            aliases: ["ruby", "rb"],
        },
    ],

    [
        "swift",
        {
            id: "swift",
            grammar: Swift,
            extensions: [".swift"],
            aliases: ["swift"],
        },
    ],
]);

const EXTENSIONS = new Map();

for (const language of LANGUAGES.values()) {
    for (const extension of language.extensions) {
        EXTENSIONS.set(extension.toLowerCase(), language.id);
    }
}

/**
 * Returns language metadata.
 */
export function getLanguage(name) {
    return LANGUAGES.get(name) ?? null;
}

/**
 * Returns the Tree-sitter grammar.
 */
export function getGrammar(name) {
    return getLanguage(name)?.grammar ?? null;
}

/**
 * Returns whether a language is supported.
 */
export function supportsLanguage(name) {
    return LANGUAGES.has(name);
}

/**
 * Returns all registered languages.
 */
export function getLanguages() {
    return [...LANGUAGES.values()];
}

/**
 * Returns all language identifiers.
 */
export function getLanguageNames() {
    return [...LANGUAGES.keys()];
}

/**
 * Returns the language identifier for a file extension.
 */
export function getLanguageFromExtension(extension) {
    return EXTENSIONS.get(extension.toLowerCase()) ?? null;
}