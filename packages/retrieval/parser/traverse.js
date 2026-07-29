/**
 * packages/retrieval/parser/traverse.js
 */

import extractSymbols from "./extractors/symbols.js";
import extractImports from "./extractors/imports.js";
import extractExports from "./extractors/exports.js";
import extractCalls from "./extractors/calls.js";
import extractComments from "./extractors/comments.js";
import extractTodos from "./extractors/todos.js";
import extractDiagnostics from "./extractors/diagnostics.js";
import extractMetrics from "./extractors/metrics.js";

export function traverse({
    tree,
    source,
    file,
    language,
    queries,
}) {
    const symbols = extractSymbols({
        query: queries.SYMBOLS,
        tree,
        source,
        file,
        language,
    });

    const imports = extractImports({
        query: queries.IMPORTS,
        tree,
        source,
    });

    const exportsList = extractExports({
        query: queries.EXPORTS,
        tree,
        source,
    });

    const calls = extractCalls({
        query: queries.CALLS,
        tree,
        source,
    });

    const comments = extractComments({
        query: queries.COMMENTS,
        tree,
        source,
    });

    const todos = extractTodos({
        query: queries.TODOS,
        tree,
        source,
    });

    const metrics = extractMetrics({
        source,
        symbols,
        imports,
        exports: exportsList,
        todos,
    });

    const diagnostics = extractDiagnostics({
        tree,
        source,
    });

    return {
        symbols,
        imports,
        exports: exportsList,
        calls,
        comments,
        todos,
        metrics,
        diagnostics,
    };
}