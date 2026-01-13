
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

; Negation: ~A
; f = 1 - f
; c = c (unchanged)
(= (truth-neg ($f $c))
   ((&- 1 $f) $c))

; Revision: Combine two beliefs about same statement
; f = (f1*c1 + f2*c2) / (c1 + c2)
; c = c1 + c2 (clamped to 1)
(= (truth-rev ($f1 $c1) ($f2 $c2))
   (let $sum (&+ $c1 $c2)
     ((&/ (&+ (&* $f1 $c1) (&* $f2 $c2)) $sum) (&truth-clamp $sum))))

; Helper: clamp value to [0,1]
(= (&truth-clamp $x)
   (&if (&> $x 1) 1 $x))

; Conversion: Weak inverse
; f = f
; c = f * c
(= (truth-conv ($f $c))
   ($f (&* $f $c)))

; Expectation: Single value measure
; exp = f * c
(= (truth-exp ($f $c))
   (&* $f $c))

; Analogy: Similarity-based inference
; f = f1 * f2
; c = c1 * c2 * f2
(= (truth-analogy ($f1 $c1) ($f2 $c2))
   ((&* $f1 $f2) (&* (&* $c1 $c2) $f2)))

; Resemblance: Symmetric similarity
; f = (f1 + f2) / 2
; c = c1 * c2
(= (truth-resemblance ($f1 $c1) ($f2 $c2))
   ((&/ (&+ $f1 $f2) 2) (&* $c1 $c2)))

; Contraposition: A->B to ~B->~A
; f = (f2 * (1-f1)) / (f2*(1-f1) + (1-f2)*f1)
; c = c1 * c2
(= (truth-contraposition ($f1 $c1) ($f2 $c2))
   (let $num (&* $f2 (&- 1 $f1))
     (let $denom (&+ $num (&* (&- 1 $f2) $f1))
       ((&/ $num $denom) (&* $c1 $c2)))))

; Intersection: A∩B
; f = f1 * f2
; c = c1 * c2
(= (truth-intersection ($f1 $c1) ($f2 $c2))
   ((&* $f1 $f2) (&* $c1 $c2)))

; Union: A∪B
; f = 1 - (1-f1)*(1-f2)
; c = c1 * c2
(= (truth-union ($f1 $c1) ($f2 $c2))
   ((&- 1 (&* (&- 1 $f1) (&- 1 $f2))) (&* $c1 $c2)))

