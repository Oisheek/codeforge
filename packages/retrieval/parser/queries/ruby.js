/**
 * Tree-sitter queries for Ruby.
 *
 * Stable capture namespaces:
 *
 *  @symbol.module
 *  @symbol.class
 *  @symbol.method
 *  @symbol.singleton_method
 *  @symbol.constant
 *  @symbol.variable
 *
 *  @import
 *  @export
 *  @call
 *  @comment
 *  @todo
 */

export const SYMBOLS = `
;; ============================================================
;; Modules
;; ============================================================

(module
  name: (constant) @symbol.module)

;; ============================================================
;; Classes
;; ============================================================

(class
  name: (constant) @symbol.class)

;; ============================================================
;; Instance methods
;; ============================================================

(method
  name: (identifier) @symbol.method)

;; ============================================================
;; Singleton methods
;; def self.foo
;; ============================================================

(singleton_method
  name: (identifier) @symbol.singleton_method)

;; ============================================================
;; Constants
;; ============================================================

(constant
  name: (constant) @symbol.constant)

;; ============================================================
;; Variables
;; ============================================================

(assignment
  left: (identifier) @symbol.variable)
`;

export const IMPORTS = `
;; ============================================================
;; require
;; require_relative
;; ============================================================

(call
  method: (identifier) @_require
  (#match? @_require "^(require|require_relative)$"))
@import
`;

export const EXPORTS = `
`;

export const CALLS = `
;; foo()

(call
  method: (identifier) @call)

;; obj.foo()

(call
  method: (identifier) @call)

;; Foo.bar()

(call
  receiver: (_)
  method: (identifier) @call)
`;

export const COMMENTS = `
(comment) @comment
`;

export const TODOS = `
(comment) @todo
(#match? @todo "(?i)(TODO|FIXME|BUG|HACK|XXX|NOTE)")
`;