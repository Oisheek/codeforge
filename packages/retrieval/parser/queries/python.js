/**
 * Tree-sitter queries for Python.
 *
 * Stable capture namespaces:
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
;; ============================================================
;; Classes
;; ============================================================

(class_definition
  name: (identifier) @symbol.class)

;; ============================================================
;; Functions
;; ============================================================

(function_definition
  name: (identifier) @symbol.function)

;; Async functions

(function_definition
  "async"
  name: (identifier) @symbol.function)

;; ============================================================
;; Variables
;; ============================================================

(assignment
  left: (identifier) @symbol.variable)

(assignment
  left: (tuple
    (identifier) @symbol.variable))

(assignment
  left: (list
    (identifier) @symbol.variable))
`;

export const IMPORTS = `
;; ============================================================
;; import os
;; import os.path
;; import numpy as np
;; ============================================================

(import_statement) @import

;; ============================================================
;; from pathlib import Path
;; from .foo import bar
;; from . import utils
;; ============================================================

(import_from_statement) @import
`;

export const EXPORTS = `
`;

export const CALLS = `
;; ============================================================
;; foo()
;; ============================================================

(call
  function: (identifier) @call)

;; ============================================================
;; obj.foo()
;; module.func()
;; super().foo()
;; ============================================================

(call
  function:
    (attribute
      attribute: (identifier) @call))

;; ============================================================
;; callable(...)
;; ============================================================

(call
  function: (_) @call)
`;

export const COMMENTS = `
(comment) @comment
`;

export const TODOS = `
(comment) @todo
(#match? @todo "(?i)(TODO|FIXME|BUG|HACK|XXX|NOTE)")
`;