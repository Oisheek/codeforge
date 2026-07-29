/**
 * Tree-sitter queries for JavaScript.
 *
 * Every capture uses a stable namespace:
 *
 *  @symbol.class
 *  @symbol.function
 *  @symbol.method
 *  @symbol.variable
 *
 *  @import
 *  @export
 *  @call
 *  @comment
 *  @todo
 */

export const SYMBOLS = `
;; ------------------------------------------------------------
;; Classes
;; ------------------------------------------------------------

(class_declaration
  name: (identifier) @symbol.class)

;; ------------------------------------------------------------
;; Functions
;; ------------------------------------------------------------

(function_declaration
  name: (identifier) @symbol.function)

(generator_function_declaration
  name: (identifier) @symbol.function)

;; ------------------------------------------------------------
;; Methods
;; ------------------------------------------------------------

(method_definition
  name: (property_identifier) @symbol.method)

;; ------------------------------------------------------------
;; Arrow functions
;; ------------------------------------------------------------

(variable_declarator
  name: (identifier) @symbol.function
  value: (arrow_function))

(variable_declarator
  name: (identifier) @symbol.function
  value: (function))

;; ------------------------------------------------------------
;; Variables
;; ------------------------------------------------------------

(variable_declarator
  name: (identifier) @symbol.variable)
`;

export const IMPORTS = `
;; ES Module

(import_statement) @import

;; require(...)

(call_expression
  function: (identifier) @_require
  (#eq? @_require "require"))
@import

;; dynamic import()

(import_expression) @import
`;

export const EXPORTS = `
;; export ...

(export_statement) @export

;; export default ...

(export_default_declaration) @export

;; module.exports = ...

(assignment_expression
  left:
    (member_expression
      object: (identifier) @_module
      property: (property_identifier) @_exports)
  (#eq? @_module "module")
  (#eq? @_exports "exports"))
@export

;; exports.foo = ...

(assignment_expression
  left:
    (member_expression
      object: (identifier) @_exports)
  (#eq? @_exports "exports"))
@export
`;

export const CALLS = `
(call_expression
  function: (identifier) @call)

(call_expression
  function:
    (member_expression
      property: (property_identifier) @call))
`;

export const COMMENTS = `
(comment) @comment
`;

export const TODOS = `
(comment) @todo
(#match? @todo "(TODO|FIXME|BUG|HACK|XXX|NOTE)")
`;