/*
 * Core utilities: exact fractions, a seeded random number generator,
 * answer parsing/checking and small TeX helpers.
 * Works both in the browser (window.MathDrillCore) and in Node (require).
 */
(function (root, factory) {
  const lib = factory();
  if (typeof module === "object" && module.exports) module.exports = lib;
  else root.MathDrillCore = lib;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------- Fractions ----------
  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  }

  class Fraction {
    constructor(n, d = 1) {
      if (!Number.isInteger(n) || !Number.isInteger(d)) {
        throw new Error(`Fraction needs integers, got ${n}/${d}`);
      }
      if (d === 0) throw new Error("Division by zero");
      if (d < 0) {
        n = -n;
        d = -d;
      }
      const g = gcd(n, d);
      this.n = n / g + 0; // "+ 0" turns -0 into 0
      this.d = d / g;
    }
    static of(x) {
      return x instanceof Fraction ? x : new Fraction(x, 1);
    }
    add(o) {
      o = Fraction.of(o);
      return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d);
    }
    sub(o) {
      return this.add(Fraction.of(o).neg());
    }
    mul(o) {
      o = Fraction.of(o);
      return new Fraction(this.n * o.n, this.d * o.d);
    }
    div(o) {
      o = Fraction.of(o);
      return new Fraction(this.n * o.d, this.d * o.n);
    }
    neg() {
      return new Fraction(-this.n, this.d);
    }
    pow(k) {
      let r = new Fraction(1);
      for (let i = 0; i < k; i++) r = r.mul(this);
      return r;
    }
    eq(o) {
      o = Fraction.of(o);
      return this.n === o.n && this.d === o.d;
    }
    isInt() {
      return this.d === 1;
    }
    isZero() {
      return this.n === 0;
    }
    sign() {
      return Math.sign(this.n);
    }
    abs() {
      return new Fraction(Math.abs(this.n), this.d);
    }
    valueOf() {
      return this.n / this.d;
    }
    toString() {
      return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`;
    }
    toTex() {
      if (this.d === 1) return `${this.n}`;
      const s = this.n < 0 ? "-" : "";
      return `${s}\\frac{${Math.abs(this.n)}}{${this.d}}`;
    }
  }
  const F = (n, d = 1) => new Fraction(n, d);

  // ---------- Seeded RNG (mulberry32) ----------
  function makeRng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const rng = {
      next,
      int(lo, hi) {
        return lo + Math.floor(next() * (hi - lo + 1));
      },
      nonzero(lo, hi) {
        let x;
        do x = rng.int(lo, hi);
        while (x === 0);
        return x;
      },
      pick(arr) {
        return arr[Math.floor(next() * arr.length)];
      },
      sign() {
        return next() < 0.5 ? -1 : 1;
      },
    };
    return rng;
  }
  const newSeed = () => Math.floor(Math.random() * 2 ** 31);

  // ---------- Answer parsing & checking ----------
  /**
   * Parses "3", "-3/4", "0.75", "−1.5", full-width digits, etc.
   * Returns { value: Fraction, decimals: number|null } or null if unreadable.
   */
  function parseAnswer(raw) {
    if (raw == null) return null;
    let s = String(raw).normalize("NFKC");
    s = s.replace(/[−‒–—－]/g, "-").replace(/\s+/g, "");
    if (s === "") return null;
    let m = s.match(/^([+-]?)(\d+)(?:\/(\d+))?$/);
    if (m) {
      const sign = m[1] === "-" ? -1 : 1;
      const d = m[3] ? parseInt(m[3], 10) : 1;
      if (d === 0) return null;
      return { value: F(sign * parseInt(m[2], 10), d), decimals: null };
    }
    m = s.match(/^([+-]?)(\d*)\.(\d+)$/);
    if (m) {
      const sign = m[1] === "-" ? -1 : 1;
      const k = m[3].length;
      if (k > 9) return null;
      const n = parseInt((m[2] || "0") + m[3], 10);
      return { value: F(sign * n, 10 ** k), decimals: k };
    }
    return null;
  }

  /**
   * Exact match, or a decimal with at least 3 decimal places that equals
   * the true answer rounded to that many places (so 0.333 counts for 1/3).
   */
  function matches(parsed, answer) {
    if (!parsed) return false;
    answer = Fraction.of(answer);
    if (parsed.value.eq(answer)) return true;
    if (parsed.decimals != null && parsed.decimals >= 3) {
      const scale = 10 ** parsed.decimals;
      const exact = (Math.abs(answer.n) * scale) / answer.d;
      const rounded = Math.sign(answer.n) * Math.round(exact);
      return parsed.value.eq(F(rounded, scale));
    }
    return false;
  }

  /**
   * Checks a list of raw inputs against a problem's answers.
   * Returns { ok, perField: [bool], unreadable: [bool] }.
   */
  function checkAnswers(problem, inputs) {
    const parsed = inputs.map(parseAnswer);
    const unreadable = parsed.map((p, i) => !p && String(inputs[i] ?? "").trim() !== "");
    const expected = problem.answers.map((a) => a.value);
    let perField;
    if (problem.unordered) {
      // Order doesn't matter: greedy matching is fine because values are exact.
      const used = new Array(expected.length).fill(false);
      perField = parsed.map((p) => {
        for (let j = 0; j < expected.length; j++) {
          if (!used[j] && matches(p, expected[j])) {
            used[j] = true;
            return true;
          }
        }
        return false;
      });
    } else {
      perField = parsed.map((p, i) => matches(p, expected[i]));
    }
    return { ok: perField.every(Boolean), perField, unreadable };
  }

  // ---------- TeX helpers ----------
  /** Wraps negatives in parentheses for use inside products. */
  const p = (x) => {
    const f = Fraction.of(x);
    return f.sign() < 0 ? `\\left(${f.toTex()}\\right)` : f.toTex();
  };

  /**
   * Builds a sum of terms. terms: [[coef, monomialTex], ...]
   * A monomial of "" is a constant term.
   */
  function sumTex(terms) {
    let out = "";
    for (const [c0, mono] of terms) {
      const c = Fraction.of(c0);
      if (c.isZero()) continue;
      const neg = c.sign() < 0;
      const a = c.abs();
      let body;
      if (mono === "") body = a.toTex();
      else if (a.eq(1)) body = mono;
      else body = a.toTex() + " " + mono;
      if (out === "") out = (neg ? "-" : "") + body;
      else out += (neg ? " - " : " + ") + body;
    }
    return out || "0";
  }

  /** Polynomial in one variable from coefficients [c_n, ..., c_1, c_0]. */
  function polyTex(coeffs, v = "x") {
    const deg = coeffs.length - 1;
    return sumTex(
      coeffs.map((c, i) => {
        const k = deg - i;
        return [c, k === 0 ? "" : k === 1 ? v : `${v}^{${k}}`];
      })
    );
  }

  /** Evaluates a polynomial [c_n..c_0] at x (Fraction-aware). */
  function polyEval(coeffs, x) {
    let r = F(0);
    for (const c of coeffs) r = r.mul(x).add(c);
    return r;
  }

  const matTex = (rows) =>
    "\\begin{pmatrix}" + rows.map((r) => r.map((x) => Fraction.of(x).toTex()).join(" & ")).join(" \\\\ ") + "\\end{pmatrix}";

  const vecTex = (v) => matTex(v.map((x) => [x]));

  function binom(n, k) {
    if (k < 0 || k > n) return 0;
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return Math.round(r);
  }

  function factorial(n) {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  return {
    Fraction,
    F,
    gcd,
    makeRng,
    newSeed,
    parseAnswer,
    matches,
    checkAnswers,
    p,
    sumTex,
    polyTex,
    polyEval,
    matTex,
    vecTex,
    binom,
    factorial,
  };
});
