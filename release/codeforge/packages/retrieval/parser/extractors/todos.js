/**
 * packages/retrieval/parser/extractors/todos.js
 */

import {
    iterateCaptures,
    getNodeLocation,
    getNodeText,
} from "../helpers.js";

import { createTodo } from "../types.js";

const TODO_PATTERN = /\b(TODO|FIXME|BUG|HACK|NOTE|XXX)\b[:\-\s]?(.*)/i;

export default function extractTodos({
    query,
    tree,
    source,
}) {
    const todos = [];

    if (!query) {
        return todos;
    }

    for (const { node } of iterateCaptures(query, tree)) {
        const text = getNodeText(node, source);

        const match = text.match(TODO_PATTERN);

        if (!match) {
            continue;
        }

        todos.push(
            createTodo({
                type: match[1].toUpperCase(),

                text: match[2]?.trim() ?? "",

                line: node.startPosition.row + 1,

                metadata: {
                    raw: text,
                },

                location: getNodeLocation(node),
            })
        );
    }

    return todos;
}