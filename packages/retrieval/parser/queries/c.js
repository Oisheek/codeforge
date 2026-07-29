/**
 * Tree-sitter queries for C.
 *
 * Stable capture namespaces:
 *
 *  @symbol.struct
 *  @symbol.union
 *  @symbol.enum
 *  @symbol.typedef
 *  @symbol.function
 *  @symbol.prototype
 *  @symbol.variable
 *  @symbol.constant
 *  @symbol.macro
 *
 *  @import
 *  @export
 *  @call
 *  @comment
 *  @todo
 */

export const SYMBOLS = `
;; ============================================================
;; Structs
;; ============================================================

(struct_specifier
  name: (type_identifier) @symbol.struct)

;; ============================================================
;; Unions
;; ============================================================

(union_specifier
  name: (type_identifier) @symbol.union)

;; ============================================================
;; Enums
;; ============================================================

(enum_specifier
  name: (type_identifier) @symbol.enum)

;; ============================================================
;; Typedefs
;; ============================================================

(type_definition
  declarator: (type_identifier) @symbol.typedef)

(type_definition
  declarator: (identifier) @symbol.typedef)

;; ============================================================
;; Function Definitions
;; ============================================================

(function_definition
  declarator:
    (function_declarator
      declarator: (identifier) @symbol.function))

;; ============================================================
;; Function Prototypes
;; ============================================================

(declaration
  declarator:
    (function_declarator
      declarator: (identifier) @symbol.prototype))

;; ============================================================
;; Global Variables
;; ============================================================

(declaration
  declarator:
    (init_declarator
      declarator: (identifier) @symbol.variable))

(declaration
  declarator:
    (identifier) @symbol.variable)

;; ============================================================
;; Enum Constants
;; ============================================================

(enumerator
  name: (identifier) @symbol.constant)

;; ============================================================
;; Macros
;; ============================================================

(preproc_def
  name: (identifier) @symbol.macro)

(preproc_function_def
  name: (identifier) @symbol.macro)
`;

export const IMPORTS = `
;; ============================================================
;; #include
;; ============================================================

(preproc_include) @import
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
;; ptr->foo()
;; obj.foo()
;; ============================================================

(call_expression
  function:
    (field_expression
      field: (field_identifier) @call))

;; ============================================================
;; (*fp)()
;; ============================================================

(call_expression
  function:
    (pointer_expression) @call)
`;

export const COMMENTS = `
(comment) @comment
`;

export const TODOS = `
(comment) @todo
(#match? @todo "(?i)(TODO|FIXME|BUG|HACK|XXX|NOTE)")
`;