/**
 * Tree-sitter queries for JavaScript.
 *
 * Stable capture namespaces:
 *
 *  @symbol.class
 *  @symbol.function
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
;; Functions
;; ============================================================

(function_declaration
  name: (identifier) @symbol.function)

(generator_function_declaration
  name: (identifier) @symbol.function)

;; Arrow functions

(variable_declarator
  name: (identifier) @symbol.function
  value: (arrow_function))

;; Function expressions

(variable_declarator
  name: (identifier) @symbol.function
  value: (function))

;; ============================================================
;; Methods
;; ============================================================

(method_definition
  name: (property_identifier) @symbol.method)

;; ============================================================
;; Class fields (modern JavaScript)
;; ============================================================

(public_field_definition
  name: (property_identifier) @symbol.field)

;; ============================================================
;; Variables
;; ============================================================

(variable_declarator
  name: (identifier) @symbol.variable)
`;

export const IMPORTS = `
;; ============================================================
;; ES Modules
;; ============================================================

(import_statement) @import

;; ============================================================
;; require(...)
;; ============================================================

(call_expression
  function: (identifier) @_require
  (#eq? @_require "require"))
@import

;; ============================================================
;; Dynamic import(...)
;; ============================================================

(import_expression) @import
`;

export const EXPORTS = `
;; ============================================================
;; export ...
;; ============================================================

(export_statement) @export

(export_default_declaration) @export

(export_clause) @export

(export_specifier) @export

(export_all_declaration) @export

;; ============================================================
;; module.exports = ...
;; ============================================================

(assignment_expression
  left:
    (member_expression
      object: (identifier) @_module
      property: (property_identifier) @_exports)
  (#eq? @_module "module")
  (#eq? @_exports "exports"))
@export

;; ============================================================
;; exports.foo = ...
;; ============================================================

(assignment_expression
  left:
    (member_expression
      object: (identifier) @_exports)
  (#eq? @_exports "exports"))
@export
`;

export const CALLS = `
;; foo()

(call_expression
  function: (identifier) @call)

;; obj.foo()

(call_expression
  function:
    (member_expression
      property: (property_identifier) @call))

;; obj["foo"]()

(call_expression
  function:
    (subscript_expression) @call)

;; obj?.foo()

(optional_call_expression
  function:
    (member_expression
      property: (property_identifier) @call))
`;

export const COMMENTS = `
(comment) @comment
`;

export const TODOS = `
(comment) @todo
(#match? @todo "(?i)(TODO|FIXME|BUG|HACK|XXX|NOTE)")
`;