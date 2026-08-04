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
        if (
            !name ||
            !name.startsWith("export.")
        ) {
            continue;
        }

        const exportName =
            typeof node?.text === "string"
                ? node.text.trim()
                : "";

        if (!exportName) {
            continue;
        }

        const kind =
            name.replace(/^export\./, "");

        exportsList.push(
            createExport({
                name: exportName,

                kind,

                default:
                    kind === "default",

                exported:
                    exportName,

                location:
                    getNodeLocation(node),

                metadata: {
                    text:
                        getNodeText(
                            node,
                            source
                        ),
                },
            })
        );
    }

    return exportsList;
}