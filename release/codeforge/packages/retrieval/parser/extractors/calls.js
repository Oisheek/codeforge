/**
 * packages/retrieval/parser/extractors/calls.js
 */

import {
    iterateCaptures,
    getNodeLocation,
    getNodeText,
} from "../helpers.js";

import { createCall } from "../types.js";

export default function extractCalls({
    query,
    tree,
    source,
}) {
    const calls = [];

    if (!query) {
        return calls;
    }

    for (const { node, name } of iterateCaptures(query, tree)) {
        calls.push(
            createCall({
                // Query should capture the called identifier/member.
                name: node.text,

                // e.g. call.function, call.method, call.constructor
                kind: name.replace(/^call\./, ""),

                location: getNodeLocation(node),

                metadata: {
                    text: getNodeText(node, source),
                },
            })
        );
    }

    return calls;
}