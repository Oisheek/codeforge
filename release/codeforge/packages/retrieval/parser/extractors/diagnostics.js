/**
 * packages/retrieval/parser/extractors/diagnostics.js
 */

import { createDiagnostic } from "../types.js";

export default function extractDiagnostics({
    tree,
}) {
    if (!tree.rootNode.hasError) {
        return [];
    }

    return [
        createDiagnostic({
            severity: "error",
            type: "syntax",
            message: "Tree-sitter detected syntax errors.",
        }),
    ];
}