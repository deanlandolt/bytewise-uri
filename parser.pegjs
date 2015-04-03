{
  var codecs
  try {
    codecs = require('bytewise-core/util/codecs')
  }
  catch(e) {}
}


START
  = value:INDEX_PATH { return { type: 'index', value: value } }
  / value:KEY_PATH { return { type: 'key', value: value } }
  / value:COMPONENT { return { type: 'component', value: value } }

INDEX_PATH
  = parts:KEY_PATH PATH_SEP { return parts }

KEY_PATH
  = parts:PATH_PART+ { return parts }

PATH_PART
  = PATH_SEP part:COMPONENT { return part }

PATH_SEP
  = '/'

DIGIT
  = [0-9]

HEX_DIGIT
  = [0-9a-fA-F]

OCTAL_DIGIT
  = [0-7]

BINARY_DIGIT
  = [01]


RESERVED_CHAR
  = GEN_DELIM_CHAR / SUB_DELIM_CHAR

GEN_DELIM_CHAR
  = [:/?#\[\]@]

SUB_DELIM_CHAR
  = [!$&'()*+,;=]

PCT_ENCODED_CHAR
  = str:$('%' HEX_DIGIT HEX_DIGIT) { return decodeURIComponent(str) }

UNRESERVED_CHAR
  = [a-zA-Z0-9\-\._~]

COMPONENT_CHAR
  = UNRESERVED_CHAR
  / PCT_ENCODED_CHAR

S
  = ' '


COMPONENT
  = VARIADIC_COMPONENT
  / UNARY_COMPONENT

VARIADIC_COMPONENT
  = ARRAY_COMPONENT
  / OBJECT_COMPONENT

UNARY_COMPONENT
  = NULLARY_COMPONENT
  / GROUP_COMPONENT
  / VARIABLE_COMPONENT
  / NUMBER_COMPONENT
  / DATE_COMPONENT
  / BINARY_COMPONENT
  / STRING_COMPONENT

NULLARY_COMPONENT
  = ARRAY_COMPONENT_EMPTY
  / OBJECT_COMPONENT_EMPTY
  / BOOLEAN_COMPONENT
  / NULL_COMPONENT
  / UNDEFINED_COMPONENT


GROUP_COMPONENT 'a group'
  = '(' val:VARIADIC_COMPONENT ')' { return val }
  / '(' val:UNARY_COMPONENT ')' { return [ val ] }
  / '()' { return [] }


VARIABLE_COMPONENT 'a template variable'
  = '{' S* config:VARIABLE_LEXICAL S* '}' {
      // TODO: keep a sequential reference to each hole placeholder created
      // and do something less shitty, e.g. use a sigil object from typewise
      return {
        $name: config[0] || '',
        $range: config[1] || ''
      }
    }

VARIABLE_LEXICAL
  = name:VARIABLE_NAME S* ':' S* range:VARIABLE_RANGE { return [ name, range ] }
  / name:VARIABLE_NAME { return [ name ] }

VARIABLE_NAME
  = '*' { return '' }
  / c:COMPONENT_CHAR+ { return c.join('') }

VARIABLE_RANGE
  = '*' { return '' }
  / c:COMPONENT_CHAR+ { return c.join('') }


BOOLEAN_COMPONENT 'a boolean'
  = 'true:' { return true }
  / 'false:' { return false }


NULL_COMPONENT 'null'
  = 'null:' { return null }


UNDEFINED_COMPONENT 'undefined'
  = 'undefined:' { return }


BINARY_COMPONENT 'binary data'
  = 'binary:' c:HEX_DIGIT* {
      var str = c.join('')
      return codecs ? codecs.HEX.encode(str) : ('BINARY::' + str)
    }


STRING_COMPONENT 'a string'
  = 'string:' c:STRING_CTOR_CHAR* { return c.join('') } // string ctor
  / c:COMPONENT_CHAR+ { return c.join('') } // string literal

STRING_CTOR_CHAR
  = COMPONENT_CHAR
  / [@+] // allow some extra chars in ctor-prefixed forms


NUMBER_COMPONENT 'a number'
  = NUMBER_EXTENDED_CTOR
  / NUMBER_EXTENDED_LITERAL
  / NUMBER_BASE

NUMBER_EXTENDED_CTOR
  = 'number:' v:(NUMBER_OCTAL_SYNTAX / NUMBER_BINARY_SYNTAX) { return v }

NUMBER_EXTENDED_LITERAL
  = v:(NUMBER_OCTAL_SYNTAX / NUMBER_BINARY_SYNTAX) '+' { return v }

NUMBER_OCTAL_SYNTAX
  = '0' [oO] str:OCTAL_DIGIT+ { return parseInt(str.join(''), 8) }

NUMBER_BINARY_SYNTAX
  = '0' [bB] str:BINARY_DIGIT+ { return parseInt(str.join(''), 2) }

NUMBER_BASE
  = str:NUMBER_LEXICAL {
    // TODO: defer to parser provided by type system
    var value = Number(str)

    // test for invalid
    if (value !== value)
      throw new TypeError('Invalid Number: ' + str)

    return value
  }

NUMBER_LEXICAL
  = 'number:' c:COMPONENT_CHAR+ { return c.join('') } // number ctor
  / c:COMPONENT_CHAR+ '+' { return c.join('') } // number literal


DATE_COMPONENT 'a date'
  = str:DATE_LEXICAL {
      // TODO: defer to parser provided by type system
      var value = new Date(str)

      // test for invalid
      if (+value !== +value)
        throw new TypeError('Invalid Date: ' + str)

      return value
    }

DATE_LEXICAL
  = 'date:' str:DATE_LEXICAL_BASE { return str } // date ctor
  / str:DATE_LEXICAL_BASE '@' { return str } // date literal

// dates requires 4 digit year
DATE_LEXICAL_BASE
  = year:DATE_YEAR rest:DATE_REST { console.log(year, rest); return year + rest }

DATE_YEAR
  = c:(DIGIT DIGIT DIGIT DIGIT) { return c.join('') }

DATE_REST
  = c:DATE_CHAR* { return c.join('') }

DATE_CHAR
  = COMPONENT_CHAR
  / [:+] // allow + for timezons


ARRAY_COMPONENT_EMPTY 'an empty array'
  = 'array:' { return [] }

ARRAY_COMPONENT 'an array'
  = ARRAY_CTOR
  / ARRAY_LITERAL

ARRAY_CTOR
  = 'array:' v:ARRAY_LITERAL { return v }
  / 'array:' head:UNARY_COMPONENT { return [ head ] }

ARRAY_LITERAL
  = head:UNARY_COMPONENT tail:ARRAY_NEXT_PART+ ','? {
      tail.unshift(head)
      return tail
    }
  / head:UNARY_COMPONENT ',' { return [ head ] }

ARRAY_NEXT_PART
  = ',' v:UNARY_COMPONENT { return v }


OBJECT_COMPONENT_EMPTY 'an empty object'
  = 'object:' { return {} }

OBJECT_COMPONENT 'an object'
  = kvs:( OBJECT_CTOR / OBJECT_LITERAL ) {
    var obj = {}
    for (var i = 0, length = kvs.length; i < length; ++i) {
      var kv = kvs[i]
      obj[kv[0]] = kv[1]
    }
    return obj
  }

OBJECT_CTOR
  = 'object:' kvs:OBJECT_LITERAL { return kvs }

OBJECT_LITERAL
  = head:OBJECT_ELEMENT tail:OBJECT_NEXT_PART+ ','? {
      tail.unshift(head)
      return tail
    }
  / head:OBJECT_ELEMENT ','? { return [ head ] }


OBJECT_NEXT_PART
  = ',' kv:OBJECT_ELEMENT { return kv }

OBJECT_ELEMENT
  = k:STRING_COMPONENT '=' v:UNARY_COMPONENT { return [ k, v ] }
