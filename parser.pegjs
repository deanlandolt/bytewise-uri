{
  // var base = require('base')
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

INTEGER
  = DIGIT19 DIGITS
  / DIGIT
  / '-' DIGIT19 DIGITS
  / '-' DIGIT

FRACTION
  = '.' DIGITS

EXPONENT
  = E DIGITS

DIGITS
  = DIGIT+

DIGIT
  = [0-9]

DIGIT19
  = [1-9]

HEX_DIGIT
  = [0-9a-fA-F]

OCTAL_DIGIT
  = [0-7]

BINARY_DIGIT
  = [01]

E
  = [eE] [+-]?


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

PATH_CHAR
  = COMPONENT_CHAR
  / SUB_DELIM_CHAR
  / [:@]

CTOR_BODY_CHAR
  = COMPONENT_CHAR
  / [@:+]

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
      // TODO:
      // keep a count of sequential of placeholders
      // keep track of whether we're nested or in the top level
      // do something less shitty, e.g. use a sigil object from typewise
      return {
        $placeholder: config[0],
        $prefix: config[1] || ''
      }
    }

VARIABLE_LEXICAL
  = prefix:VARIABLE_PREFIX ':' id:VARIABLE_IDENT { return [ id, prefix ] }
  / id:VARIABLE_IDENT { return [ id ] }

VARIABLE_PREFIX
  = str:$(COMPONENT_CHAR+) { return str }

VARIABLE_IDENT
  = str:$(COMPONENT_CHAR*) { return str }


BOOLEAN_COMPONENT 'a boolean'
  = 'true:' { return true }
  / 'false:' { return false }


NULL_COMPONENT 'null'
  = 'null:' { return null }


UNDEFINED_COMPONENT 'undefined'
  = 'undefined:' { return }


BINARY_COMPONENT 'binary data'
  = 'binary:' str:$(HEX_DIGIT*) { return str; bops.from(str, 'hex') }


STRING_COMPONENT 'a string'
  = STRING_CTOR
  / STRING_LITERAL

STRING_LITERAL
  = str:$(COMPONENT_CHAR+) { return str }

STRING_CTOR
 = 'string:' str:$(CTOR_BODY_CHAR*) { return str }


NUMBER_COMPONENT 'a number'
  = NUMBER_CTOR
  / NUMBER_LITERAL

NUMBER_LEXICAL
  = val:(NUMBER_LEXICAL_EXTENDED / NUMBER_LEXICAL_BASE) { return val }

NUMBER_LEXICAL_EXTENDED
  = '0' [oO] str:OCTAL_DIGIT+ { return parseInt(str.join(''), 8) }
  / '0' [bB] str:BINARY_DIGIT+ { return parseInt(str.join(''), 2) }

NUMBER_LEXICAL_BASE
  = str:$(
      '0' [xX] HEX_DIGIT+
    /  '-'? 'Infinity'
    / INTEGER FRACTION EXPONENT
    / INTEGER FRACTION
    / INTEGER EXPONENT
    / INTEGER
  ) { return Number(str) }

NUMBER_CTOR
  = 'number:' val:NUMBER_LEXICAL { return val }

NUMBER_LITERAL
  = val:NUMBER_LEXICAL '+' { return val }


DATE_COMPONENT 'a date'
  = DATE_CTOR
  / DATE_LITERAL

DATE_LITERAL
  = val:DATE_LEXICAL '@' { return val }

DATE_CTOR
  = 'date:' val:DATE_LEXICAL { return val }

DATE_LEXICAL
  = str:$(DATE_LEXICAL_ISO) { return new Date(str) }

DATE_LEXICAL_ISO
  = DATE_TIME
  / DATE


ARRAY_COMPONENT_EMPTY 'an empty array'
  = 'array:' { return [] }

ARRAY_COMPONENT 'an array'
  = ARRAY_CTOR
  / ARRAY_LITERAL

ARRAY_CTOR
  = 'array:' v:ARRAY_LITERAL { return v }

ARRAY_LITERAL
  = head:ARRAY_ELEMENT tail:ARRAY_NEXT_PART+ ','? {
      tail.unshift(head)
      return tail
    }
  / head:ARRAY_ELEMENT ','? { return [ head ] }

ARRAY_NEXT_PART
  = v:ARRAY_ELEMENT ',' { return v }

ARRAY_ELEMENT
  = UNARY_COMPONENT


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

/*
  ISO 8601 parser adapted from:
    https://github.com/for-GET/core-pegjs/blob/master/src/iso/8601-dates-times.pegjs
*/

/*
 * Data elements and interchange formats – Information interchange – Representation of dates and times
 *
 * https://en.wikipedia.org/wiki/ISO_8601
 * http://tools.ietf.org/html/rfc3339
 *
 * @append ietf/rfc5234-core-abnf.pegjs
 */

 /* http://tools.ietf.org/html/rfc3339#appendix-A ISO 8601 Collected ABNF */
 /* Date */

 DATE
   = DATESPEC_FULL
   / DATESPEC_YEAR
   / DATESPEC_MONTH
   / DATESPEC_MDAY
   / DATESPEC_WEEK
   / DATESPEC_WDAY
   / DATESPEC_YDAY

 TIME
   = TIMESPEC_BASE TIME_FRACTION? TIME_ZONE?

 DATE_TIME
   = DATE 'T' TIME

 DATE_CENTURY
   // 00-99
   = $(DIGIT DIGIT)

 DATE_DECADE
   // 0-9
   = DIGIT

 DATE_SUBDECADE
   // 0-9
   = DIGIT

 DATE_YEAR
   = DATE_DECADE DATE_SUBDECADE

 DATE_FULLYEAR
   = DATE_CENTURY DATE_YEAR

 DATE_MONTH
   // 01-12
   = $(DIGIT DIGIT)

 DATE_WDAY
   // 1-7
   // 1 is Monday, 7 is Sunday
   = DIGIT

 DATE_MDAY
   // 01-28, 01-29, 01-30, 01-31 based on
   // month/year
   = $(DIGIT DIGIT)

 DATE_YDAY
   // 001-365, 001-366 based on year
   = $(DIGIT DIGIT DIGIT)

 DATE_WEEK
   // 01-52, 01-53 based on year
   = $(DIGIT DIGIT)

 DATEPART_FULLYEAR
   = DATE_CENTURY? DATE_YEAR '-'?

 DATEPART_PTYEAR
   = '-' (DATE_SUBDECADE '-'?)?

 DATEPART_WKYEAR
   = DATEPART_PTYEAR
   / DATEPART_FULLYEAR

 DATEOPT_CENTURY
   = '-'
   / DATE_CENTURY

 DATEOPT_FULLYEAR
   = '-'
   / DATEPART_FULLYEAR

 DATEOPT_YEAR
   = '-'
   / DATE_YEAR '-'?

 DATEOPT_MONTH
   = '-'
   / DATE_MONTH '-'?

 DATEOPT_YEAR
   = '-'
   / DATE_WEEK '-'?

 DATESPEC_FULL
   = DATEPART_FULLYEAR DATE_MONTH '-'? DATE_MDAY

 DATESPEC_YEAR
   = DATE_CENTURY
   / DATEOPT_CENTURY DATE_YEAR

 DATESPEC_MONTH
   = '-' DATEOPT_YEAR DATE_MONTH ('-'? DATE_MDAY)

 DATESPEC_MDAY
   = "--" DATEOPT_MONTH DATE_MDAY

 DATESPEC_WEEK
   = DATEPART_WKYEAR "W" (DATE_WEEK / DATEOPT_YEAR DATE_WDAY)

 DATESPEC_WDAY
   = "---" DATE_WDAY

 DATESPEC_YDAY
   = DATEOPT_FULLYEAR DATE_YDAY


 /* Time */
 TIME_HOUR
   // 00-24
   = $(DIGIT DIGIT)

 TIME_MINUTE
   // 00-59
   = $(DIGIT DIGIT)

 TIME_SECOND
   // 00-58, 00-59, 00-60 based on
   // leap-second rules
   = $(DIGIT DIGIT)

 TIME_FRACTION
   = ("," / ".") $(DIGIT+)

 TIME_NUMOFFSET
   = ("+" / '-') TIME_HOUR (":"? TIME_MINUTE)?

 TIME_ZONE
   = "Z"
   / TIME_NUMOFFSET

 TIMEOPT_HOUR
   = '-'
   / TIME_HOUR ":"?

 TIMEOPT_MINUTE
   = '-'
   / TIME_MINUTE ":"?

 TIMESPEC_HOUR
   = TIME_HOUR (":"? TIME_MINUTE (":"? TIME_SECOND)?)?

 TIMESPEC_MINUTE
   = TIMEOPT_HOUR TIME_MINUTE (":"? TIME_SECOND)?

 TIMESPEC_SECOND
   = '-' TIMEOPT_MINUTE TIME_SECOND

 TIMESPEC_BASE
   = TIMESPEC_HOUR
   / TIMESPEC_MINUTE
   / TIMESPEC_SECOND


 /* Durations */
 DUR_SECOND
   = DIGIT+ "S"

 DUR_MINUTE
   = DIGIT+ "M" DUR_SECOND?

 DUR_HOUR
   = DIGIT+ "H" DUR_MINUTE?

 DUR_TIME
   = "T" (DUR_HOUR / DUR_MINUTE / DUR_SECOND)

 DUR_DAY
   = DIGIT+ "D"
 DUR_WEEK
   = DIGIT+ "W"
 DUR_MONTH
   = DIGIT+ "M" DUR_DAY?

 DUR_YEAR
   = DIGIT+ "Y" DUR_MONTH?

 DUR_DATE
   = (DUR_DAY / DUR_MONTH / DUR_YEAR) DUR_TIME?

 DURATION
   = "P" (DUR_DATE / DUR_TIME / DUR_WEEK)


 /* Periods */
 PERIOD_EXPLICIT
   = DATE_TIME "/" DATE_TIME

 PERIOD_START
   = DATE_TIME "/" DURATION

 PERIOD_END
   = DURATION "/" DATE_TIME

 PERIOD
   = PERIOD_EXPLICIT
   / PERIOD_START
   / PERIOD_END
