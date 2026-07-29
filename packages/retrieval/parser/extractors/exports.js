/**
 * packages/retrieval/parser/extractors/exports.js
 */

import {
    iterateCaptures,
    getNodeLocation,
    getNodeText,
} from "../helpers.js";

import { createExport } from "../types.js";

export default function extractExports({
    query,
    tree,
    source,
}) {
    const exportsList = [];

    if (!query) {
        return exportsList;
    }

    for (const { node, name } of iterateCaptures(query, tree)) {
        exportsList.push(
            createExport({
                // Queries should capture the exported identifier.
                name: node.text,

                // Capture name (e.g. export.default, export.named)
                kind: name.replace(/^export\./, ""),

                location: getNodeLocation(node),

                metadata: {
                    text: getNodeText(node, source),
                },
            })
        );
    }

    return exportsList;
}