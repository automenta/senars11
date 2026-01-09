; MeTTa Standard Library - Match Module
; Non-deterministic pattern matching
; ~40 LOC

; ===== Pattern Matching =====

; match: pattern matching against space
; (match $space $pattern $template)
; Returns: all instances where $pattern matches atoms in $space,
;          with $template instantiated by the bindings

; Basic match - uses kernel unification
; This delegates to the kernel's Unify module and MatchEngine
(= (match $space $pattern $template)
   (let $atoms (get-atoms $space)
      (match-against $atoms $pattern $template)))

; Helper: match pattern against list of atoms
(= (match-against () $pattern $template) ())
(= (match-against (: $atom $rest) $pattern $template)
   (let $bindings (unify $pattern $atom)
      (if (ok? $bindings)
          (: (subst $template $bindings) (match-against $rest $pattern $template))
          (match-against $rest $pattern $template))))

; ===== Unification Wrappers =====

; unify: expose kernel unification
; (unify $pattern $term) → bindings map or failure
; This is typically a grounded operation implemented in kernel/Unify.js

; subst: expose kernel substitution
; (subst $template $bindings) → instantiated term
; This is typically a grounded operation implemented in kernel/Unify.js

; ===== Match Utilities =====

; match-first: return only first match
(= (match-first $space $pattern $template)
   (car (match $space $pattern $template)))

; match-all: return all matches (alias)
(= (match-all $space $pattern $template)
   (match $space $pattern $template))

; match-count: count number of matches
(= (match-count $space $pattern)
   (length (match $space $pattern $pattern)))

; exists?: check if pattern has any matches
(= (exists? $space $pattern)
   (not (empty? (match $space $pattern $pattern))))

; ===== Advanced Matching =====

; match-where: match with additional constraint
; (match-where $space $pattern $constraint $template)
(= (match-where $space $pattern $constraint $template)
   (filter (λ $x $constraint)
           (match $space $pattern $template)))

; match-bind: match and bind to variable
; (match-bind $var $space $pattern $body)
(= (match-bind $var $space $pattern $body)
   (map (λ $var $body) (match $space $pattern $pattern)))
