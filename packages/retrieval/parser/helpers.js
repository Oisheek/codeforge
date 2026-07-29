/**
 * packages/retrieval/parser/helpers.js
 */

import crypto from "node:crypto";
import { createLocation } from "./types.js";

/* -------------------------------------------------------------------------- */
/* IDs                                                                         */
/* -------------------------------------------------------------------------- */

export function createId() {
    return crypto.randomUUID();
}

/* -------------------------------------------------------------------------- */
/* Node Text                                                                   */
/* -------------------------------------------------------------------------- */

export function getNodeText(node, source) {
    if (!node) return "";

    return source.slice(node.startIndex, node.endIndex);
}

/* -------------------------------------------------------------------------- */
/* Node Name                                                                   */
/* -------------------------------------------------------------------------- */

export function getNodeName(node) {
    return node?.text ?? "";
}

/* -------------------------------------------------------------------------- */
/* Location                                                                    */
/* -------------------------------------------------------------------------- */

export function getNodeLocation(node) {
    if (!node) return createLocation();

    return createLocation({
        startLine: node.startPosition.row + 1,
        startColumn: node.startPosition.column + 1,

        endLine: node.endPosition.row + 1,
        endColumn: node.endPosition.column + 1,
    });
}

/* -------------------------------------------------------------------------- */
/* Capture Helpers                                                             */
/* -------------------------------------------------------------------------- */

export function normalizeCapture(name = "") {
    return name.replace(/^symbol\./, "");
}

export function isSymbolCapture(name) {
    return name.startsWith("symbol.");
}

export function isImportCapture(name) {
    return name === "import";
}

export function isExportCapture(name) {
    return name === "export";
}

export function isCallCapture(name) {
    return name === "call";
}

export function isCommentCapture(name) {
    return name === "comment";
}

export function isTodoCapture(name) {
    return name === "todo";
}

/* -------------------------------------------------------------------------- */
/* Query Execution                                                             */
/* -------------------------------------------------------------------------- */

export function runQuery(query, tree) {
    if (!query) return [];

    return query.matches(tree.rootNode);
}

export function* iterateCaptures(query, tree) {
    for (const match of runQuery(query, tree)) {
        for (const capture of match.captures) {
            yield {
                node: capture.node,
                name: capture.name,
            };
        }
    }
}

/* -------------------------------------------------------------------------- */
/* Tree Helpers                                                                */
/* -------------------------------------------------------------------------- */


export function getParent(node) {
    return node?.parent ?? null;
}

export function isTopLevel(node) {
    if (!node) return false;

    const parent = node.parent;

    return (
        !parent ||
        parent.type === "program" ||
        parent.type === "module"
    );
}

/* -------------------------------------------------------------------------- */
/* Utilities                                                                   */
/* -------------------------------------------------------------------------- */

export function unique(array) {
    return [...new Set(array)];
}

export function hasErrors(tree) {
    return tree.rootNode.hasError;
}

export function getRoot(tree) {
    return tree.rootNode;
}