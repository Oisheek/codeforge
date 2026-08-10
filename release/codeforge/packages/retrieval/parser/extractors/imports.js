/**
 * packages/retrieval/parser/extractors/imports.js
 */

import {
    iterateCaptures,
    getNodeLocation,
    getNodeText,
} from "../helpers.js";

import { createImport } from "../types.js";

export default function extractImports({
    query,
    tree,
    source,
}) {
    const imports = [];

    if (!query) {
        return imports;
    }

    for (const { node } of iterateCaptures(query, tree)) {
        imports.push(
            createImport({
                // The Tree-sitter query should capture only the module/source node.
                source: node.text,

                location: getNodeLocation(node),

                metadata: {
                    text: getNodeText(node, source),
                },
            })
        );
    }

    return imports;
}