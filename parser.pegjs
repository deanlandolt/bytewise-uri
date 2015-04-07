{
  var base = require('./base')
  var serialization = base.serialization
}


Path
  = PathSuffix
  / PathInfix
  / PathComponent
  / PathPrefix
  / PathKey

PathPrefix
  = data:PathPart+ '/' { return [ data, 'prefix' ] }

PathSuffix
  = data:PathSuffixPart+ { return [ data, 'suffix' ] }

PathInfix
  = head:Component data:PathPart+ {
      data.unshift(head)
      return [ data, 'infix' ]
    }

PathKey
  = data:PathPart+ { return [ data, true ] }

PathComponent
  = data:Component { return [ data, false ] }


PathPart
  = '/' part:Component { return part }

PathSuffixPart
  = part:Component '/' { return part }

ComponentChar
  = UnreservedChar
  / PctEncodedChar

UnreservedChar
  = [a-zA-Z0-9\-\._~]

PctEncodedChar
  = str:$('%' HexDigit HexDigit) { return decodeURIComponent(str) }


ReservedChar
  = GenDelimChar / SubDelimChar

GenDelimChar
  = [:/?#\[\]@]

SubDelimChar
  = [!$&'()*+,;=]


S
  = ' '

Digit
  = [0-9]

HexDigit
  = [0-9a-fA-F]

OctalDigit
  = [0-7]

BinaryDigit
  = [01]


Component
  = RecursiveComponent
  / AtomicComponent

RecursiveComponent
  = args:ArrayLiteral { return serialization.ARRAY.revive(args) }
  / args:ObjectLiteral { return serialization.OBJECT.revive(args) }

AtomicComponent
  = GroupedComponent
  / DateLiteral
  / NumberLiteral
  / CtorComponent
  / VariableComponent
  / StringLiteral


GroupedComponent 'a group'
  = '(' val:RecursiveComponent ')' { return val }
  / '(' val:AtomicComponent ')' { return [ val ] }


VariableComponent 'a template variable'
  = '{' S* args:VariableLexical S* '}' {
      return serialization.VARIABLE.revive(args)
    }

VariableLexical
  = name:VariableName S* ':' S* range:VariableRange { return [ name, range ] }
  / name:VariableName { return [ name ] }

VariableName
  = '*' { return '' }
  / c:ComponentChar+ { return c.join('') }

VariableRange
  = '*' { return '' }
  / c:ComponentChar+ { return c.join('') }


RangeComponent 'a range'
  = '*:' c:ComponentChar+ { return c.join('') } // TODO look up in type system
  / '*:(' parts:RangePart+ ')' { return parts }
  / '*' { return [ [], [] ] }

RangePart
  = c:ComponentChar+ ',' { return c.join('') }
  / '*' { return [] }


CtorComponent 'a constructor'
  = head:ComponentChar+ ':' body:CtorBodyChar* {
    var type = serialization.aliasedType(head.join(''))
    if (!type)
      throw new Error('Uknown type alias: ' + head.join(''))

    return type.serialization.parse(body.join(''))
  }

CtorBodyChar
  = ComponentChar
  / [@+] // allow some extra chars in ctor-prefixed forms


StringLiteral 'a string'
  = c:ComponentChar+ { return c.join('') }


NumberLiteral 'a number'
  = NumberHexLiteral
  / NumberOctalLiteral
  / NumberBinaryLiteral
  / c:ComponentChar+ '+' {
      return serialization.NUMBER.revive([ c.join('') ])
    }

NumberHexLiteral
  = '0' [xX] str:HexDigit+ '+' { return parseInt(str.join(''), 16) }

NumberOctalLiteral
  = '0' [oO] str:OctalDigit+ '+' { return parseInt(str.join(''), 8) }

NumberBinaryLiteral
  = '0' [bB] str:BinaryDigit+ '+' { return parseInt(str.join(''), 2) }


DateLiteral 'a date'
  = year:DateYear rest:DateChar* '@' {
      return serialization.DATE.revive([ year + rest.join('') ])
    }

DateYear
  = c:(Digit Digit Digit Digit) { return c.join('') }

DateChar
  = ComponentChar
  / [:+] // allow + for timezone offset


ArrayLiteral 'an array'
  = head:AtomicComponent tail:ArrayNextPart+ ','? {
      tail.unshift(head)
      return tail
    }
  / head:AtomicComponent ',' { return [ head ] }
  

ArrayNextPart
  = ',' v:AtomicComponent { return v }


ObjectLiteral 'an object'
  = head:ObjectLexicalElement tail:ObjectNextPart+ ','? {
      tail.unshift(head)
      return tail
    }
  / head:ObjectLexicalElement ','? { return [ head ] }


ObjectNextPart
  = ',' pair:ObjectLexicalElement { return pair }

ObjectLexicalElement
  = k:StringLiteral '=' v:AtomicComponent { return [ k, v ] }
