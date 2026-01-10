; Adaptive Reasoning Demo using MeTTa
;
; This demo shows how MeTTa can switch between different reasoning strategies
; based on the confidence level of the input task. It demonstrates:
; 1. Conservative strategy for high-confidence tasks
; 2. Exploratory strategy for low-confidence tasks
; 3. Dynamic strategy selection based on task characteristics

; Define task types with different confidence levels
(= (task high-confidence-task (Inh cat animal) 0.9))
(= (task medium-confidence-task (Implication (Raining) (Wet)) 0.6))
(= (task low-confidence-task (Predict (StockPriceUp)) 0.3))

; Get confidence of a task
(= (confidence-of (task $name $content $conf))
   $conf)

; Get content of a task
(= (content-of (task $name $content $conf))
   $content)

; Adaptive strategy selector
(= (adaptive-strategy $task)
   (let $conf (confidence-of $task)
     (if (< $conf 0.5)
         (exploratory-strategy $task)
         (conservative-strategy $task))))

; Conservative strategy - use well-established rules
(= (conservative-strategy $task)
   (let $content (content-of $task)
     (apply-rules $content (well-established-rules))))

; Exploratory strategy - try multiple approaches
(= (exploratory-strategy $task)
   (let $content (content-of $task)
     (try-multiple-approaches $content (experimental-rules))))

; Well-established rules (high confidence)
(= (well-established-rules)
   ((= (Inh $x $y) (Inh $y $z) (Inh $x $z) :conf 0.95)
    (= (Sim $x $y) (Sim $y $x) :conf 0.90)
    (= (Implication $a $b) (Implication $b $c) (Implication $a $c) :conf 0.85)))

; Experimental rules (lower confidence)
(= (experimental-rules)
   ((= (Predict $event) (based-on $past-events $event) :conf 0.4)
    (= (Analogous $a $b) (Similar $a $c) (Analogous $c $b) :conf 0.3)
    (= (Hypothetical $x) (Possible $x) :conf 0.2)))

; Apply rules to content
(= (apply-rules $content $rules)
   (map (λ ($rule) (attempt-match $content $rule)) $rules))

; Try multiple approaches
(= (try-multiple-approaches $content $rules)
   (let $results (map (λ ($rule) (attempt-match $content $rule)) $rules)
     (filter non-empty? $results)))

; Attempt to match content with a rule
(= (attempt-match $content (= $pattern $conclusion :conf $conf))
   (let $bindings (unify $content $pattern)
     (if (successful-unification? $bindings)
         (subst $conclusion $bindings)
         ())))

; Check if unification was successful
(= (successful-unification? $bindings)
   (not (equal $bindings failure)))

; Placeholder for unify function (would be implemented in core)
(= (unify $a $b)
   (if (equal $a $b) (empty-bindings) (failure)))

; Placeholder for subst function (would be implemented in core)
(= (subst $template $bindings)
   $template)

; Empty bindings
(= (empty-bindings)
   ())

; Non-empty check
(= (non-empty? $x)
   (if (equal $x ()) False True))

; Test the adaptive reasoning system
(println "Testing adaptive reasoning strategies...")

; Test with high confidence task
(= $high-conf-result (adaptive-strategy high-confidence-task))
(println "High confidence task result:" $high-conf-result)

; Test with low confidence task
(= $low-conf-result (adaptive-strategy low-confidence-task))
(println "Low confidence task result:" $low-conf-result)

; Task evaluation metrics
(= (evaluate-task-effectiveness $task $strategy-result)
   (let $input-conf (confidence-of $task)
     (let $output-conf (estimate-confidence $strategy-result)
       (abs (- $input-conf $output-conf)))))

; Estimate confidence of result (simplified)
(= (estimate-confidence $result)
   (if (equal $result ()) 0.0 0.7))

; Learning to improve strategy selection
(= (update-strategy-selection $task $result $feedback)
   (let $current-strategy (adaptive-strategy $task)
     (if (> $feedback 0.8)  ; Positive feedback
         (reinforce (strategy-for-task-type $task) 0.1)
         (adjust-strategy-threshold $task -0.05))))

; Get strategy for task type
(= (strategy-for-task-type (task $name $content $conf))
   (if (< $conf 0.5) exploratory-strategy conservative-strategy))

; Adjust strategy threshold
(= (adjust-strategy-threshold $task $delta)
   (update-threshold! 0.5 $delta))  ; Update global threshold

; Global threshold (simplified representation)
(= (update-threshold! $old-value $delta)
   (+ $old-value $delta))

; Demonstrate learning from experience
(= (learn-from-experience $tasks $results $feedbacks)
   (map (λ ($t $r $f) (update-strategy-selection $t $r $f)) 
        $tasks $results $feedbacks))

; Example usage of learning
(= $tasks (high-confidence-task medium-confidence-task low-confidence-task))
(= $results (: result1 (: result2 (: result3 ()))))
(= $feedbacks (: 0.9 (: 0.6 (: 0.4 ()))))

(= $learning-outcome (learn-from-experience $tasks $results $feedbacks))
(println "Learning outcome:" $learning-outcome)