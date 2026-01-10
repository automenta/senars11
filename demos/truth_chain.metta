; Truth Chain Demo
; Demonstrates multi-step deduction with NAL truth values

; Import standard library
(import! ../core/src/metta/stdlib/core.metta)
(import! ../core/src/metta/stdlib/truth.metta)
(import! ../core/src/metta/stdlib/nal.metta)

; ===== Knowledge Base =====

; (Inh Socrates Human) <1.0; 0.9>
(= (Source1) (Inh Socrates Human))
(= (tv Source1) (tv 1.0 0.9))

; (Inh Human Mortal) <1.0; 0.9>
(= (Source2) (Inh Human Mortal))
(= (tv Source2) (tv 1.0 0.9))

; (Inh Mortal Biological) <1.0; 0.9>
(= (Source3) (Inh Mortal Biological))
(= (tv Source3) (tv 1.0 0.9))


; ===== Inference Chain =====

; Step 1: Socrates -> Human -> Mortal
(= (Step1)
   (ded (Source1) (Source2)))

; Step 2: Socrates -> Mortal -> Biological
(= (Step2)
   (ded (Step1) (Source3)))


; ===== Execution =====

! "Step 1: Socrates runs to Mortal..."
! (Step1)
! (tv (Step1))
; Expected confidence: 0.9 * 0.9 = 0.81

! "Step 2: Socrates runs to Biological..."
! (Step2)
! (tv (Step2))
; Expected confidence: 0.81 * 0.9 = 0.729
