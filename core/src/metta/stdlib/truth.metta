
; truth.metta - Truth Value Operations
; Implements NAL truth functions for frequency and confidence

; Constructor helpers
(= (Truth $f $c) ($f $c))

; Deduction: AB, BC -> AC
; f = f1 * f2
; c = c1 * c2 * f1 * f2
; We use &+ $x 0 to force evaluation of the expression result from &* before returning
(= (truth-ded ($f1 $c1) ($f2 $c2))
   (let $f (&* $f1 $f2)
     (let $c (&* (&* $c1 $c2) $f)
        ((&+ $f 0) (&+ $c 0)))))
