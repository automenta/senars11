; MeTTa Standard Library - Core Module
; Basic control flow, binding, and lambda functions
; ~60 LOC

; ===== Conditional Branching =====

; if: conditional evaluation
; (if True $then $else) → $then
; (if False $then $else) → $else
(= (if True $then $_) $then)
(= (if False $_ $else) $else)

; ===== Variable Binding =====

; let: bind a value to a variable in a body expression
; (let $x $value $body) → evaluate $body with $x bound to $value
; Implementation: Convert to lambda application
(= (let $x $v $b) ((λ $x $b) $v))

; Sequential let bindings (let*)
; (let* (($x $v1) ($y $v2)) $body) → nested lets
(= (let* () $body) $body)
(= (let* (: ($x $v) $rest) $body)
   (let $x $v (let* $rest $body)))

; ===== Lambda (Anonymous Functions) =====

; Lambda application: ((λ $x $body) $value)
; Implementation delegated to kernel's Reduce module
; The substitution is handled by kernel/Reduce.js

; Multiple argument lambda (curried)
; (λ ($x $y) $body) → (λ $x (λ $y $body))
(= ((λ (: $x ()) $b) $v) ((λ $x $b) $v))
(= ((λ (: $x $xs) $b) $v) (λ $xs ((λ $x $b) $v)))

; ===== Sequencing =====

; Sequential evaluation - evaluate expressions in order, return last
; (seq $a $b) → evaluate $a, then return $b
(= (seq $a $b) (let $_ $a $b))

; Multiple sequence
(= (seq* $a) $a)
(= (seq* $a $b $rest) (seq $a (seq* $b $rest)))

; ===== Basic Logic =====

; Boolean constants (these are atoms, defined here for reference)
; True - boolean true
; False - boolean false

; not: logical negation
(= (not True) False)
(= (not False) True)

; and: logical conjunction
(= (and True True) True)
(= (and True False) False)
(= (and False True) False)
(= (and False False) False)

; or: logical disjunction
(= (or True $_) True)
(= (or False $x) $x)

; ===== Utility Functions =====

; identity: return the value unchanged
(= (id $x) $x)

; const: return first argument, ignore second
(= (const $x $_) $x)

; compose: function composition
; (compose $f $g $x) → ($f ($g $x))
(= (compose $f $g $x) ($f ($g $x)))
