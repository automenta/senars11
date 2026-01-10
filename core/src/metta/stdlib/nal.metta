; ============================================================================
; nal.metta - NAL Inference Rules
; ============================================================================
; Implements Non-Axiomatic Logic inference rules with truth value propagation.
; Based on NARS inference semantics.
; ============================================================================

; -----------------------------------------------------------------------------
; NAL-1: Inheritance Rules
; -----------------------------------------------------------------------------

; Deduction: (S→M), (M→P) |- (S→P)
; Truth: F_ded = f1 * f2, C_ded = c1 * c2
(= (ded (Inh $s $m $t1) (Inh $m $p $t2))
   (Inh $s $p (truth-ded $t1 $t2)))

; Handle statements without explicit truth values
(= (ded (Inh $s $m) (Inh $m $p))
   (Inh $s $p (truth-ded (tv-of (Inh $s $m)) (tv-of (Inh $m $p)))))

; Induction: (S→M), (P→M) |- (S→P)
; Truth: F_ind = f2, C_ind = c1 * c2
(= (ind (Inh $s $m $t1) (Inh $p $m $t2))
   (Inh $s $p (truth-ind $t1 $t2)))

(= (ind (Inh $s $m) (Inh $p $m))
   (Inh $s $p (truth-ind (tv-of (Inh $s $m)) (tv-of (Inh $p $m)))))

; Abduction: (M→P), (M→S) |- (S→P)  
; Truth: F_abd = f1, C_abd = min(c1 * c2, c2)
(= (abd (Inh $m $p $t1) (Inh $m $s $t2))
   (Inh $s $p (truth-abd $t1 $t2)))

(= (abd (Inh $m $p) (Inh $m $s))
   (Inh $s $p (truth-abd (tv-of (Inh $m $p)) (tv-of (Inh $m $s)))))

; Exemplification: specific to general
(= (exemplify (Inh $s $m $t1) (Inh $s $p $t2))
   (Inh $m $p (truth-ind $t2 $t1)))

; -----------------------------------------------------------------------------
; NAL-2: Similarity Rules
; -----------------------------------------------------------------------------

; Similarity is symmetric
(= (sym-sim (Sim $s $p $tv))
   (Sim $p $s $tv))

; Similarity from bidirectional inheritance
(= (sim-from-inh (Inh $s $p $t1) (Inh $p $s $t2))
   (Sim $s $p (truth-int $t1 $t2)))

; Comparison: derive similarity from common predicate
(= (compare (Inh $s $m $t1) (Inh $p $m $t2))
   (Sim $s $p (truth-comp $t1 $t2)))

; Analogy: (S→M), (M↔P) |- (S→P)
(= (analogy (Inh $s $m $t1) (Sim $m $p $t2))
   (Inh $s $p (truth-ana $t1 $t2)))

; -----------------------------------------------------------------------------
; NAL-5: Higher-Order Rules
; -----------------------------------------------------------------------------

; Negation
(= (negate (Inh $s $p $tv))
   (Inh $s $p (truth-neg $tv)))

; Contraposition: (A→B) |- (¬B→¬A)
(= (contrapose (Inh $s $p $tv))
   (Inh (neg $p) (neg $s) $tv))

; Conversion: weak inference (A→B) |- (B→A)
(= (convert (Inh $s $p $tv))
   (Inh $p $s (truth-conv $tv)))

; -----------------------------------------------------------------------------
; Belief Revision
; -----------------------------------------------------------------------------

; Combine two beliefs about the same statement
(= (revise (Inh $s $p $t1) (Inh $s $p $t2))
   (Inh $s $p (truth-rev $t1 $t2)))

; Generic revision for any statement type
(= (revise ($form $args $t1) ($form $args $t2))
   ($form $args (truth-rev $t1 $t2)))

; -----------------------------------------------------------------------------
; Inference Helpers
; -----------------------------------------------------------------------------

; Chain multiple deductions
(= (ded-chain (Inh $a $b $t1) (Inh $b $c $t2) (Inh $c $d $t3))
   (let $r1 (ded (Inh $a $b $t1) (Inh $b $c $t2))
        (ded $r1 (Inh $c $d $t3))))

; Apply inference rule and return result
(= (infer $rule $premise1 $premise2)
   (case $rule
     (deduction (ded $premise1 $premise2))
     (induction (ind $premise1 $premise2))
     (abduction (abd $premise1 $premise2))
     (analogy (analogy $premise1 $premise2))
     (comparison (compare $premise1 $premise2))))
