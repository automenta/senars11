
; nal.metta - Non-Axiomatic Logic Rules

; Deduction Rule
; Deduction Rule
; (Inh S M (f1 c1)) + (Inh M P (f2 c2)) -> (Inh S P (f c))
(= (deduce (Inh $s $m $tv1) (Inh $m $p $tv2))
   (Inh $s $p (truth-ded $tv1 $tv2)))

; Induction Rule
; (Inh S M (f1 c1)) + (Inh P M (f2 c2)) -> (Inh S P (truth-ind $tv1 $tv2))
(= (induce (Inh $s $m $tv1) (Inh $p $m $tv2))
   (Inh $s $p (truth-ind $tv1 $tv2)))

; Abduction Rule
; (Inh M S (f1 c1)) + (Inh M P (f2 c2)) -> (Inh S P (truth-abd $tv1 $tv2))
(= (abduce (Inh $m $s $tv1) (Inh $m $p $tv2))
   (Inh $s $p (truth-abd $tv1 $tv2)))

; Comparison Rule
; (Inh M S (f1 c1)) + (Inh M P (f2 c2)) -> (Sim S P (truth-comp $tv1 $tv2))
(= (compare (Inh $m $s $tv1) (Inh $m $p $tv2))
   (Sim $s $p (truth-comp $tv1 $tv2)))

; Backward inference / Query
; If we want to find (Inh S P), we can look for M s.t. (Inh S M) and (Inh M P) exists.
(= (query-derive (Inh $s $p))
   (match &self (Inh $s $m $tv1)
     (match &self (Inh $m $p $tv2)
        (deduce (Inh $s $m $tv1) (Inh $m $p $tv2)))))

