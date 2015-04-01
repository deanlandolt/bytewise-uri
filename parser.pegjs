{
  // var bytewise = require('bytewise-core')
}


START
  = value:PATH { return value }
  / value:PATH_COMPONENT { return value }

PATH_INDEX
  = PATH PATH_SEP

PATH
  = parts:PATH_PART+ { return parts }

PATH_PART
  = PATH_SEP value:PATH_COMPONENT { return value }

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

CTOR_CHAR
  = COMPONENT_CHAR
  / [@:+]


PATH_COMPONENT
  = VARIADIC_COMPONENT
  / UNARY_COMPONENT

VARIADIC_COMPONENT
  = ARRAY_COMPONENT

UNARY_COMPONENT
  = GROUP_COMPONENT
  / BOOLEAN_COMPONENT
  / NULL_COMPONENT
  / UNDEFINED_COMPONENT
  / NUMBER_COMPONENT
  / DATE_COMPONENT
  / STRING_COMPONENT


GROUP_COMPONENT 'a group'
  = '(' val:PATH_COMPONENT ')' { return val }


BOOLEAN_COMPONENT 'true'
  = 'true:' { return true }
  / 'false:' { return false }


FALSE_COMPONENT 'false'
  = 'false:' { return false }


NULL_COMPONENT 'null'
  = 'null:' { return null }


UNDEFINED_COMPONENT 'undefined'
  = 'undefined:' { return }


STRING_COMPONENT 'a string'
  = STRING_CTOR
  / STRING_LITERAL

STRING_LITERAL
  = chars:COMPONENT_CHAR+ { return chars.join('') }

STRING_CTOR
 = 'string:' chars:CTOR_CHAR* { return chars.join('') }


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
    / '0' [oO] str:OCTAL_DIGIT+ { return parseInt(str.join(''), 8) }
    / '0' [bB] str:BINARY_DIGIT+ { return parseInt(str.join(''), 2) }
    /  '-'? 'Infinity'
    / INTEGER FRACTION EXPONENT
    / INTEGER FRACTION
    / INTEGER EXPONENT
    / INTEGER
  ) { return Number(str) }

NUMBER_CTOR
  = 'number:' val:NUMBER_LEXICAL { return val }

NUMBER_LITERAL
  = vals:NUMBER_LITERAL_PART+ tail:NUMBER_LEXICAL? {
    vals.push(tail || 0)
    return vals.reduce(function (a, b) { return a + b  })
  }

NUMBER_LITERAL_PART
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





ARRAY_COMPONENT
  = ARRAY_CTOR
  / ARRAY_LITERAL

ARRAY_CTOR
  = 'array:' val:ARRAY_LITERAL { return val }
  / 'array:' val:UNARY_COMPONENT { return [ val ] }
  / 'array:' { return [] }

ARRAY_LITERAL
  = vals:ARRAY_LITERAL_PART+ tail:UNARY_COMPONENT {
      vals.push(tail)
      return vals
    }
  / vals:ARRAY_LITERAL_PART+ { return vals }

ARRAY_LITERAL_PART
  = val:UNARY_COMPONENT ',' { return val }


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
   = datespec_full
   / datespec_year
   / datespec_month
   / datespec_mday
   / datespec_week
   / datespec_wday
   / datespec_yday

 TIME
   = timespec_base time_fraction? time_zone?

 DATE_TIME
   = DATE 'T' TIME

 date_century
   // 00-99
   = $(DIGIT DIGIT)

 date_decade
   // 0-9
   = DIGIT

 date_subdecade
   // 0-9
   = DIGIT

 date_year
   = date_decade date_subdecade

 date_fullyear
   = date_century date_year

 date_month
   // 01-12
   = $(DIGIT DIGIT)

 date_wday
   // 1-7
   // 1 is Monday, 7 is Sunday
   = DIGIT

 date_mday
   // 01-28, 01-29, 01-30, 01-31 based on
   // month/year
   = $(DIGIT DIGIT)

 date_yday
   // 001-365, 001-366 based on year
   = $(DIGIT DIGIT DIGIT)

 date_week
   // 01-52, 01-53 based on year
   = $(DIGIT DIGIT)

 datepart_fullyear
   = date_century? date_year '-'?

 datepart_ptyear
   = '-' (date_subdecade '-'?)?

 datepart_wkyear
   = datepart_ptyear
   / datepart_fullyear

 dateopt_century
   = '-'
   / date_century

 dateopt_fullyear
   = '-'
   / datepart_fullyear

 dateopt_year
   = '-'
   / date_year '-'?

 dateopt_month
   = '-'
   / date_month '-'?

 dateopt_week
   = '-'
   / date_week '-'?

 datespec_full
   = datepart_fullyear date_month '-'? date_mday

 datespec_year
   = date_century
   / dateopt_century date_year

 datespec_month
   = '-' dateopt_year date_month ('-'? date_mday)

 datespec_mday
   = "--" dateopt_month date_mday

 datespec_week
   = datepart_wkyear "W" (date_week / dateopt_week date_wday)

 datespec_wday
   = "---" date_wday

 datespec_yday
   = dateopt_fullyear date_yday


 /* Time */
 time_hour
   // 00-24
   = $(DIGIT DIGIT)

 time_minute
   // 00-59
   = $(DIGIT DIGIT)

 time_second
   // 00-58, 00-59, 00-60 based on
   // leap-second rules
   = $(DIGIT DIGIT)

 time_fraction
   = ("," / ".") $(DIGIT+)

 time_numoffset
   = ("+" / '-') time_hour (":"? time_minute)?

 time_zone
   = "Z"
   / time_numoffset

 timeopt_hour
   = '-'
   / time_hour ":"?

 timeopt_minute
   = '-'
   / time_minute ":"?

 timespec_hour
   = time_hour (":"? time_minute (":"? time_second)?)?

 timespec_minute
   = timeopt_hour time_minute (":"? time_second)?

 timespec_second
   = '-' timeopt_minute time_second

 timespec_base
   = timespec_hour
   / timespec_minute
   / timespec_second


 /* Durations */
 dur_second
   = DIGIT+ "S"

 dur_minute
   = DIGIT+ "M" dur_second?

 dur_hour
   = DIGIT+ "H" dur_minute?

 dur_time
   = "T" (dur_hour / dur_minute / dur_second)

 dur_day
   = DIGIT+ "D"
 dur_week
   = DIGIT+ "W"
 dur_month
   = DIGIT+ "M" dur_day?

 dur_year
   = DIGIT+ "Y" dur_month?

 dur_date
   = (dur_day / dur_month / dur_year) dur_time?

 duration
   = "P" (dur_date / dur_time / dur_week)


 /* Periods */
 period_explicit
   = DATE_TIME "/" DATE_TIME

 period_start
   = DATE_TIME "/" duration

 period_end
   = duration "/" DATE_TIME

 period
   = period_explicit
   / period_start
   / period_end
