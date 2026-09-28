/**
 * A small, safe arithmetic language for the explore pattern.
 *
 * Vocational content is full of formulas: food cost percentage, Ohm's law,
 * voltage drop, break-even, dosage arithmetic, compound interest. A learner
 * who can push on the inputs and watch the output move understands the formula
 * in a way that reading it never gives them. So the explore pattern needs to run
 * arbitrary teacher-written formulas in the browser.
 *
 * It must not use `eval` or `new Function`, for two reasons. Institutional
 * Content Security Policies, including the ones SCORM players run under, often
 * forbid it, so the activity would silently die. And a formula is data typed by
 * a person, and data should never be executed as code.
 *
 * So this is a tokenizer, a recursive-descent parser and a tree walker. The
 * language is numbers, named inputs, + - * / % ^, brackets, and a fixed list of
 * functions. Nothing else is reachable: no property access, no strings, no
 * assignment, no globals.
 *
 * The whole thing lives in one function with no references to module scope, so
 * the build can inline `createExpr.toString()` into the page and the browser
 * runs exactly the code the tests ran.
 */
export function createExpr() {
  var FUNCS = {
    sqrt: Math.sqrt, abs: Math.abs, min: Math.min, max: Math.max,
    floor: Math.floor, ceil: Math.ceil, exp: Math.exp, pow: Math.pow,
    ln: Math.log, log: function (x) { return Math.log(x) / Math.LN10; },
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    round: function (x, dp) {
      var f = Math.pow(10, dp || 0);
      return Math.round(x * f) / f;
    },
  };
  var CONSTS = { pi: Math.PI, e: Math.E };
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function ExprError(message) {
    var e = new Error(message);
    e.name = 'ExprError';
    return e;
  }

  function tokenize(src) {
    var tokens = [];
    var i = 0;
    var s = String(src);
    while (i < s.length) {
      var c = s[i];
      if (c === ' ' || c === '\t' || c === '\n') { i += 1; continue; }
      if ((c >= '0' && c <= '9') || (c === '.' && s[i + 1] >= '0' && s[i + 1] <= '9')) {
        var m = /^(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?/.exec(s.slice(i));
        tokens.push({ t: 'num', v: parseFloat(m[0]), at: i });
        i += m[0].length;
        continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        var id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i))[0];
        tokens.push({ t: 'id', v: id, at: i });
        i += id.length;
        continue;
      }
      if ('+-*/%^(),'.indexOf(c) !== -1) {
        tokens.push({ t: c, at: i });
        i += 1;
        continue;
      }
      throw ExprError('Unexpected character "' + c + '" at position ' + (i + 1) + '. Formulas may use numbers, input names, + - * / % ^, brackets and functions such as sqrt().');
    }
    tokens.push({ t: 'end', at: s.length });
    return tokens;
  }

  // Grammar, lowest precedence first:
  //   sum     := product (('+' | '-') product)*
  //   product := unary (('*' | '/' | '%') unary)*
  //   unary   := '-' unary | '+' unary | power
  //   power   := atom ('^' unary)?          right associative, binds tighter than unary minus on its left
  //   atom    := number | name | name '(' args ')' | '(' sum ')'
  function parse(tokens) {
    var p = 0;
    var peek = function () { return tokens[p]; };
    var take = function (t) {
      if (tokens[p].t !== t) {
        throw ExprError('Expected "' + t + '" at position ' + (tokens[p].at + 1) + '.');
      }
      p += 1;
      return tokens[p - 1];
    };

    function sum() {
      var node = product();
      while (peek().t === '+' || peek().t === '-') {
        var op = tokens[p++].t;
        node = { k: 'bin', op: op, a: node, b: product() };
      }
      return node;
    }
    function product() {
      var node = unary();
      while (peek().t === '*' || peek().t === '/' || peek().t === '%') {
        var op = tokens[p++].t;
        node = { k: 'bin', op: op, a: node, b: unary() };
      }
      return node;
    }
    function unary() {
      if (peek().t === '-') { p += 1; return { k: 'neg', a: unary() }; }
      if (peek().t === '+') { p += 1; return unary(); }
      return power();
    }
    function power() {
      var base = atom();
      if (peek().t === '^') { p += 1; return { k: 'bin', op: '^', a: base, b: unary() }; }
      return base;
    }
    function atom() {
      var tok = peek();
      if (tok.t === 'num') { p += 1; return { k: 'num', v: tok.v }; }
      if (tok.t === '(') { p += 1; var inner = sum(); take(')'); return inner; }
      if (tok.t === 'id') {
        p += 1;
        if (peek().t === '(') {
          if (!has(FUNCS, tok.v)) {
            throw ExprError('"' + tok.v + '" is not a function this language knows. Use one of: ' + Object.keys(FUNCS).join(', ') + '.');
          }
          p += 1;
          var args = [];
          if (peek().t !== ')') {
            args.push(sum());
            while (peek().t === ',') { p += 1; args.push(sum()); }
          }
          take(')');
          return { k: 'call', f: tok.v, args: args };
        }
        return { k: 'id', v: tok.v };
      }
      if (tok.t === 'end') throw ExprError('The formula ends too early.');
      throw ExprError('Unexpected "' + tok.t + '" at position ' + (tok.at + 1) + '.');
    }

    var tree = sum();
    if (peek().t !== 'end') {
      throw ExprError('Unexpected "' + (peek().v || peek().t) + '" at position ' + (peek().at + 1) + '. Is an operator missing?');
    }
    return tree;
  }

  function identifiers(tree, out) {
    out = out || [];
    if (tree.k === 'id' && !has(CONSTS, tree.v) && out.indexOf(tree.v) === -1) out.push(tree.v);
    if (tree.a) identifiers(tree.a, out);
    if (tree.b) identifiers(tree.b, out);
    if (tree.args) tree.args.forEach(function (x) { identifiers(x, out); });
    return out;
  }

  function evaluate(tree, scope) {
    switch (tree.k) {
      case 'num': return tree.v;
      case 'neg': return -evaluate(tree.a, scope);
      case 'id':
        if (has(scope, tree.v)) return Number(scope[tree.v]);
        if (has(CONSTS, tree.v)) return CONSTS[tree.v];
        throw ExprError('"' + tree.v + '" has no value.');
      case 'call':
        return FUNCS[tree.f].apply(null, tree.args.map(function (x) { return evaluate(x, scope); }));
      case 'bin': {
        var a = evaluate(tree.a, scope);
        var b = evaluate(tree.b, scope);
        if (tree.op === '+') return a + b;
        if (tree.op === '-') return a - b;
        if (tree.op === '*') return a * b;
        if (tree.op === '/') return a / b;
        if (tree.op === '%') return a % b;
        return Math.pow(a, b);
      }
      default: throw ExprError('Unknown node.');
    }
  }

  /**
   * Compile `src` against the names it is allowed to use. Unknown names are a
   * compile error, so a typo in a formula fails at build time rather than
   * showing a learner NaN.
   */
  function compile(src, allowed) {
    var tree = parse(tokenize(src));
    var used = identifiers(tree);
    if (allowed) {
      var unknown = used.filter(function (n) { return allowed.indexOf(n) === -1; });
      if (unknown.length) {
        throw ExprError('The formula uses ' + unknown.map(function (n) { return '"' + n + '"'; }).join(', ') + ', which ' + (unknown.length === 1 ? 'is' : 'are') + ' not defined. Defined names: ' + (allowed.length ? allowed.join(', ') : 'none') + '.');
      }
    }
    var run = function (scope) { return evaluate(tree, scope || {}); };
    run.uses = used;
    return run;
  }

  return { compile: compile, functions: Object.keys(FUNCS), constants: Object.keys(CONSTS) };
}

/**
 * Evaluate a set of named outputs in dependency order. Outputs may refer to
 * inputs and to other outputs; a cycle is an error.
 */
export function createModel() {
  var expr = createExpr();

  return function model(parameters, outputs) {
    var paramKeys = parameters.map(function (p) { return p.key; });
    var outKeys = outputs.map(function (o) { return o.key; });
    var allowed = paramKeys.concat(outKeys);
    var compiled = {};
    outputs.forEach(function (o) { compiled[o.key] = expr.compile(o.expr, allowed); });

    // Topological order, so an output can build on an earlier one.
    var order = [];
    var state = {};
    function visit(key, trail) {
      if (state[key] === 2) return;
      if (state[key] === 1) {
        var e = new Error('Outputs refer to each other in a loop: ' + trail.concat(key).join(' then ') + '.');
        e.name = 'ExprError';
        throw e;
      }
      state[key] = 1;
      compiled[key].uses.forEach(function (dep) {
        if (outKeys.indexOf(dep) !== -1) visit(dep, trail.concat(key));
      });
      state[key] = 2;
      order.push(key);
    }
    outKeys.forEach(function (k) { visit(k, []); });

    return function evaluateAll(values) {
      var scope = {};
      paramKeys.forEach(function (k) { scope[k] = values[k]; });
      order.forEach(function (k) { scope[k] = compiled[k](scope); });
      return scope;
    };
  };
}
