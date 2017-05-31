Brain = (function (){
/************************ Utils *************************/

  var ErrOutOfRange = (function () {
    var msg = "Data pointer out of range.";
    if (RangeError) return new RangeError(msg);
    return new Error(msg);
  })();

  var ErrDivisionByZero = (function () {
    var msg = "Division by zero is impossible.";
    if (RangeError) return new RangeError(msg);
    return new Error(msg);
  })();

/************************ Tokens ***********************/

  var tokens = {
    '<' : 'TT_SHIFT_LEFT',
    '>' : 'TT_SHIFT_RIGHT',
    '^' : 'TT_SHIFT_JUMP',
    '+' : 'TT_INCREMENT',
    '-' : 'TT_DECREMENT',
    '.' : 'TT_OUTPUT',
    ',' : 'TT_INPUT',
    '[' : 'TT_BEGIN_WHILE',
    ']' : 'TT_END_WHILE',
    '{' : 'TT_BEGIN_FOR',
    '}' : 'TT_END_FOR',
    '*' : 'TT_MUL',
    '/' : 'TT_DIV',
    '%' : 'TT_REM',
    '#' : 'TT_DEBUG',
    '!' : 'TT_BREAK',
    '?' : 'TT_IF_THEN',
    ':' : 'TT_IF_ELSE',
    ';' : 'TT_IF_END',
    '$' : 'TT_FLOAT'
  };

/************************ AST *************************/

  var Stmt = (function() {
    var Stmt = function() {};
    Stmt.prototype = {
      update_statement: function(update) { return false; },
      value: function() { return this; },
      exec: function(delegate) { },
      zerofy: function (tapeObj) {
        if (tapeObj.data[tapeObj.d_ptr] === undefined) {
          tapeObj.data[tapeObj.d_ptr] = 0;
        }
      }
    };

    return Stmt;
  })();

  var FloatStmt = (function() {
    var FloatStmt = function(){ };
    FloatStmt.prototype = Object.create(Stmt.prototype);
    FloatStmt.prototype.exec = function(delegate) {
      this.zerofy(delegate);
      delegate.user_output((delegate.data[delegate.d_ptr]/100.0).toFixed(2));
    };

    return FloatStmt;
  })();

  var BreakStmt = (function() {
    var BreakStmt = function(){ };
    BreakStmt.prototype = Object.create(Stmt.prototype);
    return BreakStmt;
  })();

  var DebugStmt = (function() {
    var DebugStmt = function(){ };
    DebugStmt.prototype = Object.create(Stmt.prototype);
    DebugStmt.prototype.exec = function(delegate) {
      this.zerofy(delegate);
      delegate.user_output("Index Pointer: " + delegate.d_ptr +
                           " Value at Index Pointer: " + delegate.data[delegate.d_ptr]);
    };

    return DebugStmt;
  })();

  var InputStmt = (function() {
    var InputStmt = function(){ };
    InputStmt.prototype = Object.create(Stmt.prototype);
    InputStmt.prototype.exec = function(delegate) {
      var that = delegate;
      return (function () {
        that.user_input(function (data) {
          data = data.toString();
          that.data[that.d_ptr] = data.charCodeAt(0) || 10;
          that.run();
        });
      });
    }

    return InputStmt;
  })();

  var OutputStmt = (function() {
    var OutputStmt = function(){ };
    OutputStmt.prototype = Object.create(Stmt.prototype);
    OutputStmt.prototype.exec = function(delegate) {
      delegate.user_output(String.fromCharCode(delegate.data[delegate.d_ptr]));
    };

    return OutputStmt;
  })();

  var LoopStmt = (function() {
    var LoopStmt = function(stmts, type) {
      this.type = 'undefined';
      this.stmts = null;
      this.counter = 0;
      this.i_ptr = 0;

      if (tokens[type] === 'TT_BEGIN_WHILE'
       || tokens[type] === 'TT_BEGIN_FOR') {
        this.type = type;
	this.stmts = stmts;
      }
    };

    LoopStmt.prototype = Object.create(Stmt.prototype);
    LoopStmt.prototype.exec = function(delegate) {
      this.zerofy(delegate);
      if (this.i_ptr >= this.stmts.length) {
        this.i_ptr = 0;
      }

      if (tokens[this.type] === 'TT_BEGIN_WHILE') {
        while(delegate.data[delegate.d_ptr]) {
          while(stmt = this.stmts[this.i_ptr]) {
            var inputFunction = stmt.exec(delegate);
            if (inputFunction === true) {
              return true;
            }

            this.i_ptr++;
            if (stmt instanceof InputStmt) {
              inputFunction(this.data, this.d_ptr);
              return true; // we give the control to the user
            }      
          }

          this.i_ptr = 0;
        }
      } else if (tokens[this.type] === 'TT_BEGIN_FOR') {
        if (!this.counter) {
          this.counter = delegate.data[delegate.d_ptr];
        }

        while (this.counter > 0) {
          while(stmt = this.stmts[this.i_ptr]) {
            var inputFunction = stmt.exec(delegate);
            if (inputFunction === true) {
              return true;
            } 
            
            this.i_ptr++;
            if (stmt instanceof InputStmt) {
              inputFunction(this.data, this.d_ptr);
              return true; // we give the control to the user
            }      
          }

          this.i_ptr = 0;
          this.counter--;
        }
      }
    };

    return LoopStmt;
  })();

  var ArithmeticStmt = (function() {
    var ArithmeticStmt = function(type) {
      this.type = 'undefined';

      if (tokens[type] === 'TT_MUL'
       || tokens[type] === 'TT_REM'
       || tokens[type] === 'TT_DIV') {
        this.type = type;
      }
    };

    ArithmeticStmt.prototype = Object.create(Stmt.prototype);
    ArithmeticStmt.prototype.exec = function(delegate) {
      if ((delegate.d_ptr === 0 || delegate.data[delegate.d_ptr-1] === 0) &&
         (tokens[this.type] === 'TT_DIV' || tokens[this.type] === 'TT_REM')) {
        throw ErrDivisionByZero;
      } 

      this.zerofy(delegate);
      if (delegate.d_ptr === 0 && tokens[this.type] === 'TT_MUL') {
        delegate.data[delegate.d_ptr] = 0;
      }

      var curValue = delegate.data[delegate.d_ptr];
      var predValue = delegate.data[delegate.d_ptr-1];

      if (tokens[this.type] === 'TT_MUL') {
        delegate.data[delegate.d_ptr] *= predValue;
      } else if (tokens[this.type] === 'TT_DIV') {
        delegate.data[delegate.d_ptr] = Math.floor(curValue/predValue);
      } else if (tokens[this.type] === 'TT_REM') {
        delegate.data[delegate.d_ptr] %= predValue;
      }
    };

    return ArithmeticStmt;
  })();

  var IncrementStmt = (function() {
    var IncrementStmt = function(increment) {
      this.increment = increment;
    };

    IncrementStmt.prototype = Object.create(Stmt.prototype);
    IncrementStmt.prototype.update_statement = function(update) {
      if (tokens[update] === 'TT_INCREMENT') {
        this.increment++;
        return true;
      } else if (tokens[update] === 'TT_DECREMENT') {
        this.increment--;
        return true;
      }

      return false;
    };

    IncrementStmt.prototype.exec = function(delegate) {
      this.zerofy(delegate);
      delegate.data[delegate.d_ptr] += this.increment;
    };

    return IncrementStmt;
  })();

  var JumpStmt = (function() {
    var JumpStmt = function(){ };
    JumpStmt.prototype = Object.create(Stmt.prototype);
    JumpStmt.prototype.exec = function(delegate) {
      if (delegate.data[delegate.d_ptr] < 0) {
        throw ErrOutOfRange;
      }

      delegate.d_ptr = delegate.data[delegate.d_ptr];
      delegate.d_ptr = delegate.d_ptr || 0;
    };

    return JumpStmt;
  })();

  var ShiftStmt = (function() {
    var ShiftStmt = function(shift) {
      this.shift = shift;
    };

    ShiftStmt.prototype = Object.create(Stmt.prototype);
    ShiftStmt.prototype.update_statement = function(update) {
      if (tokens[update] === 'TT_SHIFT_RIGHT') {
        this.shift++;
        return true;
      } else if (tokens[update] === 'TT_SHIFT_LEFT') {
        this.shift--;
        return true;
      }

      return false;
    };

    ShiftStmt.prototype.exec = function(delegate) {
      if (delegate.d_ptr + this.shift < 0) {
        throw ErrOutOfRange;
      }

      delegate.d_ptr += this.shift;
    };

    return ShiftStmt;
  })();

  var IfStmt = (function() {
    var IfStmt = function(stmts_then) {
      this.stmts_then = stmts_then;
      this.stmts_else = null;
    };

    IfStmt.prototype = Object.create(Stmt.prototype);
    IfStmt.prototype.set_else = function(stmts_else) {
      this.stmts_else = stmts_else;
    };

    return IfStmt;
  })();

/************************ Parser *************************/
  // Class: Parser @arg (String) program code
  //          this.tokenized:  Array of tokens
  var Parser = (function () {
    var Parser = function(code) {
      this.code = code.split('');
      this.i = 0;
      this.tokenized = [];
      this.has_done_then = false;
      this.parse(this.tokenized, 0);
    };

    Parser.prototype = {
      parse : function(stmts, level) {
        while(c = this.code[this.i++]) {
          var stmt = null;

          if (stmts.length > 0 && stmts[stmts.length-1].update_statement(c)) {
            continue;
          }

          switch (tokens[c]) {
            case 'TT_SHIFT_LEFT':
              stmt = new ShiftStmt(-1);
              break;

            case 'TT_SHIFT_RIGHT':
              stmt = new ShiftStmt(1);
              break;

            case 'TT_SHIFT_JUMP':
              stmt = new JumpStmt();
              break;

            case 'TT_INCREMENT':
              stmt = new IncrementStmt(1);
              break;

            case 'TT_DECREMENT':
              stmt = new IncrementStmt(-1);
              break;

      	    case 'TT_OUTPUT':
      	      stmt = new OutputStmt();
      	      break;

      	    case 'TT_INPUT':
      	      stmt = new InputStmt();
      	      break;

      	    case 'TT_BEGIN_WHILE':
                  case 'TT_BEGIN_FOR':
      	    {
      	      var loop_stmts = [];
      	      var ch = c;
      	      this.parse(loop_stmts, level + 1);
      	      stmt = new LoopStmt(loop_stmts, ch);
      	      break;
      	    }

      	    case 'TT_END_WHILE':
            case 'TT_END_FOR':
            case 'TT_IF_END':
      	    {
      	      if (level > 0) {
                // Exit recursivity
                return;
      	      }

      	      break;
      	    }

            case 'TT_IF_THEN':
            {
              var if_stmts = [];
              this.parse(if_stmts, level + 1);
              stmt = new IfStmt(if_stmts);
              break;
            }

            case 'TT_IF_ELSE':
            {
              if (!this.has_done_then) {
                if (level == 0) {
                  break;
                }

                this.i--;
                this.has_done_then = true;
                return; // exit recursivity
              }

              if (stmts.length > 0) {
                var theStmt = stmts[stmts.length-1];
                if (theStmt instanceof IfStmt) {
                  var else_stmts = [];
                  this.parse(else_stmts, level + 1);
                  theStmt.set_else(else_stmts);
                }
              }

              this.has_done_then = false; // reset flag
              break;
            }

            case 'TT_MUL':
            case 'TT_DIV':
            case 'TT_REM':
              stmt = new ArithmeticStmt(c);
              break;

            case 'TT_DEBUG':
              stmt = new DebugStmt();
              break;

            case 'TT_BREAK':
              stmt = new BreakStmt();
              break;

            case 'TT_FLOAT':
              stmt = new FloatStmt();
              break;

            default:
              // Ignored character
              continue;
          }

          if (stmt) {
            stmts.push(stmt);
          }
        }
      }
    };

    return Parser;
  })();

/************************ Interpreter *************************/
  // Interpreter
  var Interpreter = (function () {

    var Interpreter = function (input, output, result) {
      this.user_input = input;
      this.user_output = output;
      this.result = typeof result === "function" ? result : function () {};
      this.reset();
    };

    Interpreter.prototype = {

      reset: function () {
        this.d_ptr = 0;
        this.i_ptr = 0;
        // instead of allocating 30000 bytes, we consider undefined to be 0
        this.data = [];
      },

      evaluate: function (code) {
         this.stmts = (code instanceof Parser ? code : new Parser(code)).tokenized;
         this.i_ptr = 0;
         this.run();
      },

      run: function () {
        while(stmt = this.stmts[this.i_ptr]) {
          var inputFunction = stmt.exec(this);
          if (inputFunction === true) {
            return;
          }

          this.i_ptr++;
          if (stmt instanceof InputStmt) {
            inputFunction(this.data, this.d_ptr);
            return; // we give the control to the user
          }
        }

        this.result(this.data, this.d_ptr);
      }
    }
    return Interpreter;
  })();

  return {
    Parser: Parser,
    Interpreter: Interpreter,
  };
})();
