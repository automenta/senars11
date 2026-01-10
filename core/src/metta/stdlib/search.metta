; Search algorithms in MeTTa

; Depth-First Search
(= (dfs $goal $state $visited)
   (if ($goal $state) 
       $state
       (let $successors (successors $state)
         (dfs-helper $goal $successors $visited $state))))

(= (dfs-helper $goal $states $visited $parent)
   (match $states
      (: $state $rest)
      (if (member $state $visited)
          (dfs-helper $goal $rest $visited $parent)
          (let $result (dfs $goal $state (: $state $visited))
            (if (not (equal $result ())) 
                $result
                (dfs-helper $goal $rest (: $state $visited) $parent))))
      ()))

; Breadth-First Search
(= (bfs $goal $start)
   (bfs-loop $goal (: $start ()) ()))

; Helper for BFS loop
(= (bfs-loop $goal $queue $visited)
   (match $queue
      (: $state $rest)
      (if ($goal $state)
          $state
          (if (member $state $visited)
              (bfs-loop $goal $rest $visited)
              (let $new-queue (append $rest (successors $state))
                (bfs-loop $goal $new-queue (: $state $visited)))))
      ()))

; A* Search Algorithm
(= (astar $goal $start $heuristic)
   (astar-loop $goal (: (cons $start 0)) () $heuristic))

; A* loop helper
(= (astar-loop $goal $frontier $visited $heuristic)
   (if (empty? $frontier)
       ()
       (let $current (best-node $frontier $heuristic)
         (let $node (car $current)
           (if ($goal $node)
               $node
               (if (member $node $visited)
                   (astar-loop $goal (remove-best $frontier) $visited $heuristic)
                   (let $new-frontier (expand-frontier $current (successors $node) $heuristic)
                     (astar-loop $goal $new-frontier (: $node $visited) $heuristic))))))))

; Find the best node based on heuristic
(= (best-node (: $node $cost) $heuristic)
   $node)

(= (best-node (: $node $cost $rest) $heuristic)
   (let $best-rest (best-node $rest $heuristic)
     (if (< (+ $cost ($heuristic $node)) (+ (cost-of $best-rest) ($heuristic $best-rest)))
         $node
         $best-rest)))

; Expand frontier with new nodes
(= (expand-frontier $current $successors $heuristic)
   (fold (lambda ($frontier $succ)
           (cons (cons $succ (+ (cdr $current) 1)) $frontier))
         $successors
         $current))

; Helper functions
(= (member $x ())
   False)

(= (member $x (: $h $t))
   (if (equal $x $h) 
       True 
       (member $x $t)))

(= (empty? ())
   True)

(= (empty? $x)
   False)

(= (append () $ys)
   $ys)

(= (append (: $x $xs) $ys)
   (: $x (append $xs $ys)))

(= (cost-of (cons $node $cost))
   $cost)

(= (car (cons $a $b))
   $a)

(= (cdr (cons $a $b))
   $b)

(= (not True)
   False)

(= (not False)
   True)

(= (remove-best (: $head $tail))
   $tail)