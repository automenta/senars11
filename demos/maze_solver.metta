; Maze Solver Demo
; Uses A* search to find a path in a grid

; Import standard library
(import! ../core/src/metta/stdlib/core.metta)
(import! ../core/src/metta/stdlib/list.metta)
(import! ../core/src/metta/stdlib/search.metta)

; ===== Problem Definition =====

; Grid Size: 4x4 (0-3)

; Check bounds and obstacles
(= (is-open $x $y)
   (if (or (< $x 0) (< $y 0)) False
   (if (or (> $x 3) (> $y 3)) False
   (if (eq (At $x $y) (At 1 1)) False  ; Obstacle at 1,1
   (if (eq (At $x $y) (At 1 2)) False  ; Obstacle at 1,2
   True)))))

(= (== $x $x) True)
(= (== $x $y) False)
(= (eq $a $b) (== $a $b))

; Successors: Right, Down, Left, Up
(= (successors (At $x $y))
   (filter valid-move
     (: (At (+ $x 1) $y)
     (: (At $x (+ $y 1))
     (: (At (- $x 1) $y)
     (: (At $x (- $y 1)) ()))))))

(= (valid-move (At $x $y)) (is-open $x $y))

; Goal State
(= (is-goal (At 3 3)) True)
(= (is-goal $_) False)

; Heuristic: Manhattan distance to 3,3
(= (dist-h (At $x $y))
   (+ (abs (- 3 $x)) (abs (- 3 $y))))

(= (abs $n) (if (< $n 0) (- 0 $n) $n))

; ===== Execution =====

! "Starting A* Search from (0,0) to (3,3)..."
! (astar is-goal dist-h (: (At 0 0) ()))
