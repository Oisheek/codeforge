/**
 * Tree-sitter queries for C++.
 *
 * Stable capture namespaces:
 *
 *  @symbol.namespace
 *  @symbol.class
 *  @symbol.struct
 *  @symbol.union
 *  @symbol.enum
 *  @symbol.typedef
 *  @symbol.alias
 *  @symbol.template
 *  @symbol.function
 *  @symbol.constructor
 *  @symbol.destructor
 *  @symbol.method
 *  @symbol.operator
 *  @symbol.field
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
;; Namespaces
;; ============================================================

(namespace_definition
  name: (namespace_identifier) @symbol.namespace)

;; ============================================================
;; Classes
;; ============================================================

(class_specifier
  name: (type_identifier) @symbol.class)

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
  declarator: (_) @symbol.typedef)

;; ============================================================
;; Using aliases
;; ============================================================

(alias_declaration
  name: (type_identifier) @symbol.alias)

;; ============================================================
;; Templates
;; ============================================================

(template_declaration
  declaration: (_) @symbol.template)

;; ============================================================
;; Constructors
;; ============================================================

(function_definition
  declarator:
    (function_declarator
      declarator: (identifier) @symbol.constructor)
  (#match? @symbol.constructor "^[A-Z]"))

;; ============================================================
;; Destructors
;; ============================================================

(function_definition
  declarator:
    (function_declarator
      declarator: (destructor_name) @symbol.destructor))

;; ============================================================
;; Functions
;; ============================================================

(function_definition
  declarator:
    (function_declarator
      declarator: (identifier) @symbol.function))

;; ============================================================
;; Methods
;; ============================================================

(field_declaration
  declarator:
    (function_declarator
      declarator: (field_identifier) @symbol.method))

;; ============================================================
;; Operator overloads
;; ============================================================

(function_definition
  declarator:
    (function_declarator
      declarator: (operator_name) @symbol.operator))

;; ============================================================
;; Fields
;; ============================================================

(field_declaration
  declarator: (_) @symbol.field)

;; ============================================================
;; Variables
;; ============================================================

(declaration
  declarator: (_) @symbol.variable)

;; ============================================================
;; Enum constants
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
(preproc_include) @import
`;

export const EXPORTS = `
`;

export const CALLS = `
;; foo()

(call_expression
  function: (identifier) @call)

;; obj.foo()

(call_expression
  function:
    (field_expression
      field: (field_identifier) @call))

;; ns::foo()

(call_expression
  function:
    (qualified_identifier
      name: (identifier) @call))

;; (*fp)()

(call_expression
  function:
    (pointer_expression) @call)
`;