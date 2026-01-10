; ============================================================================
; socrates.metta - ClassicSyllogism with Truth Value Propagation
; ============================================================================
; Demonstrates NAL deduction with truth value propagation through
; a multi-step inference chain.
;
; Shows how confidence degrades with each deduction step:
; Initial: (TV 1.0 0.9)
; After 1 step: (TV 1.0 0.81)  ; 0.9 * 0.9 = 0.81
; After 2 steps: (TV 1.0 0.729) ; 0.81 * 0.9 = 0.729
; ============================================================================

; Load required libraries
!(import! truth.metta)
!(import! nal.metta)

; Knowledge base with truth values
; Socrates is a human (very confident)
(= (Inh Socrates Human) (tv 1.0 0.9))

; All humans are mortal (very confident)
(= (Inh Human Mortal) (tv 1.0 0.9))

; -----------------------------------------------------------------------------
; Single-Step Deduction
; -----------------------------------------------------------------------------

; Query: Is Socrates mortal?
; This should derive: (Inh Socrates Mortal (TV 1.0 0.81))
!(ded (Inh Socrates Human (tv 1.0 0.9)) 
      (Inh Human Mortal (tv 1.0 0.9)))

; -----------------------------------------------------------------------------
; Multi-Step Deduction Chain
; -----------------------------------------------------------------------------

; Add intermediate knowledge
(= (Inh Human Animal) (tv 1.0 0.9))
(= (Inh Animal LivingThing) (tv 1.0 0.9))

; Three-step chain: Socrates → Human → Animal → LivingThing
; Shows confidence decay: 0.9 → 0.81 → 0.729
!(let $step1 (ded (Inh Socrates Human (tv 1.0 0.9))
                   (Inh Human Animal (tv 1.0 0.9)))
      (ded $step1 (Inh Animal LivingThing (tv 1.0 0.9))))

; -----------------------------------------------------------------------------
; Truth Value Inspection
; -----------------------------------------------------------------------------

; Extract and display truth components
!(let $result (ded (Inh Socrates Human (tv 1.0 0.9))
                    (Inh Human Mortal (tv 1.0 0.9)))
      (print "Frequency:" (freq (tv-of $result))
             "Confidence:" (conf (tv-of $result))
             "Expectation:" (expectation (tv-of $result))))
