import test from "node:test";
import assert from "node:assert/strict";

import {
    createRetriever,
} from "../retriever.js";

function createMockIndexes(files) {
    const repository = {
        files,
    };

    return {
        repository,

        symbols: {
            stats() {
                return {
                    total: 0,
                };
            },
        },

        imports: {
            stats() {
                return {
                    modules: 0,
                };
            },
        },

        graph: {
            hasFile(path) {
                return files.some(
                    (file) =>
                        file.path === path
                );
            },

            fileCount() {
                return files.length;
            },

            stats() {
                return {};
            },
        },
    };
}

function createFile({
    path,
    source = "",
    symbols = [],
    imports = [],
    exports = [],
}) {
    return {
        path,
        source,
        symbols,
        imports,
        exports,
    };
}

test(
    "ranks an exact filename match above unrelated files",
    () => {
        const retriever =
            createRetriever(
                createMockIndexes([
                    createFile({
                        path:
                            "packages/agent/router.js",
                        source:
                            "export function routeRequest() {}",
                    }),

                    createFile({
                        path:
                            "packages/config/defaults.js",
                        source:
                            "export const defaults = {};",
                    }),
                ])
            );

        const results =
            retriever.search(
                "router.js"
            );

        assert.ok(
            results.length > 0
        );

        assert.equal(
            results[0].path,
            "packages/agent/router.js"
        );
    }
);

test(
    "retrieves a file containing an exact symbol name",
    () => {
        const retriever =
            createRetriever(
                createMockIndexes([
                    createFile({
                        path:
                            "packages/agent/fallback.js",
                        source:
                            "export function getFallbackRoute() {}",
                        symbols: [
                            {
                                name:
                                    "getFallbackRoute",
                                qualifiedName:
                                    "getFallbackRoute",
                                kind:
                                    "function",
                            },
                        ],
                    }),

                    createFile({
                        path:
                            "packages/agent/router.js",
                        source:
                            "export function routeRequest() {}",
                    }),
                ])
            );

        const results =
            retriever.search(
                "getFallbackRoute"
            );

        assert.ok(
            results.length > 0
        );

        assert.equal(
            results[0].path,
            "packages/agent/fallback.js"
        );
    }
);

test(
    "retrieves multiple relevant files for a cross-file query",
    () => {
        const retriever =
            createRetriever(
                createMockIndexes([
                    createFile({
                        path:
                            "packages/agent/router.js",
                        source:
                            "Route provider and model selection.",
                    }),

                    createFile({
                        path:
                            "packages/agent/fallback.js",
                        source:
                            "Fallback provider and model selection.",
                    }),

                    createFile({
                        path:
                            "packages/ui/theme.js",
                        source:
                            "Terminal colors and layout.",
                    }),
                ])
            );

        const results =
            retriever.search(
                "provider model routing fallback",
                {
                    limit: 3,
                }
            );

        const paths =
            results.map(
                (result) =>
                    result.path
            );

        assert.ok(
            paths.includes(
                "packages/agent/router.js"
            )
        );

        assert.ok(
            paths.includes(
                "packages/agent/fallback.js"
            )
        );

        assert.equal(
            paths.includes(
                "packages/ui/theme.js"
            ),
            false
        );
    }
);

test(
    "respects the retrieval result limit",
    () => {
        const retriever =
            createRetriever(
                createMockIndexes([
                    createFile({
                        path: "a.js",
                        source:
                            "routing provider",
                    }),

                    createFile({
                        path: "b.js",
                        source:
                            "routing provider",
                    }),

                    createFile({
                        path: "c.js",
                        source:
                            "routing provider",
                    }),
                ])
            );

        const results =
            retriever.search(
                "routing provider",
                {
                    limit: 2,
                }
            );

        assert.equal(
            results.length,
            2
        );
    }
);

test(
    "limits the source excerpt size",
    () => {
        const source =
            `routing ${"x".repeat(
                5000
            )}`;

        const retriever =
            createRetriever(
                createMockIndexes([
                    createFile({
                        path:
                            "packages/agent/router.js",
                        source,
                    }),
                ])
            );

        const results =
            retriever.search(
                "routing",
                {
                    maxSourceLength:
                        500,
                }
            );

        assert.equal(
            results.length,
            1
        );

        assert.ok(
            results[0].content.length <=
                510
        );
    }
);