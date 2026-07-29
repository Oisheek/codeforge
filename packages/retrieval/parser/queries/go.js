/**
 * Tree-sitter queries for Go.
 *
 * Stable capture namespaces:
 *
 *  @symbol.package
 *  @symbol.struct
 *  @symbol.interface
 *  @symbol.function
 *  @symbol.method
 *  @symbol.type
 *  @symbol.variable
 *  @symbol.constant
 *
 *  @import
 *  @export
 *  @call
 *  @comment
 *  @todo
 */

export const SYMBOLS = `
;; ============================================================
;; Package
;; ============================================================

(package_clause
  (package_identifier) @symbol.package)

;; ============================================================
;; Structs
;; ============================================================

(type_declaration
  (type_spec
    name: (type_identifier) @symbol.struct
    type: (struct_type)))

;; ============================================================
;; Interfaces
;; ============================================================

(type_declaration
  (type_spec
    name: (type_identifier) @symbol.interface
    type: (interface_type)))

;; ============================================================
;; Type aliases
;; ============================================================

(type_declaration
  (type_spec
    name: (type_identifier) @symbol.type))

;; ============================================================
;; Functions
;; ============================================================

(function_declaration
  name: (identifier) @symbol.function)

;; ============================================================
;; Methods
;; ============================================================

(method_declaration
  name: (field_identifier) @symbol.method)

;; ============================================================
;; Variables
;; ============================================================

(var_declaration
  (var_spec
    name: (identifier) @symbol.variable))

(short_var_declaration
  left: (expression_list
    (identifier) @symbol.variable))

;; ============================================================
;; Constants
;; ============================================================

(const_declaration
  (const_spec
    name: (identifier) @symbol.constant))
`;

export const IMPORTS = `
(import_declaration) @import
`;

export const EXPORTS = `
`;

export const CALLS = `
;; ============================================================
;; foo()
;; ============================================================

(call_expression
  function: (identifier) @call)

;; ============================================================
;; pkg.Func()
;; obj.Method()
;; ============================================================

(call_expression
  function:
    (selector_expression
      field: (field_identifier) @call))
`;

export const COMMENTS = `
(comment) @comment
`;

export const TODOS = `
(comment) @todo
(#match? @todo "(?i)(TODO|FIXME|BUG|HACK|XXX|NOTE)")
`;