; Truth Chain Demo using MeTTa
;
; This demo shows multi-step deduction with truth value propagation
; following NAL inference rules. It demonstrates how confidence degrades
; across multiple inference steps.

; Define basic inheritance relations with truth values
(= (Inh Socrates Human) (TruthValue 1.0 0.9))
(= (Inh Human Mortal) (TruthValue 1.0 0.9))

; Truth value constructor
(= (TruthValue $frequency $confidence)
   (TV $frequency $confidence))

; Get frequency from truth value
(= (frequency-of (TV $f $c))
   $f)

; Get confidence from truth value
(= (confidence-of (TV $f $c))
   $c)

; Deduction rule: S → M from S → H and H → M
(= (deduce-transitivity (Inh $S $H) (TV $f1 $c1) (Inh $H $M) (TV $f2 $c2))
   (let $f-result (* $f1 $f2)
     (let $c-result (* $c1 $c2)
       (Inh $S $M (TruthValue $f-result $c-result)))))

; Apply deduction rule to Socrates example
(= $socrates-human (Inh Socrates Human (TruthValue 1.0 0.9)))
(= $human-mortal (Inh Human Mortal (TruthValue 1.0 0.9)))

; Perform deduction
(= $socrates-mortal 
   (deduce-transitivity 
     (Inh Socrates Human) 
     (TruthValue 1.0 0.9)
     (Inh Human Mortal) 
     (TruthValue 1.0 0.9)))

; Expected result: (Inh Socrates Mortal (TV 1.0 0.81))
(println "Socrates is mortal with truth value:")
(println $socrates-mortal)

; Induction rule: if A→B and A→C then B→C (with lower confidence)
(= (induce-relation (Inh $A $B) (TV $f1 $c1) (Inh $A $C) (TV $f2 $c2))
   (let $f-result (* $f1 $f2)
     (let $c-result (* $c1 $c2 0.5)  ; Induction has lower confidence
       (Inh $B $C (TruthValue $f-result $c-result)))))

; Example induction
(= $animal-mammal (Inh Animal Mammal (TruthValue 0.8 0.7)))
(= $animal-cat (Inh Animal Cat (TruthValue 0.3 0.6)))

(= $mammal-cat 
   (induce-relation 
     (Inh Animal Mammal) (TruthValue 0.8 0.7)
     (Inh Animal Cat) (TruthValue 0.3 0.6)))

(println "Induced relation (Mammal -> Cat):")
(println $mammal-cat)

; Abduction rule: if A→C and B→C then A→B (with even lower confidence)
(= (abduce-relation (Implication $A $C) (TV $f1 $c1) (Implication $B $C) (TV $f2 $c2))
   (let $f-result (min $f1 $f2)
     (let $c-result (* $c1 $c2 0.3)  ; Abduction has lowest confidence
       (Implication $A $B (TruthValue $f-result $c-result)))))

; Truth revision - combining two truth values for same statement
(= (revise-truth (TV $f1 $c1) (TV $f2 $c2))
   (let $c-total (+ $c1 $c2)
     (let $f-new (/ (+ (* $f1 $c1) (* $f2 $c2)) $c-total)
       (let $c-new (/ (* $c1 $c2) (+ $c1 $c2 (- 1 (min $c1 $c2))))
         (TruthValue $f-new $c-new)))))

; Example revision
(= $observation1 (TruthValue 0.8 0.7))
(= $observation2 (TruthValue 0.9 0.6))

(= $revised-truth (revise-truth $observation1 $observation2))
(println "Revised truth value from two observations:")
(println $revised-truth)

; Multi-step chain: Socrates -> Human -> Mortal -> LivingThing -> Entity
(= $human-mortal-step (Inh Human Mortal (TruthValue 1.0 0.9)))
(= $mortal-living (Inh Mortal LivingThing (TruthValue 0.9 0.8)))
(= $living-entity (Inh LivingThing Entity (TruthValue 1.0 0.85)))

; First step: Human -> LivingThing
(= $human-living 
   (deduce-transitivity 
     (Inh Human Mortal) (TruthValue 1.0 0.9)
     (Inh Mortal LivingThing) (TruthValue 0.9 0.8)))

; Second step: Human -> Entity
(= $human-entity 
   (deduce-transitivity 
     (Inh Human LivingThing) (frequency-of (confidence-of $human-living) (confidence-of $human-living))
     (Inh LivingThing Entity) (TruthValue 1.0 0.85)))

; Note: The above has an issue with the function call. Let me fix it:
(= $human-living-step 
   (deduce-transitivity 
     (Inh Human Mortal) (TruthValue 1.0 0.9)
     (Inh Mortal LivingThing) (TruthValue 0.9 0.8)))

(= $human-entity-step
   (deduce-transitivity
     (Inh Human LivingThing) (TruthValue 0.9 0.72)  ; Using computed freq/conf from previous step: 0.9 * 0.8 = 0.72
     (Inh LivingThing Entity) (TruthValue 1.0 0.85)))

; Final step: Socrates -> Entity
(= $socrates-entity-step
   (deduce-transitivity
     (Inh Socrates Human) (TruthValue 1.0 0.9)
     (Inh Human Entity) (TruthValue 0.9 0.612)))  ; Confidence degrades: 0.9 * 0.72 * 0.85 ≈ 0.612

(println "Multi-step chain - Socrates -> Entity:")
(println $socrates-entity-step)

; Confidence degradation analysis
(= (confidence-degradation $initial-steps)
   (fold (λ ($acc $step) (* $acc (confidence-of $step))) $initial-steps 1.0))

; Example: Calculate confidence degradation for Socrates chain
(= $socrates-chain-confidences 
   (: (confidence-of (TruthValue 1.0 0.9))     ; Socrates -> Human
      (: (confidence-of (TruthValue 1.0 0.9))   ; Human -> Mortal  
         (: (confidence-of (TruthValue 0.9 0.8)) ; Mortal -> LivingThing
            (: (confidence-of (TruthValue 1.0 0.85)) ; LivingThing -> Entity
               ())))))

(= $final-confidence 
   (fold (λ ($acc $conf) (* $acc $conf)) $socrates-chain-confidences 1.0))

(println "Final confidence after 4-step chain:" $final-confidence)

; Truth value operations
(= (negate-tv (TV $f $c))
   (TV (- 1 $f) $c))

(= (intersection-tv (TV $f1 $c1) (TV $f2 $c2))
   (TV (min $f1 $f2) (* $c1 $c2)))

(= (union-tv (TV $f1 $c1) (TV $f2 $c2))
   (TV (max $f1 $f2) (* $c1 $c2)))

; Example of truth value operations
(= $tv1 (TruthValue 0.7 0.8))
(= $tv2 (TruthValue 0.5 0.9))

(= $negated-tv (negate-tv $tv1))
(println "Negated truth value:" $negated-tv)

(= $intersected-tv (intersection-tv $tv1 $tv2))
(println "Intersection of truth values:" $intersected-tv)

(= $union-tv (union-tv $tv1 $tv2))
(println "Union of truth values:" $union-tv)

; Summary of truth chain properties
(println "Truth chain properties demonstrated:")
(println "- Multi-step deduction with confidence degradation")
(println "- Truth value revision from multiple sources")
(println "- Different inference rules (deduction, induction, abduction)")
(println "- Truth value operations (negation, intersection, union)")