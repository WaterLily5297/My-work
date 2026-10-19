// Independent checks for the number theory problems.
// Each verifier recomputes the answer by a different route from the generator:
// exact big-integer factorials, brute-force squares, search over every residue,
// point counts over F_p and over an explicitly built F_{p^2}, root counts mod p,
// and a Newton polygon computed pointwise instead of with a convex-hull sweep.
const assert = require("node:assert/strict");
const { F } = require("../js/core.js");

const num = (f) => f.valueOf();
const mod = (a, m) => ((a % m) + m) % m;

function bigValuation(n, p) {
  let v = 0;
  for (const P = BigInt(p); n % P === 0n; n /= P) v++;
  return v;
}
function bigFactorial(n) {
  let r = 1n;
  for (let i = 2n; i <= BigInt(n); i++) r *= i;
  return r;
}
const squares = (p) => new Set(Array.from({ length: p }, (_, x) => (x * x) % p));

/** Number of solutions of Y^2 = X^3 + aX + b over F_{p^2} = F_p[t]/(t^2 - r), plus infinity. */
function countOverFp2(p, a, b) {
  const sq = squares(p);
  let r = 1;
  while (sq.has(r)) r++; // a non-residue, so t^2 - r is irreducible
  const mul = ([u, v], [x, y]) => [mod(u * x + r * v * y, p), mod(u * y + v * x, p)];
  const key = ([u, v]) => u * p + v;
  const squareCount = new Map();
  for (let u = 0; u < p; u++)
    for (let v = 0; v < p; v++) {
      const k = key(mul([u, v], [u, v]));
      squareCount.set(k, (squareCount.get(k) || 0) + 1);
    }
  let n = 1;
  for (let u = 0; u < p; u++)
    for (let v = 0; v < p; v++) {
      const X = [u, v];
      const X3 = mul(mul(X, X), X);
      const rhs = [mod(X3[0] + a * u + b, p), mod(X3[1] + a * v, p)];
      n += squareCount.get(key(rhs)) || 0;
    }
  return n;
}

module.exports = {
  "nt-valuation": (data, ans) => {
    const { p, n } = data;
    if (data.kind === "binomial") {
      const { k } = data;
      const C = bigFactorial(n) / (bigFactorial(k) * bigFactorial(n - k));
      assert.equal(num(ans[0]), bigValuation(C, p));
    } else {
      const v = bigValuation(bigFactorial(n), p);
      assert.ok(ans[0].eq(F(1, p ** v)), `|${n}!|_${p}`);
    }
  },
  "nt-legendre": (data, ans) => {
    const { a, p } = data;
    assert.equal(num(ans[0]), squares(p).has(a % p) ? 1 : -1);
  },
  "nt-hensel": (data, ans) => {
    const { p, k, e, a, x0 } = data;
    const pk = p ** k;
    const found = [];
    for (let x = x0; x < pk; x += p) if (mod(x ** e - a, pk) === 0) found.push(x);
    assert.deepEqual(found, [num(ans[0])], "exactly one lift");
  },
  "nt-ecpoints": (data, ans) => {
    const { p, a, b } = data;
    let n = 1;
    for (let x = 0; x < p; x++) for (let y = 0; y < p; y++) if (mod(y * y - (x ** 3 + a * x + b), p) === 0) n++;
    assert.equal(num(ans[0]), n);
    assert.equal(num(ans[1]), p + 1 - n);
    assert.ok(Math.abs(p + 1 - n) <= 2 * Math.sqrt(p), "Hasse bound");
  },
  "nt-ecfp2": (data, ans) => {
    const { p, a, b } = data;
    assert.equal(num(ans[0]), countOverFp2(p, a, b));
  },
  "nt-split": (data, ans) => {
    const { d, p } = data;
    let roots = 0;
    for (let x = 0; x < p; x++) if (mod(x * x - d, p) === 0) roots++;
    const expected = { 2: [1, 1, 2], 1: [2, 1, 1], 0: [1, 2, 1] }[roots];
    assert.deepEqual(ans.map(num), expected);
  },
  "nt-newton": (data, ans) => {
    const { p, coeffs } = data;
    const n = coeffs.length - 1;
    const pts = coeffs.map((c, i) => [i, c === 0 ? null : bigValuation(BigInt(c), p)]).filter(([, v]) => v !== null);
    // h(x) = the lowest point above x on any chord between two points: the lower hull, pointwise.
    const h = (x) => {
      let best = null;
      for (const [i, vi] of pts)
        for (const [j, vj] of pts) {
          if (!(i <= x && x <= j)) continue;
          const y = i === j ? F(vi) : F(vi).add(F(vj - vi, j - i).mul(F(x - i)));
          if (best === null || y.sub(best).sign() < 0) best = y;
        }
      return best;
    };
    const expected = Array.from({ length: n }, (_, i) => h(i).sub(h(i + 1))).sort((x, y) => x.sub(y).valueOf());
    assert.equal(ans.length, n);
    ans.forEach((v, i) => assert.ok(v.eq(expected[i]), `lambda_${i + 1}: ${v} vs ${expected[i]}`));
    // The valuations of the roots add up to v(a_0) - v(a_n).
    const total = ans.reduce((s, v) => s.add(v), F(0));
    assert.ok(total.eq(F(pts[0][1] - pts[pts.length - 1][1])));
  },
};
