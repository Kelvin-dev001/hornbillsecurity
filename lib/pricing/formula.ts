/**
 * A small, allow-listed expression evaluator for BOM quantities.
 *
 * docs/01 §6: "cable runs, trunking and labour genuinely vary by site. So we do
 * not hardcode them. Every quantity is a formula over named constants stored in
 * a pricing_rules table and editable from the admin portal."
 *
 * Which means a string out of the database gets evaluated on the server. So:
 *
 *   NEVER eval(). NEVER new Function(). NEVER a template that reaches a JS
 *   parser. Those give an expression the whole language — `process.exit()`,
 *   `require('fs')`, an infinite loop — and the string is editable from an admin
 *   form. This module tokenises, parses to an AST, and walks it. Nothing that
 *   is not a number, an allowed name, an allowed operator or an allowed
 *   function survives the tokeniser.
 *
 * Grammar:
 *   expression := term (("+" | "-") term)*
 *   term       := factor (("*" | "/") factor)*
 *   factor     := ("-")? primary
 *   primary    := NUMBER | NAME | CALL | "(" expression ")"
 *   CALL       := NAME "(" expression ("," expression)* ")"
 *
 * Identifiers resolve against the variables passed in — pricing_rules keys plus
 * the builder's own answers. An unknown name is an error, not a zero: a formula
 * that silently evaluates `cable_m_per_camra` to 0 would quote a job with no
 * cable in it.
 */

/** The only functions a quantity formula may call. */
const FUNCTIONS = {
  min: (...args: number[]) => Math.min(...args),
  max: (...args: number[]) => Math.max(...args),
  ceil: (value: number) => Math.ceil(value),
  floor: (value: number) => Math.floor(value),
  round: (value: number) => Math.round(value),
} as const;

type FunctionName = keyof typeof FUNCTIONS;

const FUNCTION_ARITY: Record<FunctionName, { min: number; max: number }> = {
  min: { min: 1, max: 16 },
  max: { min: 1, max: 16 },
  ceil: { min: 1, max: 1 },
  floor: { min: 1, max: 1 },
  round: { min: 1, max: 1 },
};

export class FormulaError extends Error {
  constructor(
    message: string,
    readonly formula: string,
  ) {
    super(`${message} — in formula: ${formula}`);
    this.name = "FormulaError";
  }
}

export type FormulaVariables = Record<string, number>;

// ── tokeniser ──────────────────────────────────────────────────────────────

type Token =
  | { kind: "number"; value: number }
  | { kind: "name"; value: string }
  | { kind: "op"; value: "+" | "-" | "*" | "/" }
  | { kind: "punct"; value: "(" | ")" | "," };

/** Names are lowercase, digits and underscores. Nothing else is a name. */
const NAME_PATTERN = /^[a-z][a-z0-9_]*/;
const NUMBER_PATTERN = /^\d+(\.\d+)?/;

function tokenise(formula: string): Token[] {
  const tokens: Token[] = [];
  let rest = formula;
  let guard = 0;

  while (rest.length > 0) {
    if (guard++ > 1000) throw new FormulaError("formula is too long", formula);

    const whitespace = /^\s+/.exec(rest);
    if (whitespace) {
      rest = rest.slice(whitespace[0].length);
      continue;
    }

    const number = NUMBER_PATTERN.exec(rest);
    if (number) {
      tokens.push({ kind: "number", value: Number(number[0]) });
      rest = rest.slice(number[0].length);
      continue;
    }

    const name = NAME_PATTERN.exec(rest);
    if (name) {
      tokens.push({ kind: "name", value: name[0] });
      rest = rest.slice(name[0].length);
      continue;
    }

    const char = rest[0];
    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ kind: "op", value: char });
      rest = rest.slice(1);
      continue;
    }
    if (char === "(" || char === ")" || char === ",") {
      tokens.push({ kind: "punct", value: char });
      rest = rest.slice(1);
      continue;
    }

    // Everything else — quotes, brackets, dots, semicolons, backticks, letters
    // outside a name — stops here. This is the line that keeps `[]` and
    // `x.constructor` and `1;require('fs')` out of the evaluator.
    throw new FormulaError(`unexpected character "${char}"`, formula);
  }

  return tokens;
}

// ── parser ─────────────────────────────────────────────────────────────────

type Node =
  | { type: "number"; value: number }
  | { type: "variable"; name: string }
  | { type: "unary"; operator: "-"; operand: Node }
  | { type: "binary"; operator: "+" | "-" | "*" | "/"; left: Node; right: Node }
  | { type: "call"; name: FunctionName; args: Node[] };

function parse(tokens: Token[], formula: string): Node {
  let position = 0;

  const peek = () => tokens[position];
  const next = () => tokens[position++];

  function expectPunct(value: "(" | ")" | ",") {
    const token = next();
    if (!token || token.kind !== "punct" || token.value !== value) {
      throw new FormulaError(`expected "${value}"`, formula);
    }
  }

  function parseExpression(): Node {
    let left = parseTerm();
    for (;;) {
      const token = peek();
      if (token?.kind === "op" && (token.value === "+" || token.value === "-")) {
        next();
        left = { type: "binary", operator: token.value, left, right: parseTerm() };
        continue;
      }
      return left;
    }
  }

  function parseTerm(): Node {
    let left = parseFactor();
    for (;;) {
      const token = peek();
      if (token?.kind === "op" && (token.value === "*" || token.value === "/")) {
        next();
        left = { type: "binary", operator: token.value, left, right: parseFactor() };
        continue;
      }
      return left;
    }
  }

  function parseFactor(): Node {
    const token = peek();
    if (token?.kind === "op" && token.value === "-") {
      next();
      return { type: "unary", operator: "-", operand: parseFactor() };
    }
    return parsePrimary();
  }

  function parsePrimary(): Node {
    const token = next();
    if (!token) throw new FormulaError("formula ended unexpectedly", formula);

    if (token.kind === "number") return { type: "number", value: token.value };

    if (token.kind === "punct" && token.value === "(") {
      const inner = parseExpression();
      expectPunct(")");
      return inner;
    }

    if (token.kind === "name") {
      const following = peek();
      if (following?.kind === "punct" && following.value === "(") {
        if (!(token.value in FUNCTIONS)) {
          throw new FormulaError(
            `unknown function "${token.value}". Allowed: ${Object.keys(FUNCTIONS).join(", ")}`,
            formula,
          );
        }
        next(); // consume "("
        const args: Node[] = [parseExpression()];
        for (;;) {
          const separator = peek();
          if (separator?.kind === "punct" && separator.value === ",") {
            next();
            args.push(parseExpression());
            continue;
          }
          break;
        }
        expectPunct(")");

        const name = token.value as FunctionName;
        const arity = FUNCTION_ARITY[name];
        if (args.length < arity.min || args.length > arity.max) {
          throw new FormulaError(
            `${name}() takes ${arity.min === arity.max ? arity.min : `${arity.min}-${arity.max}`} arguments, got ${args.length}`,
            formula,
          );
        }
        return { type: "call", name, args };
      }

      return { type: "variable", name: token.value };
    }

    throw new FormulaError(`unexpected "${token.value}"`, formula);
  }

  const tree = parseExpression();
  if (position < tokens.length) {
    throw new FormulaError(`unexpected "${tokens[position].value}" after the expression`, formula);
  }
  return tree;
}

// ── evaluator ──────────────────────────────────────────────────────────────

function walk(node: Node, variables: FormulaVariables, formula: string): number {
  switch (node.type) {
    case "number":
      return node.value;

    case "variable": {
      const value = variables[node.name];
      if (value === undefined) {
        // Not a zero. A missing cable_m_per_camera_residential would otherwise
        // quote a camera system with no cable in it and total confidently.
        throw new FormulaError(`unknown name "${node.name}"`, formula);
      }
      if (!Number.isFinite(value)) {
        throw new FormulaError(`"${node.name}" is not a finite number`, formula);
      }
      return value;
    }

    case "unary":
      return -walk(node.operand, variables, formula);

    case "binary": {
      const left = walk(node.left, variables, formula);
      const right = walk(node.right, variables, formula);
      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          if (right === 0) throw new FormulaError("division by zero", formula);
          return left / right;
      }
    }

    case "call": {
      const args = node.args.map((arg) => walk(arg, variables, formula));
      // Typed as a variadic call: min/max take any number, the rest take one,
      // and the parser has already enforced the arity above.
      const fn = FUNCTIONS[node.name] as (...values: number[]) => number;
      return fn(...args);
    }
  }
}

/**
 * Evaluates a quantity formula. Throws FormulaError on anything it does not
 * fully understand — an unparseable or unresolvable formula must stop a page
 * building, not quietly produce a wrong bill of materials.
 */
export function evaluateFormula(formula: string, variables: FormulaVariables): number {
  const trimmed = formula.trim();
  if (trimmed === "") throw new FormulaError("formula is empty", formula);

  const result = walk(parse(tokenise(trimmed), trimmed), variables, trimmed);

  if (!Number.isFinite(result)) throw new FormulaError("result is not a finite number", trimmed);
  return result;
}

/**
 * The names a formula uses, so the admin form (Sprint 4) can validate a formula
 * against the pricing rules that actually exist before it is saved.
 */
export function formulaVariables(formula: string): string[] {
  const names = new Set<string>();
  const collect = (node: Node) => {
    switch (node.type) {
      case "variable":
        names.add(node.name);
        break;
      case "unary":
        collect(node.operand);
        break;
      case "binary":
        collect(node.left);
        collect(node.right);
        break;
      case "call":
        node.args.forEach(collect);
        break;
      case "number":
        break;
    }
  };
  collect(parse(tokenise(formula.trim()), formula.trim()));
  return [...names].sort();
}
