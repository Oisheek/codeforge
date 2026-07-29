/**
 * Repository dependency graph.
 */
export class RepositoryGraph {
    constructor() {
        this.files = new Map();
        this.symbols = new Map();
        this.imports = new Map();
        this.reverseImports = new Map();
    }

    addFile(parsedFile) {
        this.files.set(parsedFile.path, parsedFile);

        // Symbol index
        for (const symbol of parsedFile.symbols ?? []) {
            if (!this.symbols.has(symbol.name)) {
                this.symbols.set(symbol.name, []);
            }

            this.symbols.get(symbol.name).push({
                file: parsedFile.path,
                symbol,
            });
        }

        // Import graph
        const deps = new Set();

        for (const imp of parsedFile.imports ?? []) {
            deps.add(imp.source);

            if (!this.reverseImports.has(imp.source)) {
                this.reverseImports.set(imp.source, new Set());
            }

            this.reverseImports
                .get(imp.source)
                .add(parsedFile.path);
        }

        this.imports.set(parsedFile.path, deps);
    }

    getFile(path) {
        return this.files.get(path) ?? null;
    }

    getFiles() {
        return [...this.files.values()];
    }

    getDependencies(path) {
        return [...(this.imports.get(path) ?? [])];
    }

    getDependents(module) {
        return [...(this.reverseImports.get(module) ?? [])];
    }

    findSymbol(name) {
        return this.symbols.get(name) ?? [];
    }

    hasFile(path) {
        return this.files.has(path);
    }

    fileCount() {
        return this.files.size;
    }

    symbolCount() {
        let count = 0;

        for (const list of this.symbols.values()) {
            count += list.length;
        }

        return count;
    }

    clear() {
        this.files.clear();
        this.symbols.clear();
        this.imports.clear();
        this.reverseImports.clear();
    }
}