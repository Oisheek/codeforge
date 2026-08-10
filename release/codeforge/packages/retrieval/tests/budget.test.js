import test from "node:test";
import assert from "node:assert/strict";

import {
    ContextBudget,
} from "../budget.js";

test(
    "estimates tokens using the current four-character heuristic",
    () => {
        const budget =
            new ContextBudget(
                100
            );

        assert.equal(
            budget.estimate(
                "12345678"
            ),
            2
        );
    }
);

test(
    "selects ranked items without exceeding the context budget",
    () => {
        const budget =
            new ContextBudget(
                5
            );

        const result =
            budget.select([
                {
                    text:
                        "12345678",
                },
                {
                    text:
                        "abcdefgh",
                },
            ]);

        assert.equal(
            result.items.length,
            2
        );

        assert.equal(
            result.used,
            4
        );

        assert.equal(
            result.remaining,
            1
        );

        assert.ok(
            result.used <=
                result.limit
        );
    }
);

test(
    "preserves input ranking order",
    () => {
        const budget =
            new ContextBudget(
                10
            );

        const items = [
            {
                text: "aaaa",
                id: "first",
            },
            {
                text: "bbbb",
                id: "second",
            },
            {
                text: "cccc",
                id: "third",
            },
        ];

        const result =
            budget.select(items);

        assert.deepEqual(
            result.items.map(
                (item) => item.id
            ),
            [
                "first",
                "second",
                "third",
            ]
        );
    }
);

test(
    "skips an oversized item and continues packing later ranked items",
    () => {
        const budget =
            new ContextBudget(
                3
            );

        const result =
            budget.select([
                {
                    id: "first",
                    text: "1234",
                },

                {
                    id: "oversized",
                    text:
                        "123456789012",
                },

                {
                    id: "later",
                    text: "1234",
                },
            ]);

        assert.deepEqual(
            result.items.map(
                (item) => item.id
            ),
            [
                "first",
                "later",
            ]
        );

        assert.equal(
            result.used,
            2
        );

        assert.equal(
            result.remaining,
            1
        );
    }
);
test(
    "fits reports whether a single item fits within the limit",
    () => {
        const budget =
            new ContextBudget(
                2
            );

        assert.equal(
            budget.fits({
                text:
                    "12345678",
            }),
            true
        );

        assert.equal(
            budget.fits({
                text:
                    "123456789",
            }),
            false
        );
    }
);

test(
    "supports text stored in metadata",
    () => {
        const budget =
            new ContextBudget(
                2
            );

        const result =
            budget.select([
                {
                    metadata: {
                        text:
                            "12345678",
                    },
                },
            ]);

        assert.equal(
            result.items.length,
            1
        );

        assert.equal(
            result.used,
            2
        );
    }
);