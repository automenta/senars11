; Adaptive Reasoning Demo
; Demonstrates strategy switching based on confidence

; Import standard library
(import! ../core/src/metta/stdlib/core.metta)
(import! ../core/src/metta/stdlib/control.metta)
(import! ../core/src/metta/stdlib/truth.metta)

; ===== Strategies =====

(= (strategy-fast $problem)
   (let $_ (log "Using FAST strategy (heuristic)")
     (heuristic-solve $problem)))

(= (strategy-deep $problem)
   (let $_ (log "Using DEEP strategy (exhaustive)")
     (deep-solve $problem)))

; Mock solvers
(= (heuristic-solve $p) (Result $p Fast))
(= (deep-solve $p) (Result $p Deep))

; ===== Adaptive Control =====

; Select strategy based on problem confidence
(= (solve-adaptive $problem)
   (let $conf (get-confidence $problem)
     (if (> $conf 0.8)
         (strategy-fast $problem)
         (strategy-deep $problem))))

; Mock confidence oracle
(= (get-confidence ProblemEasy) 0.9)
(= (get-confidence ProblemHard) 0.4)

; ===== log helper =====
(= (log $msg) (println! $msg))

; ===== Execution =====

! "Solving Easy Problem (High Confidence):"
! (solve-adaptive ProblemEasy)

! "Solving Hard Problem (Low Confidence):"
! (solve-adaptive ProblemHard)
