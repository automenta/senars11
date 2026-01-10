; Maze Solver Demo using MeTTa Search Algorithms
;
; This demo implements a maze solver using the search algorithms
; defined in search.metta. It demonstrates A* pathfinding on a 
; 10x10 grid with obstacles.

; Define the maze (10x10 grid)
; '#' represents walls, '.' represents free space
; 'S' is start, 'G' is goal

; Maze representation as a list of rows
(= (maze)
   ((. . . # . . . . . .)
    (. # . # . # # # . .)
    (. # . . . . . . . .)
    (. # # # # . # . # .)
    (. . . . . . # . # .)
    (# # # # . . # . . .)
    (. . . . . # # . # .)
    (. # . # . . . . # .)
    (. # . . . # . . . .)
    (S . . . . . . # . G)))

; Check if a position is walkable
(= (walkable $row $col)
   (and (>= $row 0) (< $row 10)
        (>= $col 0) (< $col 10)
        (not (= (get-cell $row $col) #))))

; Get cell value at position
(= (get-cell $row $col)
   (get-element $col (get-row $row (maze))))

; Get a specific row from the maze
(= (get-row 0 (: $h $t))
   $h)

(= (get-row $n (: $h $t))
   (if (> $n 0)
       (get-row (- $n 1) $t)
       ()))

; Get element at index from a list
(= (get-element 0 (: $h $t))
   $h)

(= (get-element $n (: $h $t))
   (if (> $n 0)
       (get-element (- $n 1) $t)
       ()))

; Get successors of a position (up, down, left, right)
(= (successors ($row $col))
   (let $candidates (: (: (+ $row 1) $col)      ; Down
                      (: (: (- $row 1) $col)    ; Up
                         (: (: $row (+ $col 1)) ; Right
                            (: (: $row (- $col 1)) ; Left
                               ())))))          ; End of list
     (filter (λ ($pos) (walkable (fst $pos) (snd $pos))) $candidates)))

; Helper to get first element of pair
(= (fst ($a $b))
   $a)

; Helper to get second element of pair
(= (snd ($a $b))
   $b)

; Manhattan distance heuristic
(= (manhattan-distance ($r1 $c1) ($r2 $c2))
   (+ (abs (- $r1 $r2)) (abs (- $c1 $c2))))

; Goal check
(= (goal-state ($row $col))
   (= (get-cell $row $col) G))

; Start position
(= (start-pos)
   (0 9))  ; Starting at S position

; Solve the maze using A*
(= (solve-maze)
   (astar goal-state (start-pos) (lambda ($pos) (manhattan-distance $pos (9 9)))))

; Print solution path
(= (print-path $path)
   (if (= $path ())
       (println "No path found")
       (println "Path found:" $path)))

; Run the maze solver
(solve-maze)

; Additional utility functions for path reconstruction
; (These would be needed in a complete implementation)

; Check if two positions are adjacent
(= (adjacent? ($r1 $c1) ($r2 $c2))
   (or (= (abs (- $r1 $r2)) 1) (= (abs (- $c1 $c2)) 1)))

; Validate path
(= (valid-path $path)
   (if (= (length $path) 1)
       True
       (and (adjacent? (first $path) (second $path))
            (valid-path (rest $path)))))

; Helper functions for list processing
(= (first (: $h $t))
   $h)

(= (second (: $h (: $s $t)))
   $s)

(= (rest (: $h $t))
   $t)

; Length of a list
(= (length ())
   0)

(= (length (: $h $t))
   (+ 1 (length $t)))

; Filter function
(= (filter $pred ())
   ())

(= (filter $pred (: $h $t))
   (let $filtered-tail (filter $pred $t)
     (if ($pred $h)
         (: $h $filtered-tail)
         $filtered-tail)))

; Map function
(= (map $func ())
   ())

(= (map $func (: $h $t))
   (: ($func $h) (map $func $t)))

; Absolute value
(= (abs $x)
   (if (< $x 0) (- 0 $x) $x))