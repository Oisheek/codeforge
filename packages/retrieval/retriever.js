/**
 * packages/retrieval/retriever.js
 *
 * Repository retrieval facade.
 */

export class Retriever {
    constructor({
        repository,
        symbols,
        imports,
        graph,
    }) {
        this.repository = repository;
        this.symbols = symbols;
        this.imports = imports;
        this.graph = graph;
    }

    /**
     * Repository object.
     */
    getRepository() {
        return this.repository;
    }

    /**
     * Find symbols by exact name.
     */
    findSymbol(name) {
        return this.symbols.find(name);
    }

    /**
     * Find symbols by kind.
     */
    findSymbolsByKind(kind) {
        return this.symbols.kind(kind);
    }

    /**
     * All indexed symbols.
     */
    getAllSymbols() {
        return this.symbols.values();
    }

    /**
     * Symbols in a file.
     */
    getFileSymbols(path) {
        return this.symbols.file(path);
    }

    /**
     * Imports of a file.
     */
    getFileImports(path) {
        return this.imports.file(path);
    }

    /**
     * Files importing a module.
     */
    getImporters(module) {
        return this.imports.source(module);
    }

    /**
     * Dependency graph.
     */
    getDependencies(path) {
        return this.graph.getDependencies(path);
    }

    /**
     * Reverse dependency graph.
     */
    getDependents(module) {
        return this.graph.getDependents(module);
    }

    /**
     * Parsed file.
     */
    getFile(path) {
        return this.graph.getFile(path);
    }

    /**
     * Check if a file exists.
     */
    hasFile(path) {
        return this.graph.hasFile(path);
    }

    /**
     * Basic lexical search.
     *
     * This will later become the unified entry point
     * for lexical + graph + semantic retrieval.
     */
    search(query) {
        return this.findSymbol(query);
    }

    /**
     * Repository statistics.
     */
    stats() {
        return {
            files: this.graph.fileCount(),
            symbols: this.symbols.stats().total,
            imports: this.imports.stats().modules,
            graph: this.graph.stats(),
        };
    }
}

/**
 * Factory.
 */
export function createRetriever(indexes) {
    return new Retriever(indexes);
}