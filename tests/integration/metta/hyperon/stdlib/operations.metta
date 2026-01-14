; Standard Library Tests
; Tests for stdlib operations

; Test: cons-atom constructs list
!(cons-atom 1 ())
; Expected: (1)

; Test: car-atom gets first element
!(car-atom (+ 1 2))
; Expected: +

; Test: cdr-atom gets tail
!(cdr-atom (+ 1 2))
; Expected: (1 2)

; Test: size-atom counts elements
!(size-atom (+ 1 2))
; Expected: 3

; Test: Math sqrt
!(sqrt-math 16)
; Expected: 4

; Test: Math abs
!(abs-math -5)
; Expected: 5

; Test: Math floor
!(floor-math 3.7)
; Expected: 3

; Test: Math ceil
!(ceil-math 3.2)
; Expected: 4

; Test: Set unique-atom
!(unique-atom (: 1 (: 2 (: 1 (: 3 ())))))
; Expected: (1 2 3)

; Test: Set union-atom
!(union-atom (: 1 (: 2 ())) (: 3 (: 4 ())))
; Expected: (1 2 3 4)

; Test: Get metatype of symbol
!(get-metatype foo)
; Expected: Symbol

; Test: Get metatype of variable
!(get-metatype $x)
; Expected: Variable

; Test: Get metatype of expression
!(get-metatype (+ 1 2))
; Expected: Expression

