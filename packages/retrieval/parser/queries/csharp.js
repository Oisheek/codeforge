/**
 * Tree-sitter queries for C#.
 *
 * Stable capture namespaces:
 *
 *  @symbol.namespace
 *  @symbol.class
 *  @symbol.struct
 *  @symbol.interface
 *  @symbol.enum
 *  @symbol.record
 *  @symbol.delegate
 *  @symbol.constructor
 *  @symbol.method
 *  @symbol.property
 *  @symbol.field
 *  @symbol.event
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
;; Namespace
;; ============================================================

(namespace_declaration
  name: (qualified_name) @symbol.namespace)

(file_scoped_namespace_declaration
  name: (qualified_name) @symbol.namespace)

;; ============================================================
;; Classes
;; ============================================================

(class_declaration
  name: (identifier) @symbol.class)

;; ============================================================
;; Structs
;; ============================================================

(struct_declaration
  name: (identifier) @symbol.struct)

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
;; Records
;; ============================================================

(record_declaration
  name: (identifier) @symbol.record)

;; ============================================================
;; Delegates
;; ============================================================

(delegate_declaration
  name: (identifier) @symbol.delegate)

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
;; Properties
;; ============================================================

(property_declaration
  name: (identifier) @symbol.property)

;; ============================================================
;; Fields
;; ============================================================

(field_declaration
  (variable_declaration
    (variable_declarator
      name: (identifier) @symbol.field)))

;; ============================================================
;; Events
;; ============================================================

(event_declaration
  name: (identifier) @symbol.event)

;; ============================================================
;; Local Variables
;; ============================================================

(local_declaration_statement
  (variable_declaration
    (variable_declarator
      name: (identifier) @symbol.variable)))
`;

export const IMPORTS = `
(using_directive) @import
`;

export const EXPORTS = `
`;

export const CALLS = `
(invocation_expression
  function: (identifier) @call)

(invocation_expression
  function:
    (member_access_expression
      name: (identifier) @call))
`;

export const COMMENTS = `
(comment) @comment
`;

export const TODOS = `
(comment) @todo
(#match? @todo "(?i)(TODO|FIXME|BUG|HACK|XXX|NOTE)")
`;