; ============================================================================
; truth.metta - Truth Value Operations
; ============================================================================
; Implements NAL-style truth values with frequency and confidence.
; Truth values are represented as (TV <frequency> <confidence>)
; where both values are in the range [0, 1].
;
; Based on NARS truth value semantics and MeTTa specifications.
; ============================================================================

; -----------------------------------------------------------------------------
; Truth Value Construction and Accessors
; -----------------------------------------------------------------------------

; Construct a truth value from frequency and confidence
(= (tv $f $c) (TV $f $c))

; Extract frequency from truth value
(= (freq (TV $f $_)) $f)

; Extract confidence from truth value  
(= (conf (TV $_ $c)) $c)

; Default truth value (high frequency, high confidence)
(= (tv-default) (TV 1.0 0.9))

; -----------------------------------------------------------------------------
; Grounded Truth Value Operations
; -----------------------------------------------------------------------------
; These delegate to the JavaScript Truth class for precise calculations

; Deduction: (f1 * f2, c1 * c2)
(= (truth-ded $t1 $t2) (&truth-ded $t1 $t2))

; Induction: (f2, c1 * c2)
(= (truth-ind $t1 $t2) (&truth-ind $t1 $t2))

; Abduction: (f1, min(c1 * c2, c2))
(= (truth-abd $t1 $t2) (&truth-abd $t1 $t2))

; Revision: combines evidence from two sources
(= (truth-rev $t1 $t2) (&truth-rev $t1 $t2))

; Negation: (1 - f, c)
(= (truth-neg $t) (&truth-neg $t))

; Conversion: (f, f * c) 
(= (truth-conv $t) (&truth-conv $t))

; Comparison: fuzzy AND of frequencies
(= (truth-comp $t1 $t2) (&truth-comp $t1 $t2))

; Analogy: (f1 * f2, c1 * c2 * f2)
(= (truth-ana $t1 $t2) (&truth-ana $t1 $t2))

; Intersection: (f1 * f2, c1 * c2)
(= (truth-int $t1 $t2) (&truth-int $t1 $t2))

; Union: (1 - (1-f1)*(1-f2), c1 * c2)
(= (truth-union $t1 $t2) (&truth-union $t1 $t2))

; -----------------------------------------------------------------------------
; Truth Value Utilities
; -----------------------------------------------------------------------------

; Expectation: f * c (quality of evidence)
(= (expectation $tv) (* (freq $tv) (conf $tv)))

; Check if truth value is above confidence threshold
(= (confident? $tv $threshold)
   (&> (conf $tv) $threshold))

; Check if truth value is above expectation threshold
(= (strong? $tv $threshold)
   (&> (expectation $tv) $threshold))

; Compare two truth values by expectation
(= (stronger? $tv1 $tv2)
   (&> (expectation $tv1) (expectation $tv2)))

; -----------------------------------------------------------------------------
; Helper Functions for Backward Compatibility
; -----------------------------------------------------------------------------

; Extract truth value from statement with optional TV annotation
; (Inh S P (TV f c)) -> (TV f c)
(= (tv-of (Inh $_ $_ $tv)) $tv)
(= (tv-of (Sim $_ $_ $tv)) $tv)
(= (tv-of (Stmt $_ $tv)) $tv)

; If no TV annotation, use default
(= (tv-of (Inh $_ $_)) (tv-default))
(= (tv-of (Sim $_ $_)) (tv-default))
(= (tv-of $_) (tv-default))
