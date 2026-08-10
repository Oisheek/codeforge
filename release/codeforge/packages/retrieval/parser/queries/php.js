/**
 * Tree-sitter queries for PHP.
 *
 * Stable capture namespaces:
 *
 *  @symbol.namespace
 *  @symbol.class
 *  @symbol.interface
 *  @symbol.trait
 *  @symbol.enum
 *  @symbol.function
 *  @symbol.method
 *  @symbol.property
 *  @symbol.constant
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

(namespace_definition
  name: (namespace_name) @symbol.namespace)

;; ============================================================
;; Classes
;; ============================================================

(class_declaration
  name: (name) @symbol.class)

;; ============================================================
;; Interfaces
;; ============================================================

(interface_declaration
  name: (name) @symbol.interface)

;; ============================================================
;; Traits
;; ============================================================

(trait_declaration
  name: (name) @symbol.trait)

;; ============================================================
;; Enums (PHP 8.1+)
;; ============================================================

(enum_declaration
  name: (name) @symbol.enum)

;; ============================================================
;; Functions
;; ============================================================

(function_definition
  name: (name) @symbol.function)

;; ============================================================
;; Methods
;; ============================================================

(method_declaration
  name: (name) @symbol.method)

;; ============================================================
;; Properties
;; ============================================================

(property_declaration
  (property_element
    (variable_name) @symbol.property))

;; ============================================================
;; Constants
;; ============================================================

(const_declaration
  (const_element
    (name) @symbol.constant))

(class_constant_declaration
  (const_element
    (name) @symbol.constant))

;; ============================================================
;; Variables
;; ============================================================

(simple_parameter
  name: (variable_name) @symbol.variable)

(assignment_expression
  left: (variable_name) @symbol.variable)
`;

export const IMPORTS = `
;; ============================================================
;; use statements
;; ============================================================

(namespace_use_declaration) @import
`;

export const EXPORTS = `
`;

export const CALLS = `
;; foo()

(function_call_expression
  function: (name) @call)

;; $obj->foo()

(member_call_expression
  name: (name) @call)

;; Foo::bar()

(scoped_call_expression
  name: (name) @call)
`;

export const COMMENTS = `
(comment) @comment
`;

export const TODOS = `
(comment) @todo
(#match? @todo "(?i)(TODO|FIXME|BUG|HACK|XXX|NOTE)")
`;