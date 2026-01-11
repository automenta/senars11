
; lists.metta - List operations

; Basic list construction already uses (: h t)
; We can define helpers if needed, but stdlib provides them.

; Test cons (construction)
!(: 1 (: 2 ()))

; Test car (head)
!(car (: A (: B ())))

; Test cdr (tail)
!(cdr (: A (: B ())))

; Test length
!(length (: 1 (: 2 (: 3 ()))))

; Test map
!(map (λ $x (* $x 2)) (: 1 (: 2 (: 3 ()))))

; Test append
!(append (: 1 (: 2 ())) (: 3 (: 4 ())))
