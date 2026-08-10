/**
 * packages/retrieval/parser/extractors/symbols.js
 */

import {
    iterateCaptures,
    createId,
    getNodeLocation,
    getNodeText,
    normalizeCapture,
} from "../helpers.js";

import { createSymbol } from "../types.js";

export default function extractSymbols({
    query,
    tree,
    source,
    file,
    language,
}) {
    const symbols = [];

    if (!query) return symbols;

    for (const capture of iterateCaptures(query, tree)) {
        const node = capture.node;

        symbols.push(
            createSymbol({
                id: createId(),

                name: node.text,

                kind: normalizeCapture(capture.name),

                language,

                file,

                location: getNodeLocation(node),

                metadata: {
                    text: getNodeText(node, source),
                },
            })
        );
    }

    return symbols;
}