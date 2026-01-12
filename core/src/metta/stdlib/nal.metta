
; nal.metta - Non-Axiomatic Logic Rules

; Deduction Rule
; (Inh S M (f1 c1)) + (Inh M P (f2 c2)) -> (Inh S P (f c))
(= (deduce (Inh $s $m $tv1) (Inh $m $p $tv2))
   (Inh $s $p (truth-ded $tv1 $tv2)))

; Backward inference / Query
; If we want to find (Inh S P), we can look for M s.t. (Inh S M) and (Inh M P) exists.
(= (query-derive (Inh $s $p))
   (match &self (Inh $s $m $tv1)
     (match &self (Inh $m $p $tv2)
        (deduce (Inh $s $m $tv1) (Inh $m $p $tv2)))))
