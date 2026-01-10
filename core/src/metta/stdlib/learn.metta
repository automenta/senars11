; MeTTa Standard Library - Learning Module
; Primitives for self-modification and reinforcement learning
; ~30 LOC

; ===== Rule Learning =====

; learn-rule: add a new rule to the atomspace
; (learn-rule $pattern $result $confidence)
(= (learn-rule $p $r $c) 
   (add-atom (= $p $r))) 
; Note: Confidence currently handled by separate sti mechanism or future atom property expansion

; ===== Reinforcement =====

; reinforce: update STI of an atom
; (reinforce $atom $delta)
(= (reinforce $atom $delta)
   (let $current (get-sti $atom)
     (set-sti $atom (+ $current $delta))))

; reward: positive reinforcement
(= (reward $atom) (reinforce $atom 1.0))

; punish: negative reinforcement
(= (punish $atom) (reinforce $atom -1.0))
