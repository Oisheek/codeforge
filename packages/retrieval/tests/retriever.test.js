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

test(
    "prefers implementation files over tests for implementation queries",
    () => {
        const retriever =
            createRetriever(
                createMockIndexes([
                    createFile({
                        path:
                            "packages/agent/router.js",
                        source: `
                            export function routeRequest() {
                                return selectProvider();
                            }

                            function selectProvider() {
                                return "openrouter";
                            }
                        `,
                    }),

                    createFile({
                        path:
                            "packages/agent/fallback.js",
                        source: `
                            export function getFallbackRoute() {
                                return "fallback provider";
                            }
                        `,
                    }),

                    createFile({
                        path:
                            "packages/providers/index.js",
                        source: `
                            export function createProvider() {
                                return "provider selection";
                            }
                        `,
                    }),

                    createFile({
                        path:
                            "packages/agent/tests/executor.test.js",
                        source: `
                            routing routing routing routing
                            fallback fallback fallback fallback
                            provider provider provider provider
                            selection selection selection
                        `,
                    }),
                ])
            );

        const results =
            retriever.search(
                "Find the routing implementation and explain routing fallback behavior and provider selection",
                {
                    limit: 4,
                }
            );

        const paths =
            results.map(
                (result) =>
                    result.path
            );

  const implementationPaths = [
    "packages/agent/router.js",
    "packages/agent/fallback.js",
    "packages/providers/index.js",
];

for (const implementationPath of implementationPaths) {
    assert.ok(
        paths.includes(
            implementationPath
        ),
        `Expected ${implementationPath} to be retrieved`
    );
}

const testIndex =
    paths.indexOf(
        "packages/agent/tests/executor.test.js"
    );

if (testIndex !== -1) {
    for (const implementationPath of implementationPaths) {
        assert.ok(
            paths.indexOf(
                implementationPath
            ) < testIndex,
            `Expected ${implementationPath} to rank above the test file`
        );
    }
}
    }
);

test(
    "does not penalize test files when the query explicitly asks for tests",
    () => {
        const retriever =
            createRetriever(
                createMockIndexes([
                    createFile({
                        path:
                            "packages/agent/executor.js",
                        source: `
                            fallback provider routing
                        `,
                    }),

                    createFile({
                        path:
                            "packages/agent/tests/executor.test.js",
                        source: `
                            executor fallback tests
                            provider fallback test
                            routing test
                        `,
                    }),
                ])
            );

        const results =
            retriever.search(
                "Find the executor fallback tests",
                {
                    limit: 2,
                }
            );

        assert.equal(
            results[0].path,
            "packages/agent/tests/executor.test.js"
        );
    }
);

test(
    "expands routing and selection terminology for code identifiers",
    () => {
        const retriever =
            createRetriever(
                createMockIndexes([
                    createFile({
                        path:
                            "packages/agent/router.js",
                        source: `
                            export function routeRequest() {
                                return selectProvider();
                            }

                            function selectProvider() {
                                return "openrouter";
                            }
                        `,
                    }),

                    createFile({
                        path:
                            "packages/unrelated/logger.js",
                        source: `
                            export function writeLog() {
                                return "log";
                            }
                        `,
                    }),
                ])
            );

        const results =
            retriever.search(
                "Explain routing and provider selection",
                {
                    limit: 4,
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

        assert.equal(
            paths[0],
            "packages/agent/router.js"
        );
    }
);

test(
    "retrieves the complete routing architecture for a cross-file implementation query",
    () => {
        const retriever =
            createRetriever(
                createMockIndexes([
                    createFile({
                        path:
                            "packages/agent/router.js",
                        source: `
                            export function routeRequest({
                                plan,
                                config,
                                providers,
                            }) {
                                const provider =
                                    config.provider;

                                return {
                                    provider,
                                    model:
                                        selectModel(
                                            plan,
                                            config.models
                                        ),
                                };
                            }

                            function selectModel(
                                plan,
                                models
                            ) {
                                return models.general;
                            }
                        `,
                    }),

                    createFile({
                        path:
                            "packages/agent/fallback.js",
                        source: `
                            export function getFallbackRoute({
                                error,
                                route,
                                providers,
                                models,
                            }) {
                                if (!isRetryable(error)) {
                                    return null;
                                }

                                return findNextModel(
                                    route,
                                    models,
                                    providers
                                );
                            }

                            function findNextModel(
                                route,
                                models
                            ) {
                                return (
                                    models.fallback ??
                                    models.emergency
                                );
                            }
                        `,
                    }),

                    createFile({
                        path:
                            "packages/agent/executor.js",
                        source: `
                            import {
                                routeRequest,
                            } from "./router.js";

                            import {
                                getFallbackRoute,
                            } from "./fallback.js";

                            export async function execute({
                                provider,
                                providers,
                                config,
                            }) {
                                let route =
                                    routeRequest({
                                        config,
                                        providers,
                                    });

                                try {
                                    return await provider.generate({
                                        model:
                                            route.model,
                                    });
                                } catch (error) {
                                    route =
                                        getFallbackRoute({
                                            error,
                                            route,
                                            providers,
                                            models:
                                                config.models,
                                        });
                                }
                            }
                        `,
                    }),

                    createFile({
                        path:
                            "packages/providers/index.js",
                        source: `
                            export function createProvider(
                                name,
                                config
                            ) {
                                return PROVIDERS.get(
                                    name
                                )(config);
                            }

                            export function registerProvider(
                                name,
                                factory
                            ) {
                                PROVIDERS.set(
                                    name,
                                    factory
                                );
                            }
                        `,
                    }),

                    createFile({
                        path:
                            "apps/cli/src/dev/provider.js",
                        source: `
                            export async function testProvider(
                                provider
                            ) {
                                return provider.chat();
                            }
                        `,
                    }),

                    createFile({
                        path:
                            "packages/retrieval/retriever.js",
                        source: `
                            export class Retriever {
                                search(query) {
                                    return [];
                                }
                            }
                        `,
                    }),
                ])
            );

        const results =
            retriever.search(
                "Find the routing implementation and explain how routing, fallback behavior, and provider selection interact across the codebase.",
                {
                    limit: 4,
                }
            );

        const paths =
            results.map(
                (result) =>
                    result.path
            );

        assert.deepEqual(
            new Set(paths),
            new Set([
                "packages/agent/router.js",
                "packages/agent/fallback.js",
                "packages/agent/executor.js",
                "packages/providers/index.js",
            ])
        );
    }
);