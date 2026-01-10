; MeTTa Standard Library - Search Module
; Search algorithms for state space exploration
; ~50 LOC

; ===== Depth-First Search =====

; dfs: find a state satisfying goal predicate starting from state
; (dfs $goal $state) -> $state or False
(= (dfs $goal $state)
   (if ($goal $state) $state
       (first-success (map (dfs $goal) (successors $state)))))

; first-success: return first non-False result from list
(= (first-success ()) False)
(= (first-success (: $h $t))
   (let $res $h
     (if (== $res False) (first-success $t) $res)))


; ===== A* Search =====

; astar: find best state using heuristic
; (astar $goal $heuristic $frontier) -> $state or False
(= (astar $goal $heuristic $frontier)
   (if (empty? $frontier) False
       (let $best (min-by $heuristic $frontier)
         (if ($goal $best) $best
             (astar $goal $heuristic
                    (add-all (remove-one $best $frontier) (successors $best)))))))

; ===== Helpers =====

; min-by: find element that minimizes function f
; min-by: find element that minimizes function f
(= (min-by $f (: $h $t))
   (if (empty? $t) $h
       (let $best-tail (min-by $f $t)
         (if (< ($f $h) ($f $best-tail)) $h $best-tail))))

; remove-one: remove first occurrence of element from list
(= (remove-one $x ()) ())
(= (remove-one $x (: $h $t))
   (if (== $x $h) $t (: $h (remove-one $x $t))))

; add-all: add all elements from list2 to list1 (prepend)
(= (add-all $l ()) $l)
(= (add-all $l (: $h $t)) (add-all (: $h $l) $t))
