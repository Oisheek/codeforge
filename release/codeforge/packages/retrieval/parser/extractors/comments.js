/**
 * packages/retrieval/parser/extractors/comments.js
 */

import {
    iterateCaptures,
    getNodeLocation,
    getNodeText,
} from "../helpers.js";

import { createComment } from "../types.js";

export default function extractComments({
    query,
    tree,
    source,
}) {
    const comments = [];

    if (!query) {
        return comments;
    }

    for (const { node } of iterateCaptures(query, tree)) {
        const text = getNodeText(node, source);

        comments.push(
            createComment({
                text,

                block: text.startsWith("/*"),

                documentation:
                    text.startsWith("/**") ||
                    text.startsWith("///"),

                line: node.startPosition.row + 1,

                metadata: {
                    raw: text,
                },

                location: getNodeLocation(node),
            })
        );
    }

    return comments;
}