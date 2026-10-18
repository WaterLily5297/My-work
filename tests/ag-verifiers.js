// Independent checks for the algebraic geometry problems.
// Each verifier recomputes the answer by a different route from the generator:
// brute-force monomial counting, Taylor coefficients computed from scratch,
// exact gcds over Q to count distinct factors, finite differences, etc.
const assert = require("node:assert/strict");
const { F, binom } = require("../js/core.js");

const num = (f) => f.valueOf();
const terms = (f) =>
  Object.entries(f)
    .filter(([, c]) => c !== 0)
    .map(([k, c]) => {
      const [i, j] = k.split(",").map(Number);
      return { i, j, c };
    });

// ---------- exact univariate polynomials over Q (arrays of Fractions, lowest first) ----------
const trim = (a) => {
  a = a.slice();
  while (a.length && a[a.length - 1].isZero()) a.pop();
  return a;
};
const deg = (a) => trim(a).length - 1;
function polyMod(a, b) {
  a = trim(a);
  b = trim(b);
  while (a.length >= b.length && a.length) {
    const f = a[a.length - 1].div(b[b.length - 1]);
    const shift = a.length - b.length;
    a = trim(a.map((c, k) => (k >= shift ? c.sub(f.mul(b[k - shift])) : c)));
  }
  return a;
}
function polyGcd(a, b) {
  a = trim(a);
  b = trim(b);
  while (b.length) [a, b] = [b, polyMod(a, b)];
  return a;
}
const derivative = (a) => a.slice(1).map((c, k) => c.mul(k + 1));

/** Number of distinct linear factors (over C) of a nonzero binary form of degree m. */
function distinctLines(form, m) {
  // q(t) = form(1, t); the factor x appears with multiplicity m - deg q.
  const q = new Array(m + 1).fill(null).map(() => F(0));
  for (const { i, j, c } of terms(form)) {
    assert.equal(i + j, m, "form must be homogeneous");
    q[j] = q[j].add(c);
  }
  const dq = deg(q);
  const distinctFinite = dq - deg(polyGcd(q, derivative(q)));
  return distinctFinite + (dq < m ? 1 : 0);
}

/** Taylor coefficients of f at (a, b), computed term by term with binomials. */
function localExpansion(f, a, b) {
  const out = {};
  for (const { i: p, j: q, c } of terms(f))
    for (let i = 0; i <= p; i++)
      for (let j = 0; j <= q; j++) {
        const k = `${i},${j}`;
        out[k] = (out[k] || 0) + c * binom(p, i) * a ** (p - i) * binom(q, j) * b ** (q - j);
      }
  return out;
}

const monomialsOfDegree = (vars, d) => binomCount(vars, d);
function binomCount(vars, d) {
  // brute-force count of exponent vectors of length `vars` summing to d
  if (d < 0) return 0;
  if (vars === 1) return 1;
  let s = 0;
  for (let e = 0; e <= d; e++) s += binomCount(vars - 1, d - e);
  return s;
}
/** Count degree-t monomials in `vars` variables not divisible by any of the given monomials. */
function standardCount(vars, t, gens) {
  let count = 0;
  const rec = (k, left, exps) => {
    if (k === vars - 1) {
      const e = [...exps, left];
      if (!gens.some((g) => g.every((x, idx) => e[idx] >= x))) count++;
      return;
    }
    for (let x = 0; x <= left; x++) rec(k + 1, left - x, [...exps, x]);
  };
  rec(0, t, []);
  return count;
}
/** n-th forward difference of h at 0 (the leading coefficient times n! for degree-n h). */
function nthDifference(h, n) {
  let vals = Array.from({ length: n + 1 }, (_, t) => h(t));
  for (let k = 0; k < n; k++) vals = vals.slice(1).map((v, i) => v - vals[i]);
  return vals[0];
}

module.exports = {
  "ag-sing": ({ f, a, b }, ans) => {
    const [x0, y0, m, lines] = ans.map(num);
    assert.equal(x0, a);
    assert.equal(y0, b);
    const loc = localExpansion(f, x0, y0);
    const ts = terms(loc);
    const low = Math.min(...ts.map((t) => t.i + t.j));
    assert.ok(low >= 2, "the point must be singular (f, f_x, f_y vanish)");
    assert.equal(m, low, "multiplicity");
    const cone = Object.fromEntries(ts.filter((t) => t.i + t.j === low).map((t) => [`${t.i},${t.j}`, t.c]));
    assert.equal(lines, distinctLines(cone, low), "number of tangent lines");
  },
  "ag-intmult": ({ F: Fp, G, m }, ans) => {
    // F = y - p(x): read p off F, then substitute into G with exact integer arithmetic.
    const pcoef = [];
    for (const { i, j, c } of terms(Fp)) {
      if (j === 1) assert.equal(i, 0);
      else pcoef[i] = -c;
    }
    const p = Array.from({ length: pcoef.length }, (_, i) => pcoef[i] || 0);
    const mul = (u, v) => {
      const r = new Array(u.length + v.length - 1).fill(0);
      u.forEach((x, i) => v.forEach((y, j) => (r[i + j] += x * y)));
      return r;
    };
    let h = [0];
    for (const { i, j, c } of terms(G)) {
      let t = [c];
      for (let k = 0; k < i; k++) t = mul(t, [0, 1]);
      for (let k = 0; k < j; k++) t = mul(t, p);
      h = Array.from({ length: Math.max(h.length, t.length) }, (_, k) => (h[k] || 0) + (t[k] || 0));
    }
    const ord = h.findIndex((c) => c !== 0);
    assert.ok(ord >= 1, "G must pass through the origin and not contain F");
    assert.equal(num(ans[0]), ord);
    assert.equal(ord, m, "matches the multiplicity built into G");
  },
  "ag-quotient": ({ a, b, mixed }, ans) => {
    const gens = [[a, 0], [0, b], ...mixed];
    let count = 0;
    for (let i = 0; i < 30; i++) for (let j = 0; j < 30; j++) if (!gens.some(([c, d]) => i >= c && j >= d)) count++;
    assert.equal(num(ans[0]), count);
  },
  "ag-infinity": ({ f, d }, ans) => {
    const ts = terms(f);
    assert.equal(Math.max(...ts.map((t) => t.i + t.j)), d);
    const top = Object.fromEntries(ts.filter((t) => t.i + t.j === d).map((t) => [`${t.i},${t.j}`, t.c]));
    assert.equal(num(ans[0]), distinctLines(top, d));
  },
  "ag-bezout": ({ d, e, m }, ans) => {
    assert.ok(m >= 2 && m < d * e);
    assert.equal(num(ans[0]), d * e - m);
  },
  "ag-genus": ({ d, k, j }, ans) => {
    const g = num(ans[0]);
    assert.ok(g >= 0);
    assert.equal(g, ((d - 1) * (d - 2)) / 2 - k - j);
  },
  "ag-hurwitz": (data, ans) => {
    const g = num(ans[0]);
    if (data.kind === "hyper") assert.equal(g, Math.floor((data.n - 1) / 2));
    else if (data.kind === "fermat") assert.equal(g, ((data.n - 1) * (data.n - 2)) / 2);
    else if (data.kind === "elliptic") assert.equal(2 * g - 2, data.r);
    else assert.equal(2 * g - 2, -2 * data.n + data.r);
    assert.ok(Number.isInteger(g) && g >= 0);
  },
  "ag-rr": (data, ans) => {
    const v = ans.map(num);
    if (data.kind === "large") {
      assert.ok(data.n > 2 * data.g - 2);
      assert.equal(v[0], data.n - data.g + 1);
    } else if (data.kind === "canonical") {
      assert.deepEqual(v, [2 * data.g - 2, data.g]);
    } else {
      const { d, k } = data;
      // H^0(O_C(k)) = degree-k forms modulo multiples of the equation: count with F = x^d
      assert.equal(v[0], standardCount(3, k, [[d, 0, 0]]));
      const g = ((d - 1) * (d - 2)) / 2;
      if (k * d > 2 * g - 2) assert.equal(v[0], k * d - g + 1, "Riemann–Roch");
    }
  },
  "ag-hilbert": (data, ans) => {
    const h = num(ans[0]);
    if (data.kind === "hyper") {
      const gens = [[data.d, ...new Array(data.n).fill(0)]];
      assert.equal(h, standardCount(data.n + 1, data.t, gens));
    } else {
      // x^d, y^e is a regular sequence with the same Hilbert function as any F, G
      assert.equal(h, standardCount(3, data.t, [[data.d, 0, 0], [0, data.e, 0]]));
    }
  },
  "ag-embed": (data, ans) => {
    const [N, degree] = ans.map(num);
    if (data.kind === "veronese") {
      const { n, d } = data;
      assert.equal(N + 1, monomialsOfDegree(n + 1, d));
      // Hilbert function of the image: h(t) = #monomials of degree d·t; degree = n-th difference
      assert.equal(degree, nthDifference((t) => monomialsOfDegree(n + 1, d * t), n));
    } else {
      const { m, n } = data;
      assert.equal(N + 1, (m + 1) * (n + 1));
      assert.equal(degree, nthDifference((t) => monomialsOfDegree(m + 1, t) * monomialsOfDegree(n + 1, t), m + n));
    }
  },
};
