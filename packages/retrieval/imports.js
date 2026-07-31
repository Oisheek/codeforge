/**
 * packages/retrieval/imports.js
 *
 * Repository-wide import index.
 */

export class ImportIndex {
    constructor() {
        this.clear();
    }

    clear() {
        this.byFile = new Map();
        this.bySource = new Map();
    }

    add(file, imp) {
        if (!this.byFile.has(file)) {
            this.byFile.set(file, []);
        }

        this.byFile.get(file).push(imp);

        if (!this.bySource.has(imp.source)) {
            this.bySource.set(imp.source, []);
        }

        this.bySource.get(imp.source).push({
            file,
            import: imp,
        });
    }

    addFile(parsedFile) {
        if (!parsedFile?.imports) {
            return;
        }

        for (const imp of parsedFile.imports) {
            this.add(parsedFile.path, imp);
        }
    }

    build(repository) {
        this.clear();

        const files = repository.files ?? repository;

        for (const file of files) {
            this.addFile(file);
        }

        return this;
    }

    file(path) {
        return this.byFile.get(path) ?? [];
    }

    source(module) {
        return this.bySource.get(module) ?? [];
    }

    stats() {
        return {
            files: this.byFile.size,
            modules: this.bySource.size,
        };
    }
}

export function buildImportIndex(repository) {
    return new ImportIndex().build(repository);
}