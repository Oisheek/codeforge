/**
 * Tree-sitter queries for Java.
 *
 * Stable capture namespaces:
 *
 *  @symbol.class
 *  @symbol.interface
 *  @symbol.enum
 *  @symbol.record
 *  @symbol.constructor
 *  @symbol.method
 *  @symbol.field
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
;; Classes
;; ============================================================

(class_declaration
  name: (identifier) @symbol.class)

;; ============================================================
;; Interfaces
;; ============================================================

(interface_declaration
  name: (identifier) @symbol.interface)

;; ============================================================
;; Enums
;; ============================================================

(enum_declaration
  name: (identifier) @symbol.enum)

;; ============================================================
;; Records (Java 16+)
;; ============================================================

(record_declaration
  name: (identifier) @symbol.record)

;; ============================================================
;; Constructors
;; ============================================================

(constructor_declaration
  name: (identifier) @symbol.constructor)

;; ============================================================
;; Methods
;; ============================================================

(method_declaration
  name: (identifier) @symbol.method)

;; ============================================================
;; Fields
;; ============================================================

(field_declaration
  declarator:
    (variable_declarator
      name: (identifier) @symbol.field))

;; ============================================================
;; Local Variables
;; ============================================================

(local_variable_declaration
  declarator:
    (variable_declarator
      name: (identifier) @symbol.variable))
`;

export const IMPORTS = `
(import_declaration) @import
`;

export const EXPORTS = `
`;

export const CALLS = `
;; foo()

(method_invocation
  name: (identifier) @call)

;; obj.foo()

(method_invocation
  object: (_)
  name: (identifier) @call)

;; this.foo()

(method_invocation
  object: (this)
  name: (identifier) @call)

;; super.foo()

(method_invocation
  object: (super)
  name: (identifier) @call)
`;

export const COMMENTS = `
(line_comment) @comment

(block_comment) @comment
`;

export const TODOS = `
(line_comment) @todo
(#match? @todo "(?i)(TODO|FIXME|BUG|HACK|XXX|NOTE)")

(block_comment) @todo
(#match? @todo "(?i)(TODO|FIXME|BUG|HACK|XXX|NOTE)")
`;