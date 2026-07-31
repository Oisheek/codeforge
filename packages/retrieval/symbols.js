/**
 * packages/retrieval/symbols.js
 *
 * Repository-wide symbol index.
 */

export class SymbolIndex {
    constructor() {
        this.clear();
    }

    clear() {
        this.byId = new Map();
        this.byName = new Map();
        this.byFile = new Map();
        this.byKind = new Map();
    }

    /**
     * Add a single symbol.
     */
    add(symbol) {
        if (!symbol) {
            return;
        }

        // ------------------------------------------------------------------
        // ID
        // ------------------------------------------------------------------

        this.byId.set(symbol.id, symbol);

        // ------------------------------------------------------------------
        // Name
        // ------------------------------------------------------------------

        if (!this.byName.has(symbol.name)) {
            this.byName.set(symbol.name, []);
        }

        this.byName.get(symbol.name).push(symbol);

        // ------------------------------------------------------------------
        // File
        // ------------------------------------------------------------------

        if (!this.byFile.has(symbol.file)) {
            this.byFile.set(symbol.file, []);
        }

        this.byFile.get(symbol.file).push(symbol);

        // ------------------------------------------------------------------
        // Kind
        // ------------------------------------------------------------------

        if (!this.byKind.has(symbol.kind)) {
            this.byKind.set(symbol.kind, []);
        }

        this.byKind.get(symbol.kind).push(symbol);
    }

    /**
     * Index one parsed file.
     */
    addFile(parsedFile) {
        if (!parsedFile?.symbols) {
            return;
        }

        for (const symbol of parsedFile.symbols) {
            this.add(symbol);
        }
    }

    /**
     * Build the complete repository index.
     */
    build(repository) {
        this.clear();

        const files = repository.files ?? repository;

        for (const file of files) {
            this.addFile(file);
        }

        return this;
    }

    /**
     * Lookup by ID.
     */
    get(id) {
        return this.byId.get(id) ?? null;
    }

    /**
     * Find symbols by name.
     */
    find(name) {
        return this.byName.get(name) ?? [];
    }

    /**
     * Get symbols in a file.
     */
    file(path) {
        return this.byFile.get(path) ?? [];
    }

    /**
     * Get symbols by kind.
     */
    kind(kind) {
        return this.byKind.get(kind) ?? [];
    }

    /**
     * All indexed symbols.
     */
    values() {
        return [...this.byId.values()];
    }

    /**
     * Repository statistics.
     */
    stats() {
        return {
            total: this.byId.size,
            names: this.byName.size,
            files: this.byFile.size,
            kinds: this.byKind.size,
        };
    }
}

/**
 * Convenience helper.
 */
export function buildSymbolIndex(repository) {
    return new SymbolIndex().build(repository);
}