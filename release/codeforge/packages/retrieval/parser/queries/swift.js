/**
 * Tree-sitter queries for Swift.
 *
 * Stable capture namespaces:
 *
 *  @symbol.import
 *  @symbol.class
 *  @symbol.struct
 *  @symbol.enum
 *  @symbol.protocol
 *  @symbol.extension
 *  @symbol.actor
 *  @symbol.function
 *  @symbol.initializer
 *  @symbol.deinitializer
 *  @symbol.subscript
 *  @symbol.property
 *  @symbol.variable
 *  @symbol.typealias
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
  name: (type_identifier) @symbol.class)

;; ============================================================
;; Structs
;; ============================================================

(struct_declaration
  name: (type_identifier) @symbol.struct)

;; ============================================================
;; Enums
;; ============================================================

(enum_declaration
  name: (type_identifier) @symbol.enum)

;; ============================================================
;; Protocols
;; ============================================================

(protocol_declaration
  name: (type_identifier) @symbol.protocol)

;; ============================================================
;; Extensions
;; ============================================================

(extension_declaration
  type: (type_identifier) @symbol.extension)

;; ============================================================
;; Actors
;; ============================================================

(actor_declaration
  name: (type_identifier) @symbol.actor)

;; ============================================================
;; Typealiases
;; ============================================================

(typealias_declaration
  name: (type_identifier) @symbol.typealias)

;; ============================================================
;; Functions
;; ============================================================

(function_declaration
  name: (simple_identifier) @symbol.function)

;; ============================================================
;; Initializers
;; ============================================================

(initializer_declaration) @symbol.initializer

;; ============================================================
;; Deinitializers
;; ============================================================

(deinitializer_declaration) @symbol.deinitializer

;; ============================================================
;; Subscripts
;; ============================================================

(subscript_declaration) @symbol.subscript

;; ============================================================
;; Properties
;; ============================================================

(property_declaration
  (pattern
    (identifier) @symbol.property))

;; ============================================================
;; Variables
;; ============================================================

(variable_declaration
  (pattern
    (identifier) @symbol.variable))
`;

export const IMPORTS = `
(import_declaration) @import
`;

export const EXPORTS = `
`;

export const COMMENTS = `
(comment) @comment
`;

export const TODOS = `
(comment) @todo
(#match? @todo "(?i)(TODO|FIXME|BUG|HACK|XXX|NOTE)")
`;