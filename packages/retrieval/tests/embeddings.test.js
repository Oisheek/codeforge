import test from "node:test";
import assert from "node:assert/strict";

import {
    EmbeddingStore,
    cosineSimilarity,
    normalizeVector,
    searchEmbeddings,
} from "../embeddings.js";

test(
    "cosine similarity is 1 for identical vectors",
    () => {
        const score =
            cosineSimilarity(
                [1, 2, 3],
                [1, 2, 3]
            );

        assert.ok(
            Math.abs(score - 1) <
                1e-12
        );
    }
);

test(
    "cosine similarity is 0 for orthogonal vectors",
    () => {
        assert.equal(
            cosineSimilarity(
                [1, 0],
                [0, 1]
            ),
            0
        );
    }
);

test(
    "cosine similarity is -1 for opposite vectors",
    () => {
        const score =
            cosineSimilarity(
                [1, 0],
                [-1, 0]
            );

        assert.ok(
            Math.abs(score + 1) <
                1e-12
        );
    }
);

test(
    "cosine similarity returns 0 for incompatible vectors",
    () => {
        assert.equal(
            cosineSimilarity(
                [1, 2],
                [1]
            ),
            0
        );

        assert.equal(
            cosineSimilarity(
                [],
                []
            ),
            0
        );
    }
);

test(
    "cosine similarity returns 0 for a zero vector",
    () => {
        assert.equal(
            cosineSimilarity(
                [0, 0],
                [1, 1]
            ),
            0
        );
    }
);

test(
    "normalizeVector produces a unit vector",
    () => {
        const vector =
            normalizeVector(
                [3, 4]
            );

        const magnitude =
            Math.sqrt(
                vector.reduce(
                    (sum, value) =>
                        sum +
                        value * value,
                    0
                )
            );

        assert.ok(
            Math.abs(
                magnitude - 1
            ) < 1e-12
        );
    }
);

test(
    "embedding store normalizes vectors and preserves metadata",
    () => {
        const store =
            new EmbeddingStore();

        store.set(
            "router",
            [3, 4],
            {
                path:
                    "packages/agent/router.js",
            }
        );

        const entry =
            store.get("router");

        assert.ok(entry);

        assert.ok(
            Math.abs(
                entry.embedding[0] -
                    0.6
            ) < 1e-12
        );

        assert.ok(
            Math.abs(
                entry.embedding[1] -
                    0.8
            ) < 1e-12
        );

        assert.equal(
            entry.metadata.path,
            "packages/agent/router.js"
        );
    }
);

test(
    "embedding search ranks results by cosine similarity",
    () => {
        const store =
            new EmbeddingStore();

        store.set(
            "best",
            [1, 0],
            {
                text:
                    "routing provider",
            }
        );

        store.set(
            "partial",
            [1, 1],
            {
                text:
                    "routing configuration",
            }
        );

        store.set(
            "unrelated",
            [0, 1],
            {
                text:
                    "terminal colors",
            }
        );

        const results =
            searchEmbeddings(
                [1, 0],
                store
            );

        assert.deepEqual(
            results.map(
                (result) =>
                    result.key
            ),
            [
                "best",
                "partial",
                "unrelated",
            ]
        );

        assert.ok(
            results[0].score >
                results[1].score
        );

        assert.ok(
            results[1].score >
                results[2].score
        );
    }
);