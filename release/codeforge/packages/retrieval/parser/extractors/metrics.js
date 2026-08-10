/**
 * packages/retrieval/parser/extractors/metrics.js
 */

import { createMetrics } from "../types.js";

export default function extractMetrics({
    source,
    symbols = [],
    imports = [],
    exports = [],
    todos = [],
}) {
    const lines = source.split(/\r?\n/);

    let code = 0;
    let comments = 0;
    let blanks = 0;

    for (const line of lines) {
        const text = line.trim();

        if (!text) {
            blanks++;
            continue;
        }

        if (
            text.startsWith("//") ||
            text.startsWith("#") ||
            text.startsWith("/*") ||
            text.startsWith("*") ||
            text.startsWith("--")
        ) {
            comments++;
            continue;
        }

        code++;
    }

    const functions = symbols.filter(
        (s) => s.kind === "function"
    ).length;

    const classes = symbols.filter(
        (s) =>
            s.kind === "class" ||
            s.kind === "interface" ||
            s.kind === "struct" ||
            s.kind === "trait"
    ).length;

    const methods = symbols.filter(
        (s) => s.kind === "method"
    ).length;

    return createMetrics({
        lines: lines.length,

        code,
        comments,
        blanks,

        functions,
        classes,
        methods,

        imports: imports.length,

        exports: exports.length,

        todos: todos.length,

        // Placeholder until we implement CFG/cyclomatic analysis
        complexity: functions,
    });
}