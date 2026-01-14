; MeTTa Standard Library - HOF Module
; Higher-Order Functions (Phase 4)

; === atom-subst: substitute variable in template ===
; Use let by default
(= (atom-subst $value $var $template)
   (let $var $value $template))

; === filter-atom: filter by predicate ===
(= (filter-atom $l $v $p)
   (filter-atom-fast $l $v $p))

; === map-atom: transform each element ===
(= (map-atom $l $v $f)
   (map-atom-fast $l $v $f))

; === foldl-atom: left fold ===
(= (foldl-atom $l $init $avar $bvar $op)
   (foldl-atom-fast $l $init $avar $bvar $op))

; === reduce-atom: like foldl but uses first element as init ===
(= (reduce-atom $list $a $b $op)
  (unify $list () (empty)
    (chain (get-metatype $list) $type
      (unify $type Expression
        (function (chain (decons-atom $list) $ht
          (unify $ht (: $head $tail)
            (chain (foldl-atom $tail $head $a $b $op) $res (return $res))
            (return ()))))
        ; Atom case
        $list))))
