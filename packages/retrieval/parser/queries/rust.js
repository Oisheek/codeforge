/**
 * Tree-sitter queries for Rust.
 *
 * Stable capture namespaces:
 *
 *  @symbol.module
 *  @symbol.struct
 *  @symbol.enum
 *  @symbol.union
 *  @symbol.trait
 *  @symbol.impl
 *  @symbol.function
 *  @symbol.method
 *  @symbol.constant
 *  @symbol.static
 *  @symbol.type
 *  @symbol.variable
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
;; Modules
;; ============================================================

(mod_item
  name: (identifier) @symbol.module)

;; ============================================================
;; Structs
;; ============================================================

(struct_item
  name: (type_identifier) @symbol.struct)

;; ============================================================
;; Enums
;; ============================================================

(enum_item
  name: (type_identifier) @symbol.enum)

;; ============================================================
;; Unions
;; ============================================================

(union_item
  name: (type_identifier) @symbol.union)

;; ============================================================
;; Traits
;; ============================================================

(trait_item
  name: (type_identifier) @symbol.trait)

;; ============================================================
;; Impl blocks
;; ============================================================

(impl_item
  type: (type_identifier) @symbol.impl)

;; ============================================================
;; Functions
;; ============================================================

(function_item
  name: (identifier) @symbol.function)

;; ============================================================
;; Methods
;; ============================================================

(function_item
  name: (identifier) @symbol.method
  (#has-ancestor? impl_item))

;; ============================================================
;; Type aliases
;; ============================================================

(type_item
  name: (type_identifier) @symbol.type)

;; ============================================================
;; Constants
;; ============================================================

(const_item
  name: (identifier) @symbol.constant)

;; ============================================================
;; Static variables
;; ============================================================

(static_item
  name: (identifier) @symbol.static)

;; ============================================================
;; Macros
;; ============================================================

(macro_definition
  name: (identifier) @symbol.macro)

(let_declaration
  pattern: (identifier) @symbol.variable)
`;

export const IMPORTS = `
(use_declaration) @import
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
;; module::foo()
;; Type::new()
;; ============================================================

(call_expression
  function:
    (scoped_identifier
      name: (identifier) @call))

;; ============================================================
;; obj.foo()
;; ============================================================

(call_expression
  function:
    (field_expression
      field: (field_identifier) @call))

;; ============================================================
;; Macros
;; println!()
;; vec!()
;; serde_json!()
;; ============================================================

(macro_invocation
  macro:
    (identifier) @call)
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