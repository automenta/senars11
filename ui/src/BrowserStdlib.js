
// BrowserStdlib.js - Bundled MeTTa Standard Library for Offline Use

const CORE_METTA = `; MeTTa Standard Library - Core Module
; Fundamental functions and definitions
; ~50 LOC

; ===== Identity and Logic =====

; id: Identity function
(= (id $x) $x)

; if: Conditional execution
; (if True $then $else) -> $then
; (if False $then $else) -> $else
(= (if True $then $else) $then)
(= (if False $then $else) $else)

; not: Logical negation
(= (not True) False)
(= (not False) True)

; and: Logical conjunction
(= (and True True) True)
(= (and True False) False)
(= (and False True) False)
(= (and False False) False)

; or: Logical disjunction
(= (or True True) True)
(= (or True False) True)
(= (or False True) True)
(= (or False False) False)

; ===== List Basics =====

; empty?: check for empty list
(= (empty? ()) True)
(= (empty? (: $h $t)) False)

; car: head of list
(= (car (: $h $t)) $h)

; cdr: tail of list
(= (cdr (: $h $t)) $t)

; cons: construct list
(= (cons $h $t) (: $h $t))

; ===== Control Flow Wrappers =====

; let: variable binding
; (let $var $val $body)
(= (let $x $v $body) (let-in (^ &subst $x $v) $body))
(= (let-in True $body) $body)
(= (let-in False $body) (empty))

; let*: sequential binding
(= (let* () $body) $body)
(= (let* (($var $val) $rest) $body)
   (let $var $val (let* $rest $body)))

; ===== Function Application =====

; apply: apply function to arguments
; (apply $f ($a $b)) -> ($f $a $b)
(= (apply $f $args) (cons $f $args))

; ===== Error Handling =====

; error: signal error
(= (error $msg) (Error $msg))
(= (catch (Error $msg) $handler) ($handler $msg))
(= (catch $val $handler) $val)

; ===== System Interaction =====

; import!: load module (mock implementation for core)
; (= (import! $module) (load-module $module)) - Handled by interpreter
`;

const LIST_METTA = `; MeTTa Standard Library - List Module
; List processing functions
; ~60 LOC

; ===== List Mapping =====

; map: apply function to all elements
(= (map $f ()) ())
(= (map $f (: $h $t)) (: ($f $h) (map $f $t)))

; ===== List Folding =====

; fold: accumulate list from left
(= (fold $f $z ()) $z)
(= (fold $f $z (: $h $t)) (fold $f ($f $z $h) $t))

; fold-right: accumulate from right
(= (fold-right $f $z ()) $z)
(= (fold-right $f $z (: $h $t)) ($f $h (fold-right $f $z $t)))

; ===== Filter =====

; filter: select elements matching predicate
; (filter $p ()) → ()
; (filter $p (: $h $t)) → (: $h (filter $p $t)) if ($p $h) is True
; (filter $p (: $h $t)) → (filter $p $t) otherwise
(= (filter $p ()) ())
(= (filter $p (: $h $t))
   (if ($p $h)
       (: $h (filter $p $t))
       (filter $p $t)))

; ===== List Length =====

; length: count elements
(= (length ()) 0)
(= (length (: $_ $t)) (+ 1 (length $t)))

; ===== List Reverse =====

; reverse: reverse list order
(= (reverse $xs) (reverse-acc $xs () ))
(= (reverse-acc () $acc) $acc)
(= (reverse-acc (: $h $t) $acc) (reverse-acc $t (: $h $acc)))

; ===== List Append =====

; append: concatenate two lists
(= (append () $ys) $ys)
(= (append (: $h $t) $ys) (: $h (append $t $ys)))

; ===== List Utilities =====

; take: take first n elements
(= (take 0 $_) ())
(= (take $n ()) ())
(= (take $n (: $h $t)) (: $h (take (- $n 1) $t)))

; drop: drop first n elements
(= (drop 0 $xs) $xs)
(= (drop $n ()) ())
(= (drop $n (: $_ $t)) (drop (- $n 1) $t))

; nth: get nth element (0-indexed)
(= (nth 0 (: $h $_)) $h)
(= (nth $n (: $_ $t)) (nth (- $n 1) $t))

; zip: combine two lists
(= (zip () $_) ())
(= (zip $_ ()) ())
(= (zip (: $h1 $t1) (: $h2 $t2)) (: (: $h1 $h2) (zip $t1 $t2)))
`;

const MATCH_METTA = `; MeTTa Standard Library - Match Module
; Non-deterministic pattern matching
; ~40 LOC

; ===== Pattern Matching =====

; match: pattern matching against space
; (match $space $pattern $template)
; Returns: all instances where $pattern matches atoms in $space,
;          with $template instantiated by the bindings

; Use grounded &match for performance and to avoid stack overflow
; (recursion on get-atoms list is too deep without TCO)
(= (match $space $pattern $template) (^ &match $space $pattern $template))

; ===== Unification Wrappers =====

; unify: expose kernel unification
(= (unify $p $t) (^ &unify $p $t))

; subst: expose kernel substitution
(= (subst $t $b) (^ &subst $t $b))

; ok?: check if unification succeeded
(= (ok? $b) (not (== $b False)))

; ===== Match Utilities =====

; match-first: return only first match
(= (match-first $space $pattern $template)
   (car (match $space $pattern $template)))

; match-all: return all matches (alias)
(= (match-all $space $pattern $template)
   (match $space $pattern $template))

; match-count: count number of matches
(= (match-count $space $pattern)
   (length (match $space $pattern $pattern)))

; exists?: check if pattern has any matches
(= (exists? $space $pattern)
   (not (empty? (match $space $pattern $pattern))))

; ===== Advanced Matching =====

; match-where: match with additional constraint
; (match-where $space $pattern $constraint $template)
(= (match-where $space $pattern $constraint $template)
   (filter (λ $x $constraint)
           (match $space $pattern $template)))

; match-bind: match and bind to variable
; (match-bind $var $space $pattern $body)
(= (match-bind $var $space $pattern $body)
   (map (λ $var $body) (match $space $pattern $pattern)))
`;

const TYPES_METTA = `; MeTTa Standard Library - Types Module
; Type annotations and type checking
; ~50 LOC

; ===== Type Declarations =====

; Type annotation syntax: (: $term $type)
; Function types: (-> $argType1 $argType2 ... $returnType)

; Basic types
(: Number Type)
(: String Type)
(: Bool Type)
(: Atom Type)
(: Variable Type)

; ===== Arithmetic Type Signatures =====

; Declare types for arithmetic operations
(: + (-> Number Number Number))
(: - (-> Number Number Number))
(: * (-> Number Number Number))
(: / (-> Number Number Number))

; Comparison operations
(: < (-> Number Number Bool))
(: > (-> Number Number Bool))
(: == (-> $a $a Bool))

; ===== Type Queries =====

; typeof: query the type of a term
; (typeof $x) → searches for (: $x $type) in the space
; Return the first match (or all matches as list if multiple?)
; The tests expect a single Atom if one exists.
; Since match returns a list, we take the head.
(= (typeof $x) (car (match &self (: $x $t) $t)))

; has-type?: check if term has specific type
(= (has-type? $x $type)
   (exists? &self (: $x $type)))

; ===== Type Predicates =====

; is-number?: check if term is a number
(= (is-number? $x)
   (match-first &self (: $x Number) True))

; is-string?: check if term is a string
(= (is-string? $x)
   (match-first &self (: $x String) True))

; is-bool?: check if term is boolean
(= (is-bool? True) True)
(= (is-bool? False) True)
(= (is-bool? $_) False)

; is-var?: check if term is a variable (starts with $)
(= (is-var? $x)
   (match-first &self (: $x Variable) True))

; ===== Type Checking =====

; check-type: verify term has expected type
; Returns term if type matches, error otherwise
(= (check-type $x $expected-type)
   (if (has-type? $x $expected-type)
       $x
       (error type-mismatch $x $expected-type)))

; infer-type: infer type from structure
(= (infer-type $x)
   (let $explicit (typeof $x)
      (if (empty? $explicit)
          (infer-structural-type $x)
          (car $explicit))))

; Helper: infer type from term structure
(= (infer-structural-type True) Bool)
(= (infer-structural-type False) Bool)
(= (infer-structural-type $x)
   (if (starts-with? $x "$") Variable Atom))

; ===== Function Type Checking =====

; check-function-type: verify function application types
; (check-function-type $f $args $expected-return)
(= (check-function-type $f $args $expected-return)
   (let $f-type (typeof $f)
      (if (valid-application? $f-type $args $expected-return)
          True
          (error invalid-application $f $args))))

; ===== Type Utilities =====

; cast: attempt to cast value to type
(= (cast $x $type) $x)  ; Placeholder - real implementation would convert

; typeof-default: get type with default fallback
(= (typeof-default $x $default)
   (let $t (typeof $x)
      (if (empty? $t) $default (car $t))))

; ===== Type System Integration =====

; Register type checking operations in the interpreter
; These will be handled by the TypeChecker class
(: type-check (-> $a $b Bool))
(: infer-type (-> $a $b))
`;

export const BROWSER_STDLIB = {
    'core.metta': CORE_METTA,
    'list.metta': LIST_METTA,
    'match.metta': MATCH_METTA,
    'types.metta': TYPES_METTA,
    // Add placeholders if needed or load other files
    'truth.metta': '; truth module (empty)',
    'nal.metta': '; nal module (empty)',
    'attention.metta': '; attention module (empty)',
    'control.metta': '; control module (empty)',
    'search.metta': '; search module (empty)',
    'learn.metta': '; learn module (empty)'
};
