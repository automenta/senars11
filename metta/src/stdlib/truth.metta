
; truth.metta - Truth Value Operations
; Implements NAL truth functions for frequency and confidence

; Constructor helpers
(= (Truth $f $c) ($f $c))

; Deduction: AB, BC -> AC
; f = f1 * f2
; c = c1 * c2 * f1 * f2
(= (truth-ded ($f1 $c1) ($f2 $c2))
   (let $f (&* $f1 $f2)
     (let $c (&* (&* $c1 $c2) $f)
        ((&+ $f 0) (&+ $c 0)))))

; Induction: AB, CB -> AC
; f = f1
; c = (f2 * c1 * c2) / (f2 * c1 * c2 + 1)
(= (truth-ind ($f1 $c1) ($f2 $c2))
   (let $w (&* (&* $f2 $c1) $c2)
     ($f1 (&/ $w (&+ $w 1)))))

; Abduction: BA, CA -> BC
; f = f2
; c = (f1 * c1 * c2) / (f1 * c1 * c2 + 1)
(= (truth-abd ($f1 $c1) ($f2 $c2))
   (let $w (&* (&* $f1 $c1) $c2)
     ($f2 (&/ $w (&+ $w 1)))))

; Comparison: AB, AC -> BC
; f = (f1 * f2) / (f1 + f2 - f1 * f2)
; c = (c0 * (f1 + f2 - f1 * f2)) / (c0 * (...) + 1) where c0 = c1 * c2
(= (truth-comp ($f1 $c1) ($f2 $c2))
   (let $f0 (&- (&+ $f1 $f2) (&* $f1 $f2))
     (let $c0 (&* $c1 $c2)
       (let $w (&* $c0 $f0)
         ((&/ (&* $f1 $f2) $f0) (&/ $w (&+ $w 1)))))))

