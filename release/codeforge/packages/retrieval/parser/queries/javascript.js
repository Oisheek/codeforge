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
  value: (function_expression))

;; ------------------------------------------------------------
;; Variables
;; ------------------------------------------------------------

(variable_declarator
  name: (identifier) @symbol.variable)
`;

export const IMPORTS = `
;; ES modules

(import_statement) @import

;; require(...)

(call_expression
  function: (identifier) @_require
  (#eq? @_require "require"))
@import
`;

export const EXPORTS = `
;; ------------------------------------------------------------
;; ES module declaration exports
;; ------------------------------------------------------------

(export_statement
  declaration:
    (function_declaration
      name: (identifier) @export.named))

(export_statement
  declaration:
    (generator_function_declaration
      name: (identifier) @export.named))

(export_statement
  declaration:
    (class_declaration
      name: (identifier) @export.named))

(export_statement
  declaration:
    (lexical_declaration
      (variable_declarator
        name: (identifier) @export.named)))

;; ------------------------------------------------------------
;; ES module named exports
;;
;; export { foo };
;; export { foo as bar };
;; export { foo } from "./module.js";
;; ------------------------------------------------------------

(export_statement
  (export_clause
    (export_specifier
      alias: (identifier) @export.named)))

(export_statement
  (export_clause
    (export_specifier
      name: (identifier) @export.named)))

;; ------------------------------------------------------------
;; Default exports with named declarations
;;
;; export default function foo() {}
;; export default class Foo {}
;; ------------------------------------------------------------

(export_statement
  declaration:
    (function_declaration
      name: (identifier) @export.default))

(export_statement
  declaration:
    (class_declaration
      name: (identifier) @export.default))

;; ------------------------------------------------------------
;; CommonJS: module.exports = ...
;;
;; Store "exports" as the export marker instead of capturing
;; the complete assignment expression.
;; ------------------------------------------------------------

(assignment_expression
  left:
    (member_expression
      object: (identifier) @_module
      property: (property_identifier) @export.commonjs)
  (#eq? @_module "module")
  (#eq? @export.commonjs "exports"))

;; ------------------------------------------------------------
;; CommonJS: exports.foo = ...
;; ------------------------------------------------------------

(assignment_expression
  left:
    (member_expression
      object: (identifier) @_exports
      property: (property_identifier) @export.commonjs)
  (#eq? @_exports "exports"))
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