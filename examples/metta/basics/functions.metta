
; functions.metta - Functional programming

; Basic lambda
!((λ $x (* $x 2)) 5)

; Let binding
!(let $x 10
   (let $y 20
     (+ $x $y)))

; Closure / Currying (simulated)
(= (add-n $n) (λ $x (+ $x $n)))
!((add-n 5) 10)

; Higher-order function
(= (apply-twice $f $x) ($f ($f $x)))
!(apply-twice (λ $y (* $y 2)) 3)
