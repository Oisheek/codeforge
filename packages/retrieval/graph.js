/**
 * packages/retrieval/graph.js
 *
 * Repository dependency graph.
 */

export class RepositoryGraph {
    constructor() {
        this.clear();
    }

    clear() {
        this.files = new Map();

        // Graph edges
        this.dependencies = new Map();
        this.dependents = new Map();

        // External indexes
        this.symbolIndex = null;
        this.importIndex = null;
    }

    /**
     * Build graph from repository indexes.
     */
    build(repository, symbolIndex, importIndex) {
        this.clear();

        this.symbolIndex = symbolIndex;
        this.importIndex = importIndex;

        const files = repository.files ?? repository;

        for (const file of files) {
            this.addFile(file);
        }

        return this;
    }

    /**
     * Add one parsed file.
     */
    addFile(parsedFile) {
        this.files.set(parsedFile.path, parsedFile);

        const edges = new Set();

        const imports = this.importIndex?.file(parsedFile.path) ?? [];

        for (const imp of imports) {
            edges.add(imp.source);

            if (!this.dependents.has(imp.source)) {
                this.dependents.set(imp.source, new Set());
            }

            this.dependents
                .get(imp.source)
                .add(parsedFile.path);
        }

        this.dependencies.set(parsedFile.path, edges);
    }

    /**
     * Lookup a parsed file.
     */
    getFile(path) {
        return this.files.get(path) ?? null;
    }

    /**
     * All parsed files.
     */
    getFiles() {
        return [...this.files.values()];
    }

    /**
     * File dependencies.
     */
    getDependencies(path) {
        return [...(this.dependencies.get(path) ?? [])];
    }

    /**
     * Reverse dependencies.
     */
    getDependents(module) {
        return [...(this.dependents.get(module) ?? [])];
    }

    /**
     * Symbol lookup.
     *
     * Delegates to SymbolIndex.
     */
    findSymbol(name) {
        return this.symbolIndex?.find(name) ?? [];
    }

    /**
     * File exists.
     */
    hasFile(path) {
        return this.files.has(path);
    }

    /**
     * Repository statistics.
     */
    stats() {
        let edgeCount = 0;

        for (const deps of this.dependencies.values()) {
            edgeCount += deps.size;
        }

        return {
            files: this.files.size,
            edges: edgeCount,
            symbols: this.symbolIndex?.stats().total ?? 0,
            modules: this.importIndex?.stats().modules ?? 0,
        };
    }

    fileCount() {
        return this.files.size;
    }

    symbolCount() {
        return this.symbolIndex?.stats().total ?? 0;
    }
}

/**
 * Convenience builder.
 */
export function buildRepositoryGraph(
    repository,
    symbolIndex,
    importIndex
) {
    return new RepositoryGraph().build(
        repository,
        symbolIndex,
        importIndex
    );
}