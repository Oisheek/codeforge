import { graph } from "./graph.js";

/**
 * Find all definitions of a symbol.
 */
export function findSymbol(name) {
    return graph.findSymbol(name);
}

/**
 * Check whether a symbol exists.
 */
export function hasSymbol(name) {
    return graph.findSymbol(name).length > 0;
}

/**
 * Return every symbol in the repository.
 */
export function getAllSymbols() {
    const symbols = [];

    for (const file of graph.getFiles()) {
        for (const symbol of file.symbols ?? []) {
            symbols.push({
                file: file.path,
                ...symbol,
            });
        }
    }

    return symbols;
}

/**
 * Group symbols by kind.
 */
export function getSymbolsByKind(kind) {
    return getAllSymbols().filter(
        (symbol) => symbol.kind === kind
    );
}

/**
 * Build a symbol index.
 */
export function getSymbolIndex() {
    const index = new Map();

    for (const symbol of getAllSymbols()) {
        if (!index.has(symbol.name)) {
            index.set(symbol.name, []);
        }

        index.get(symbol.name).push(symbol);
    }

    return index;
}

/**
 * Return repository symbol statistics.
 */
export function getSymbolStats() {
    const stats = {
        total: 0,
        byKind: {},
    };

    for (const symbol of getAllSymbols()) {
        stats.total++;

        stats.byKind[symbol.kind] ??= 0;
        stats.byKind[symbol.kind]++;
    }

    return stats;
}