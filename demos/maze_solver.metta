; Maze Solver Demo - Using A* search algorithm from search.metta
; Demonstrates: Search algorithms, spatial reasoning, pathfinding

; Define a 10x10 grid maze with walls
; 0 = empty space, 1 = wall
; Start at (0,0), goal at (9,9)

; Maze representation: (cell row col value)
(cell 0 0 0) (cell 0 1 0) (cell 0 2 0) (cell 0 3 0) (cell 0 4 0) (cell 0 5 0) (cell 0 6 0) (cell 0 7 0) (cell 0 8 0) (cell 0 9 0)
(cell 1 0 0) (cell 1 1 1) (cell 1 2 0) (cell 1 3 0) (cell 1 4 0) (cell 1 5 1) (cell 1 6 0) (cell 1 7 0) (cell 1 8 0) (cell 1 9 0)
(cell 2 0 0) (cell 2 1 1) (cell 2 2 0) (cell 2 3 1) (cell 2 4 0) (cell 2 5 1) (cell 2 6 0) (cell 2 7 1) (cell 2 8 0) (cell 2 9 0)
(cell 3 0 0) (cell 3 1 0) (cell 3 2 0) (cell 3 3 1) (cell 3 4 0) (cell 3 5 0) (cell 3 6 0) (cell 3 7 1) (cell 3 8 0) (cell 3 9 0)
(cell 4 0 1) (cell 4 1 1) (cell 4 2 0) (cell 4 3 1) (cell 4 4 1) (cell 4 5 0) (cell 4 6 0) (cell 4 7 1) (cell 4 8 0) (cell 4 9 0)
(cell 5 0 0) (cell 5 1 0) (cell 5 2 0) (cell 5 3 0) (cell 5 4 0) (cell 5 5 0) (cell 5 6 0) (cell 5 7 1) (cell 5 8 0) (cell 5 9 0)
(cell 6 0 0) (cell 6 1 1) (cell 6 2 1) (cell 6 3 0) (cell 6 4 1) (cell 6 5 1) (cell 6 6 0) (cell 6 7 0) (cell 6 8 0) (cell 6 9 0)
(cell 7 0 0) (cell 7 1 0) (cell 7 2 0) (cell 7 3 0) (cell 7 4 0) (cell 7 5 1) (cell 7 6 0) (cell 7 7 1) (cell 7 8 1) (cell 7 9 0)
(cell 8 0 0) (cell 8 1 0) (cell 8 2 1) (cell 8 3 1) (cell 8 4 0) (cell 8 5 0) (cell 8 6 0) (cell 8 7 0) (cell 8 8 0) (cell 8 9 0)
(cell 9 0 0) (cell 9 1 0) (cell 9 2 0) (cell 9 3 0) (cell 9 4 0) (cell 9 5 1) (cell 9 6 1) (cell 9 7 1) (cell 9 8 0) (cell 9 9 0)

; Start and goal positions
(start 0 0)
(goal 9 9)

; Check if a cell is walkable
(= (walkable $row $col)
   (match &self (cell $row $col 0) True))

; Get valid neighbors (up, down, left, right)
(= (neighbors $row $col)
   (: (neighbor (+ $row 1) $col)
      (: (neighbor (- $row 1) $col)
         (: (neighbor $row (+ $col 1))
            (: (neighbor $row (- $col 1)) ())))))

; Filter valid neighbors that are within bounds and walkable
(= (valid-neighbors $row $col)
   (filter (λ $n (valid-and-walkable $n $row $col)) (neighbors $row $col)))

(= (valid-and-walkable (neighbor $r $c) $orig-row $orig-col)
   (and (and (and (>= $r 0) (< $r 10)) (>= $c 0)) (< $c 10))
   (walkable $r $c))

; Manhattan distance heuristic
(= (heuristic $row $col $goal-row $goal-col)
   (+ (abs (- $row $goal-row)) (abs (- $col $goal-col))))

; A* search implementation
(= (maze-search $start-row $start-col $goal-row $goal-col)
   (astar (λ $state (is-goal $state $goal-row $goal-col))
          (λ $state (heuristic-state $state $goal-row $goal-col))
          (: (state $start-row $start-col (:)) ()))

; Check if current state is goal
(= (is-goal (state $row $col $path) $goal-row $goal-col)
   (and (= $row $goal-row) (= $col $goal-col)))

; Calculate heuristic for a state
(= (heuristic-state (state $row $col $path) $goal-row $goal-col)
   (heuristic $row $col $goal-row $goal-col))

; Cost function (each step costs 1)
(= (cost $current $next)
   1)

; Get successors for A*
(= (successors (state $row $col $path))
   (map (λ $n (make-next-state $n $row $col $path))
        (valid-neighbors $row $col)))

(= (make-next-state (neighbor $r $c) $cur-row $cur-col $path)
   (state $r $c (: (pos $cur-row $cur-col) $path)))

; Solve the maze
(println "Starting maze solver...")
(println "Start: (0,0), Goal: (9,9)")
(time 
  (= $solution (maze-search 0 0 9 9))
  (println "Solution found:")
  (println $solution)
  (println "Path length:" (path-length $solution))
)

; Helper to get path length
(= (path-length (state $row $col $path))
   (length $path))

; Length function for lists
(= (length ()) 0)
(= (length (: $head $tail)) (+ 1 (length $tail)))

; Print maze for visualization
(= (print-maze)
   (println "Maze layout (S=start, G=goal, #=wall, .=empty):")
   (print-row 0))

(= (print-row $row)
   (if (< $row 10)
       (do (print-row-inner $row 0)
           (println "")
           (print-row (+ $row 1)))
       (println "")))

(= (print-row-inner $row $col)
   (if (< $col 10)
       (do (cond ((and (= $row 0) (= $col 0)) (print "S"))
                 ((and (= $row 9) (= $col 9)) (print "G"))
                 ((= (match &self (cell $row $col $val) $val) 1) (print "#"))
                 (else (print ".")))
           (print-row-inner $row (+ $col 1)))
       ()))

(print-maze)