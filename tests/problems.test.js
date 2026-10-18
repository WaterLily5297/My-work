// Checks every problem type against an independent (mostly floating-point)
// computation, and makes sure all generated TeX renders with KaTeX.
// Run with: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const katex = require("katex");
const core = require("../js/core.js");
const P = require("../js/problems.js");

const SEEDS = 300;
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), `${msg}: ${a} vs ${b}`);
const num = (f) => f.valueOf();

// ---------- independent reference computations ----------
function detFloat(M) {
  // Gaussian elimination with partial pivoting
  const A = M.map((r) => r.slice());
  const n = A.length;
  let det = 1;
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    if (Math.abs(A[piv][i]) < 1e-12) return 0;
    if (piv !== i) {
      [A[i], A[piv]] = [A[piv], A[i]];
      det = -det;
    }
    det *= A[i][i];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
    }
  }
  return det;
}
function rankFloat(M) {
  const A = M.map((r) => r.slice());
  let rank = 0;
  const rows = A.length;
  const cols = A[0].length;
  for (let c = 0; c < cols && rank < rows; c++) {
    let piv = rank;
    for (let r = rank; r < rows; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < 1e-9) continue;
    [A[rank], A[piv]] = [A[piv], A[rank]];
    for (let r = 0; r < rows; r++)
      if (r !== rank) {
        const f = A[r][c] / A[rank][c];
        for (let k = 0; k < cols; k++) A[r][k] -= f * A[rank][k];
      }
    rank++;
  }
  return rank;
}
const simpson = (f, a, b, n = 1000) => {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};
const deriv = (f, x, h = 1e-4) => (f(x + h) - f(x - h)) / (2 * h);
const horner = (cs, x) => cs.reduce((s, c) => s * x + c, 0);

const verify = {
  det2: ({ A }, ans) => close(num(ans[0]), detFloat(A), "det2"),
  det3: ({ A }, ans) => close(num(ans[0]), detFloat(A), "det3"),
  matmul: ({ A, B }, ans) => {
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) close(num(ans[2 * i + j]), A[i][0] * B[0][j] + A[i][1] * B[1][j], "matmul");
  },
  inverse: ({ A }, ans) => {
    const X = [
      [num(ans[0]), num(ans[1])],
      [num(ans[2]), num(ans[3])],
    ];
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) close(A[i][0] * X[0][j] + A[i][1] * X[1][j], i === j ? 1 : 0, "A·A⁻¹ = I");
  },
  eigen: ({ A }, ans) => {
    for (const l of ans.map(num)) {
      const M = [
        [A[0][0] - l, A[0][1]],
        [A[1][0], A[1][1] - l],
      ];
      close(detFloat(M), 0, "det(A - λI)");
    }
    assert.notEqual(num(ans[0]), num(ans[1]));
  },
  cross: ({ u, v }, ans) => {
    const w = ans.map(num);
    close(w[0] * u[0] + w[1] * u[1] + w[2] * u[2], 0, "w ⟂ u");
    close(w[0] * v[0] + w[1] * v[1] + w[2] * v[2], 0, "w ⟂ v");
    // |u×v|² = |u|²|v|² − (u·v)²
    const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    const n2 = (x) => x[0] ** 2 + x[1] ** 2 + x[2] ** 2;
    close(n2(w), n2(u) * n2(v) - dot ** 2, "Lagrange identity");
    // orientation: det[u; v; w] = |w|² ≥ 0
    close(detFloat([u, v, w]), n2(w), "right-handed");
  },
  rank: ({ A }, ans) => assert.equal(num(ans[0]), rankFloat(A)),
  system: ({ A, b }, ans) => {
    const [x, y] = ans.map(num);
    close(A[0][0] * x + A[0][1] * y, b[0], "eq1");
    close(A[1][0] * x + A[1][1] * y, b[1], "eq2");
  },
  deriv: ({ coeffs, x0 }, ans) => close(num(ans[0]), deriv((x) => horner(coeffs, x), x0), "f'"),
  chain: ({ a, b, n, x0 }, ans) => close(num(ans[0]), deriv((x) => (a * x + b) ** n, x0), "chain"),
  integral: ({ coeffs, lo, hi }, ans) => close(num(ans[0]), simpson((x) => horner(coeffs, x), lo, hi), "∫"),
  limit: ({ num: nu, den, at }, ans) => {
    const f = (x) => horner(nu, x) / horner(den, x);
    close(num(ans[0]), (f(at + 1e-7) + f(at - 1e-7)) / 2, "limit");
  },
  partial: ({ a, b, c, d, x0, y0, wrtX }, ans) => {
    const f = (x, y) => a * x * x * y + b * x * y ** 3 + c * y * y + d * x;
    const expected = wrtX ? deriv((x) => f(x, y0), x0) : deriv((y) => f(x0, y), y0);
    close(num(ans[0]), expected, "∂f");
  },
  series: ({ a, r, k }, ans) => {
    const q = r[0] / r[1];
    let s = 0;
    for (let n = k; n < k + 2000; n++) s += a * q ** n;
    close(num(ans[0]), s, "Σ");
  },
  taylor: ({ kind, k, n }, ans) => {
    // coefficient via the n-th derivative at 0 using a high-precision series-free check:
    // compare against explicit known derivatives
    const fns = {
      exp: (m) => k ** m, // f^(m)(0) for e^{kx}
      geom: (m) => core.factorial(m) * k ** m, // 1/(1-kx)
      cos: (m) => (m % 2 ? 0 : (m / 2) % 2 ? -(k ** m) : k ** m),
      log: (m) => ((m % 2 ? 1 : -1) * core.factorial(m - 1)),
    };
    close(num(ans[0]), fns[kind](n) / core.factorial(n), `taylor ${kind}`);
    // and a numeric sanity check of the series itself near 0 for exp
    if (kind === "exp") {
      let s = 0;
      for (let m = 0; m < 30; m++) s += (k ** m / core.factorial(m)) * 0.1 ** m;
      close(s, Math.exp(k * 0.1), "exp series");
    }
  },
  ode: ({ p, q }, ans) => {
    for (const r of ans.map(num)) {
      // y = e^{rx} must satisfy y'' + p y' + q y = 0 at a few points
      for (const x of [-0.3, 0, 0.4]) {
        const y = (t) => Math.exp(r * t);
        const h = 1e-3;
        const y2 = (y(x + h) - 2 * y(x) + y(x - h)) / h ** 2;
        assert.ok(Math.abs(y2 + p * deriv(y, x) + q * y(x)) < 1e-2 * Math.max(1, Math.exp(r * x) * 25), "ODE");
      }
    }
    assert.notEqual(num(ans[0]), num(ans[1]));
  },
  double: ({ a, b, c, d }, ans) => {
    const inner = (x) => simpson((y) => c * x + d * y, 0, b, 100);
    close(num(ans[0]), simpson(inner, 0, a, 100), "∬");
  },
  comb: ({ n, k }, ans) => close(num(ans[0]), core.factorial(n) / (core.factorial(k) * core.factorial(n - k)), "C(n,k)"),
  urn: ({ r, b, same }, ans) => {
    // brute force over ordered pairs of distinct balls
    let fav = 0;
    let tot = 0;
    const balls = [...Array(r).fill("R"), ...Array(b).fill("B")];
    for (let i = 0; i < balls.length; i++)
      for (let j = 0; j < balls.length; j++) {
        if (i === j) continue;
        tot++;
        if (same ? balls[i] === balls[j] : balls[i] === "R" && balls[j] === "R") fav++;
      }
    close(num(ans[0]), fav / tot, "urn");
  },
  expvar: ({ vals, counts, D }, ans) => {
    const ps = counts.map((c) => c / D);
    close(ps.reduce((s, x) => s + x, 0), 1, "probabilities sum to 1");
    assert.ok(counts.every((c) => c > 0));
    const E = vals.reduce((s, v, i) => s + v * ps[i], 0);
    const V = vals.reduce((s, v, i) => s + (v - E) ** 2 * ps[i], 0);
    close(num(ans[0]), E, "E");
    close(num(ans[1]), V, "Var");
  },
  binom: ({ n, p, k }, ans) => {
    // brute force over all 2^n outcomes
    const pr = p[0] / p[1];
    let s = 0;
    for (let mask = 0; mask < 1 << n; mask++) {
      let ones = 0;
      let w = 1;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          ones++;
          w *= pr;
        } else w *= 1 - pr;
      }
      if (ones === k) s += w;
    }
    close(num(ans[0]), s, "binomial");
  },
  bayes: ({ prev, sens, fpr }, ans) => {
    // count people in a population of 1,000,000
    const N = 1e6;
    const sick = (N * prev) / 100;
    const tp = (sick * sens) / 100;
    const fp = ((N - sick) * fpr) / 100;
    close(num(ans[0]), tp / (tp + fp), "Bayes");
  },
  stats: ({ data }, ans) => {
    const m = data.reduce((s, x) => s + x, 0) / data.length;
    close(num(ans[0]), m, "mean");
    close(num(ans[1]), data.reduce((s, x) => s + (x - m) ** 2, 0) / data.length, "variance");
  },
  pdf: ({ k, a }, ans) => {
    const c = num(ans[0]);
    close(simpson((x) => c * x ** k, 0, a), 1, "∫f = 1");
    close(num(ans[1]), simpson((x) => x * c * x ** k, 0, a), "E[X]");
  },
};

Object.assign(verify, require("./ag-verifiers.js"));

function* texIn(html) {
  const re = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  let m;
  while ((m = re.exec(html))) yield { tex: m[1] ?? m[2], display: m[1] != null };
}

test("every algebraic geometry type explains why it matters", () => {
  for (const t of P.TYPES.filter((t) => t.topic === "ag")) assert.ok(t.why && t.why.length > 80, t.id);
});

test("every problem type has a verifier", () => {
  for (const t of P.TYPES) assert.ok(verify[t.id], `missing verifier for ${t.id}`);
});

for (const t of P.TYPES) {
  test(`${t.id}: answers are mathematically correct`, () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const pr = P.generate(t.id, seed);
      verify[t.id](
        pr.data,
        pr.answers.map((a) => a.value)
      );
    }
  });

  test(`${t.id}: deterministic, well-formed, and TeX renders`, () => {
    for (let seed = 1; seed <= 60; seed++) {
      const a = P.generate(t.id, seed);
      const b = P.generate(t.id, seed);
      assert.deepEqual(
        a.answers.map((x) => x.value.toString()),
        b.answers.map((x) => x.value.toString())
      );
      assert.equal(a.statement, b.statement);
      assert.ok(a.answers.length >= 1);
      if (a.grid) assert.equal(a.grid[0] * a.grid[1], a.answers.length);
      for (const ans of a.answers) {
        assert.ok(ans.value instanceof core.Fraction);
        assert.ok(Number.isSafeInteger(ans.value.n) && Number.isSafeInteger(ans.value.d));
        katex.renderToString(ans.label, { throwOnError: true });
      }
      for (const html of [a.statement, a.hint, ...a.solution, ...(a.why ? [a.why] : [])]) {
        assert.ok(!/undefined|NaN|\[object/.test(html), `bad text in ${t.id}#${seed}: ${html}`);
        for (const { tex, display } of texIn(html)) {
          try {
            katex.renderToString(tex, { throwOnError: true, displayMode: display });
          } catch (e) {
            assert.fail(`${t.id}#${seed} TeX error: ${e.message}\n${tex}`);
          }
        }
      }
    }
  });

  test(`${t.id}: checker accepts the right answer and rejects a wrong one`, () => {
    for (let seed = 1; seed <= 40; seed++) {
      const pr = P.generate(t.id, seed);
      const right = pr.answers.map((a) => a.value.toString());
      assert.ok(core.checkAnswers(pr, right).ok);
      if (pr.unordered) assert.ok(core.checkAnswers(pr, [...right].reverse()).ok);
      const wrong = right.slice();
      wrong[0] = pr.answers[0].value.add(1).toString();
      assert.ok(!core.checkAnswers(pr, wrong).ok);
    }
  });
}
