; Basic MeTTa Syntax Tests
; These tests validate basic syntax and evaluation

; Test: Simple symbol evaluation
!(42)
; Expected: (42)

; Test: Basic arithmetic addition
!(+ 2 3)
; Expected: 5

; Test: Basic arithmetic multiplication
!(* 4 5)
; Expected: 20

; Test: Nested arithmetic
!(+ (* 2 3) 4)
; Expected: 10

; Test: Variable binding with let
!(let $x 5 $x)
; Expected: 5

; Test: Variable substitution in expression
!(let $x 3 (+ $x 2))
; Expected: 5

; Test: Boolean true
!(True)
; Expected: (True)

; Test: Boolean false
!(False)
; Expected: (False)

; Test: Conditional if-then-else (true case)
!(if True 10 20)
; Expected: 10

; Test: Conditional if-then-else (false case)
!(if False 10 20)
; Expected: 20

; Test: Equality comparison (equal)
!(== 5 5)
; Expected: True

; Test: Equality comparison (not equal)
!(== 5 6)
; Expected: False

; Test: Less than comparison
!(< 3 5)
; Expected: True

; Test: Greater than comparison
!(> 7 4)
; Expected: True

; Test: Empty list
!(())
; Expected: (())

