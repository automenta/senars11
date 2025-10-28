// Narsese Grammar for Peggy Parser v37
start
  = _ content:(Task / Term) _ { return content; }

Task "task"
  = term:Term punc:Punctuation? truth:TruthValue? {
      return {
        term: term,
        punctuation: punc !== null ? punc : '.',
        truthValue: truth,
        taskType: punc === '?' ? 'QUESTION' : (punc === '!' ? 'GOAL' : 'BELIEF')
      };
    }

Punctuation
  = _ punc:[.!?] { return punc; }

TruthValue
  = _ "%" _ f:Float _ ";" _ c:Float _ "%" { return { frequency: f, confidence: c }; }
  / _ "%" _ f:Float _ "%" { return { frequency: f, confidence: 0.9 }; }

Term "term"
  = Statement
  / PrefixCompound
  / Product
  / Set
  / AtomicTerm

Statement
  = AngleBracketStatement
  / ParenthesizedStatement

AngleBracketStatement
  = "<" _ subject:Term _ op:InfixOperator _ predicate:Term _ ">" {
      return options.termFactory.create({ operator: op.trim(), components: [subject, predicate] });
    }

ParenthesizedStatement
  = "(" _ subject:Term _ op:InfixOperator _ predicate:Term _ ")" {
      return options.termFactory.create({ operator: op.trim(), components: [subject, predicate] });
    }

InfixOperator
  = op:("-->" / "<->" / "==>" / "<=>" / "=/>" / "=|" / "=/=" / "=" / "&&" / "||") { return op; }

PrefixCompound
  = "(" _ op:("-->," / "<->," / "==>," / "<=>,") _ components:TermList _ ")" {
      return options.termFactory.create({ operator: op.slice(0, -1), components: components });
    }

Product
  = "(" _ components:TermList? _ ")" {
      return options.termFactory.create({ operator: ',', components: components || [] });
    }

Set
  = "{" _ components:TermList? _ "}" { return options.termFactory.create({ operator: '{}', components: components || [] }); }
  / "[" _ components:TermList? _ "]" { return options.termFactory.create({ operator: '[]', components: components || [] }); }

TermList
  = head:Term tail:(_ "," _ Term)* {
      const terms = [head];
      if (tail) {
        for (const t of tail) {
          terms.push(t[3]);
        }
      }
      return terms;
    }

AtomicTerm "atomic term"
  = chars:$([^(){}<>.,!?;% \t\n\r]+) { return options.termFactory.create(chars); }

Float "float"
  = val:$("-"? [0-9]+ ("." [0-9]+)?) { return parseFloat(val); }

_ "whitespace"
  = [ \t\n\r]*
