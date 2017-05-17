Brain = (function (){
/************************ Utils *************************/

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

  var Expr = (function() {
    var Expr = function() {};
    Expr.prototype = {
      update_expression : function(update) { return false; },
      value : function() { return this; }
    }
    return Expr;
  })();

  var FloatExpr = (function() {
    var FloatExpr = function(){ };
    FloatExpr.prototype = Object.create(Expr.prototype);
    return FloatExpr;
  })();

  var BreakExpr = (function() {
    var BreakExpr = function(){ };
    BreakExpr.prototype = Object.create(Expr.prototype);
    return BreakExpr;
  })();

  var DebugExpr = (function() {
    var DebugExpr = function(){ };
    DebugExpr.prototype = Object.create(Expr.prototype);
    return DebugExpr;
  })();

  var InputExpr = (function() {
    var InputExpr = function(){ };
    InputExpr.prototype = Object.create(Expr.prototype);
    return InputExpr;
  })();

  var OutputExpr = (function() {
    var OutputExpr = function(){ };
    OutputExpr.prototype = Object.create(Expr.prototype);
    return OutputExpr;
  })();

  var LoopExpr = (function() {
    var LoopExpr = function(exprs, type) {
      this.type = 'undefined';
      this.exprs = null;

      if (tokens[type] === 'TT_BEGIN_WHILE'
       || tokens[type] === 'TT_BEGIN_FOR') {
        this.type = type;
	this.exprs = exprs;
      }
    };

    LoopExpr.prototype = Object.create(Expr.prototype);
    return LoopExpr;
  })();

  var ArithmeticExpr = (function() {
    var ArithmeticExpr = function(type) {
      this.type = 'undefined';

      if (tokens[type] === 'TT_MUL'
       || tokens[type] === 'TT_REM'
       || tokens[type] === 'TT_DIV') {
        this.type = type;
      }
    };

    ArithmeticExpr.prototype = Object.create(Expr.prototype);
    return ArithmeticExpr;
  })();

  var IncrementExpr = (function() {
    var IncrementExpr = function(increment) {
      this.increment = increment;
    };

    IncrementExpr.prototype = Object.create(Expr.prototype);
    IncrementExpr.prototype.update_expression = function(update) {
      if (tokens[update] === 'TT_INCREMENT') {
        this.increment++;
        return true;
      } else if (tokens[update] === 'TT_DECREMENT') {
        this.increment--;
        return true;
      }

      return false;
    };

    return IncrementExpr;
  })();

  var JumpExpr = (function() {
    var JumpExpr = function(){ };
    JumpExpr.prototype = Object.create(Expr.prototype);
    return JumpExpr;
  })();

  var ShiftExpr = (function() {
    var ShiftExpr = function(shift) {
      this.shift = shift;
    };

    ShiftExpr.prototype = Object.create(Expr.prototype);
    ShiftExpr.prototype.update_expression = function(update) {
      if (tokens[update] === 'TT_SHIFT_RIGHT') {
        this.shift++;
        return true;
      } else if (tokens[update] === 'TT_SHIFT_LEFT') {
        this.shift--;
        return true;
      }

      return false;
    };

    return ShiftExpr;
  })();

  var IfExpr = (function() {
    var IfExpr = function(exprs_then) {
      this.exprs_then = exprs_then;
      this.exprs_else = null;
    };

    IfExpr.prototype = Object.create(Expr.prototype);
    IfExpr.prototype.set_else = function(exprs_else) {
      this.exprs_else = exprs_else;
    };

    return IfExpr;
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
      parse : function(exprs, level) {
        while(c = this.code[this.i++]) {
          var expr = null;

          if (exprs.length > 0 && exprs[exprs.length-1].update_expression(c)) {
            continue;
          }

          switch (tokens[c]) {
            case 'TT_SHIFT_LEFT':
              expr = new ShiftExpr(-1);
              break;

            case 'TT_SHIFT_RIGHT':
              expr = new ShiftExpr(1);
              break;

            case 'TT_SHIFT_JUMP':
              expr = new JumpExpr();
              break;

            case 'TT_INCREMENT':
              expr = new IncrementExpr(1);
              break;

            case 'TT_DECREMENT':
              expr = new IncrementExpr(-1);
              break;

	    case 'TT_OUTPUT':
	      expr = new OutputExpr();
	      break;

	    case 'TT_INPUT':
	      expr = new InputExpr();
	      break;

	    case 'TT_BEGIN_WHILE':
            case 'TT_BEGIN_FOR':
	    {
	      var loop_exprs = [];
	      var ch = c;
	      this.parse(loop_exprs, level + 1);
	      expr = new LoopExpr(loop_exprs, ch);
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
              var if_exprs = [];
              this.parse(if_exprs, level + 1);
              expr = new IfExpr(if_exprs);
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

              if (exprs.length > 0) {
                var theExpr = exprs[exprs.length-1];
                if (theExpr instanceof IfExpr) {
                  var else_exprs = [];
                  this.parse(else_exprs, level + 1);
                  theExpr.set_else(else_exprs);
                }
              }

              this.has_done_then = false; // reset flag
              break;
            }

            case 'TT_MUL':
            case 'TT_DIV':
            case 'TT_REM':
              expr = new ArithmeticExpr(c);
              break;

            case 'TT_DEBUG':
              expr = new DebugExpr();
              break;

            case 'TT_BREAK':
              expr = new BreakExpr();
              break;

            case 'TT_FLOAT':
              expr = new FloatExpr();
              break;

            default:
              // Ignored character
              continue;
          }

          if (expr) {
            exprs.push(expr);
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
         this.code = (code instanceof Parser ? code : new Parser(code)).tokenized;
         this.i_ptr = 0;
         this.run();
      },

      run: function () {
        var cont = true,
            instruction, instruction_name;
            var i =0;
        while (typeof cont !== "function") {
          this.instruction = this.code[this.i_ptr];
          if (!this.instruction) {
            cont = this.result;
            continue;
          }
          cont = this[this.instruction.type]();
          this.i_ptr++;
        }
        cont(this.data, this.d_ptr);
      },

      increment_pointer: function () {
        this.d_ptr++;
      },

      decrement_pointer: function () {
        if (this.d_ptr === 0) throw ErrOutOfRange;
        this.d_ptr--;
      },

      zerofy: function () {
        if (this.data[this.d_ptr] === undefined) this.data[this.d_ptr] = 0
      },

      increment_data: function () {
        this.zerofy();
        this.data[this.d_ptr]++;
      },

      decrement_data: function () {
        this.zerofy();
        this.data[this.d_ptr]--;
      },

      output: function () {
        this.user_output(String.fromCharCode(this.data[this.d_ptr]));
      },

      input: function () {
        var that = this;
        return (function () {
          that.user_input(function (data) {
            data = data.toString();
            that.data[that.d_ptr] = data.charCodeAt(0) || 10;
            that.run();
          });
        });
      },

      jump_forward_if_zero: function () {
        if (!this.data[this.d_ptr])  this.i_ptr = this.instruction.match;
      },

      jump_backward_if_nonzero: function () {
        if (this.data[this.d_ptr]) this.i_ptr = this.instruction.match;
      }

    }
    return Interpreter;
  })();

  return {
    Parser: Parser,
    Interpreter: Interpreter,
  };
})();
