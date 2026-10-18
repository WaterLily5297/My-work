/*
 * Problem generators. Each generator takes a seeded RNG and returns:
 *   {
 *     statement: HTML with TeX in \( \) or \[ \],
 *     answers:   [{ label: TeX, value: Fraction }],
 *     unordered: true if the answers may be entered in any order,
 *     grid:      [rows, cols] to lay the answer boxes out as a matrix,
 *     hint:      HTML,
 *     solution:  [HTML, ...]  (worked steps)
 *   }
 * The same (type, seed) always produces the same problem.
 */
(function (root, factory) {
  const isNode = typeof module === "object" && module.exports;
  const core = isNode ? require("./core.js") : root.MathDrillCore;
  const ag = isNode ? require("./problems-ag.js") : root.MathDrillAG;
  const lib = factory(core, ag);
  if (typeof module === "object" && module.exports) module.exports = lib;
  else root.MathDrillProblems = lib;
})(typeof self !== "undefined" ? self : this, function (core, ag) {
  "use strict";
  const { F, Fraction, p, sumTex, polyTex, polyEval, matTex, vecTex, binom, factorial } = core;

  const det2 = (m) => m[0][0] * m[1][1] - m[0][1] * m[1][0];
  const det3 = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const minor = (m, i, j) => m.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));
  const matMul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
  const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  /** (x - r) written nicely, e.g. (x + 3), or just x when r = 0. */
  const lin = (v, r) => (r === 0 ? v : `(${v} ${r > 0 ? "-" : "+"} ${Math.abs(r)})`);
  /** k·x written nicely: x, -x, 3x. */
  const kx = (k, v = "x") => (k === 1 ? v : k === -1 ? `-${v}` : `${k}${v}`);
  const sub = (i, j) => `_{${i}${j}}`;
  /** Determinant bars instead of parentheses. */
  const detTex = (m) => matTex(m).replace(/pmatrix/g, "vmatrix");
  /** e^{rx}, or nothing when r = 0 (since e^0 = 1). */
  const ex = (r) => (r === 0 ? "" : ` e^{${kx(r)}}`);

  // =====================================================================
  // Linear algebra
  // =====================================================================

  function det2x2(rng) {
    const A = [
      [rng.int(-6, 6), rng.int(-6, 6)],
      [rng.int(-6, 6), rng.int(-6, 6)],
    ];
    const [[a, b], [c, d]] = A;
    const det = det2(A);
    return {
      data: { A },
      statement: `Compute the determinant of \\[A = ${matTex(A)}.\\]`,
      answers: [{ label: "\\det A", value: F(det) }],
      hint: "For a 2×2 matrix, \\(\\det\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix} = ad - bc\\).",
      solution: [
        `\\(\\det A = ad - bc = ${p(a)}\\cdot${p(d)} - ${p(b)}\\cdot${p(c)} = ${a * d} - ${p(b * c)} = ${det}\\).`,
      ],
    };
  }

  function det3x3(rng) {
    const A = [0, 1, 2].map(() => [0, 1, 2].map(() => rng.int(-4, 4)));
    const minors = [0, 1, 2].map((j) => det2(minor(A, 0, j)));
    const det = det3(A);
    const [a, b, c] = A[0];
    return {
      data: { A },
      statement: `Compute the determinant of \\[A = ${matTex(A)}.\\]`,
      answers: [{ label: "\\det A", value: F(det) }],
      hint: "Use cofactor expansion along the first row: \\(\\det A = a_{11}M_{11} - a_{12}M_{12} + a_{13}M_{13}\\), where \\(M_{1j}\\) is the 2×2 minor obtained by deleting row 1 and column \\(j\\).",
      solution: [
        `Expand along the first row: \\[\\det A = ${p(a)}${detTex(minor(A, 0, 0))} - ${p(b)}${detTex(minor(A, 0, 1))} + ${p(c)}${detTex(minor(A, 0, 2))}\\]`,
        `The minors are \\(M_{11} = ${minors[0]}\\), \\(M_{12} = ${minors[1]}\\), \\(M_{13} = ${minors[2]}\\).`,
        `\\(\\det A = ${p(a)}\\cdot${p(minors[0])} - ${p(b)}\\cdot${p(minors[1])} + ${p(c)}\\cdot${p(minors[2])} = ${det}\\).`,
      ],
    };
  }

  function matrixProduct(rng) {
    const A = [0, 1].map(() => [0, 1].map(() => rng.int(-4, 4)));
    const B = [0, 1].map(() => [0, 1].map(() => rng.int(-4, 4)));
    const C = matMul(A, B);
    const answers = [];
    const steps = [];
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        answers.push({ label: `(AB)${sub(i + 1, j + 1)}`, value: F(C[i][j]) });
        steps.push(
          `\\((AB)${sub(i + 1, j + 1)} = ${p(A[i][0])}\\cdot${p(B[0][j])} + ${p(A[i][1])}\\cdot${p(B[1][j])} = ${C[i][j]}\\)`
        );
      }
    return {
      data: { A, B },
      statement: `Compute the product \\(AB\\), where \\[A = ${matTex(A)}, \\quad B = ${matTex(B)}.\\]`,
      answers,
      grid: [2, 2],
      hint: "Entry \\((AB)_{ij}\\) is the dot product of row \\(i\\) of \\(A\\) with column \\(j\\) of \\(B\\).",
      solution: [...steps, `So \\(AB = ${matTex(C)}\\).`],
    };
  }

  function inverse2x2(rng) {
    let A, det;
    do {
      A = [0, 1].map(() => [0, 1].map(() => rng.int(-5, 5)));
      det = det2(A);
    } while (det === 0 || Math.abs(det) > 6);
    const [[a, b], [c, d]] = A;
    const adj = [
      [d, -b],
      [-c, a],
    ];
    const inv = adj.map((r) => r.map((x) => F(x, det)));
    const answers = [];
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) answers.push({ label: `(A^{-1})${sub(i + 1, j + 1)}`, value: inv[i][j] });
    return {
      data: { A },
      statement: `Find the inverse of \\[A = ${matTex(A)}.\\] Enter fractions like <code>-3/4</code>.`,
      answers,
      grid: [2, 2],
      hint: "\\(\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}^{-1} = \\dfrac{1}{ad-bc}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}\\).",
      solution: [
        `\\(\\det A = ${p(a)}\\cdot${p(d)} - ${p(b)}\\cdot${p(c)} = ${det}\\), which is nonzero, so \\(A\\) is invertible.`,
        `\\(A^{-1} = \\dfrac{1}{${det}}${matTex(adj)} = ${matTex(inv)}\\).`,
      ],
    };
  }

  function eigenvalues2x2(rng) {
    let q, r;
    do {
      q = rng.int(-2, 2);
      r = rng.int(-2, 2);
    } while (q === 0 && r === 0);
    const l1 = rng.int(-5, 5);
    let l2;
    do l2 = rng.int(-5, 5);
    while (l2 === l1);
    // A = P D P^{-1} with det P = 1, so A has integer entries and eigenvalues l1, l2.
    const P = [
      [1 + q * r, q],
      [r, 1],
    ];
    const Pinv = [
      [1, -q],
      [-r, 1 + q * r],
    ];
    const A = matMul(matMul(P, [[l1, 0], [0, l2]]), Pinv);
    const tr = l1 + l2;
    const det = l1 * l2;
    return {
      data: { A },
      statement: `Find both eigenvalues (in either order) of \\[A = ${matTex(A)}.\\]`,
      answers: [
        { label: "\\lambda_1", value: F(l1) },
        { label: "\\lambda_2", value: F(l2) },
      ],
      unordered: true,
      hint: "Solve \\(\\det(A - \\lambda I) = 0\\). For a 2×2 matrix this is \\(\\lambda^2 - (\\operatorname{tr}A)\\lambda + \\det A = 0\\).",
      solution: [
        `\\(\\operatorname{tr}A = ${A[0][0]} + ${p(A[1][1])} = ${tr}\\) and \\(\\det A = ${p(A[0][0])}\\cdot${p(A[1][1])} - ${p(A[0][1])}\\cdot${p(A[1][0])} = ${det}\\).`,
        `Characteristic equation: \\(${polyTex([1, -tr, det], "\\lambda")} = 0\\).`,
        `It factors as \\(${lin("\\lambda", l1)}${lin("\\lambda", l2)} = 0\\), so \\(\\lambda = ${l1}\\) or \\(\\lambda = ${l2}\\).`,
      ],
    };
  }

  function crossProduct(rng) {
    const u = [0, 1, 2].map(() => rng.int(-4, 4));
    const v = [0, 1, 2].map(() => rng.int(-4, 4));
    const w = cross(u, v);
    return {
      data: { u, v },
      statement: `Compute the cross product \\(\\mathbf{u} \\times \\mathbf{v}\\) for \\[\\mathbf{u} = ${vecTex(u)}, \\quad \\mathbf{v} = ${vecTex(v)}.\\]`,
      answers: [
        { label: "x", value: F(w[0]) },
        { label: "y", value: F(w[1]) },
        { label: "z", value: F(w[2]) },
      ],
      hint: "\\(\\mathbf{u}\\times\\mathbf{v} = (u_2v_3 - u_3v_2,\\; u_3v_1 - u_1v_3,\\; u_1v_2 - u_2v_1)\\).",
      solution: [
        `\\(x = ${p(u[1])}\\cdot${p(v[2])} - ${p(u[2])}\\cdot${p(v[1])} = ${w[0]}\\)`,
        `\\(y = ${p(u[2])}\\cdot${p(v[0])} - ${p(u[0])}\\cdot${p(v[2])} = ${w[1]}\\)`,
        `\\(z = ${p(u[0])}\\cdot${p(v[1])} - ${p(u[1])}\\cdot${p(v[0])} = ${w[2]}\\)`,
        `So \\(\\mathbf{u}\\times\\mathbf{v} = ${vecTex(w)}\\).`,
      ],
    };
  }

  function matrixRank(rng) {
    const rank = rng.pick([1, 2, 2, 3]);
    const vec = () => [0, 1, 2].map(() => rng.int(-4, 4));
    const isZero = (v) => v.every((x) => x === 0);
    let A;
    const steps = [];
    if (rank === 3) {
      do A = [vec(), vec(), vec()];
      while (det3(A) === 0);
      steps.push(`\\(\\det A = ${det3(A)} \\neq 0\\), so the three rows are linearly independent.`);
      steps.push("Therefore \\(\\operatorname{rank} A = 3\\).");
    } else if (rank === 2) {
      let r1, r2;
      do {
        r1 = vec();
        r2 = vec();
      } while (isZero(cross(r1, r2)));
      const a = rng.int(-2, 2);
      const b = rng.int(-2, 2);
      const r3 = r1.map((x, i) => a * x + b * r2[i]);
      A = [r1, r2, r3];
      steps.push(`Row 3 \\(= ${p(a)}\\cdot\\) Row 1 \\(+ ${p(b)}\\cdot\\) Row 2, so row 3 adds nothing new (and \\(\\det A = 0\\)).`);
      steps.push("Rows 1 and 2 are not multiples of each other, so they are linearly independent.");
      steps.push("Therefore \\(\\operatorname{rank} A = 2\\).");
    } else {
      let r1;
      do r1 = vec();
      while (isZero(r1));
      const k2 = rng.int(-2, 2);
      const k3 = rng.int(-2, 2);
      A = [r1, r1.map((x) => k2 * x), r1.map((x) => k3 * x)];
      steps.push(`Row 2 \\(= ${p(k2)}\\cdot\\) Row 1 and Row 3 \\(= ${p(k3)}\\cdot\\) Row 1.`);
      steps.push("Every row is a multiple of the nonzero row 1, so \\(\\operatorname{rank} A = 1\\).");
    }
    return {
      data: { A },
      statement: `Find the rank of \\[A = ${matTex(A)}.\\]`,
      answers: [{ label: "\\operatorname{rank} A", value: F(rank) }],
      hint: "The rank is the number of linearly independent rows. Row-reduce, or check \\(\\det A\\) first: if it is nonzero the rank is 3.",
      solution: steps,
    };
  }

  function linearSystem(rng) {
    const x = rng.int(-5, 5);
    const y = rng.int(-5, 5);
    let A;
    do A = [0, 1].map(() => [0, 1].map(() => rng.nonzero(-5, 5)));
    while (det2(A) === 0);
    const b = [A[0][0] * x + A[0][1] * y, A[1][0] * x + A[1][1] * y];
    const D = det2(A);
    const Dx = det2([
      [b[0], A[0][1]],
      [b[1], A[1][1]],
    ]);
    const Dy = det2([
      [A[0][0], b[0]],
      [A[1][0], b[1]],
    ]);
    const eq = (r) => `${sumTex([
      [A[r][0], "x"],
      [A[r][1], "y"],
    ])} &= ${b[r]}`;
    return {
      data: { A, b },
      statement: `Solve the system \\[\\begin{aligned} ${eq(0)} \\\\ ${eq(1)} \\end{aligned}\\]`,
      answers: [
        { label: "x", value: F(x) },
        { label: "y", value: F(y) },
      ],
      hint: "Use elimination, or Cramer's rule: \\(x = D_x / D\\), \\(y = D_y / D\\).",
      solution: [
        `\\(D = ${detTex(A)} = ${D}\\)`,
        `\\(D_x = ${detTex([[b[0], A[0][1]], [b[1], A[1][1]]])} = ${Dx}\\), \\(D_y = ${detTex([[A[0][0], b[0]], [A[1][0], b[1]]])} = ${Dy}\\)`,
        `\\(x = \\dfrac{${Dx}}{${D}} = ${x}\\), \\(y = \\dfrac{${Dy}}{${D}} = ${y}\\).`,
      ],
    };
  }

  // =====================================================================
  // Calculus
  // =====================================================================

  function derivativePoly(rng) {
    const a = rng.nonzero(-3, 3);
    const b = rng.int(-5, 5);
    const c = rng.int(-5, 5);
    const d = rng.int(-5, 5);
    const x0 = rng.int(-3, 3);
    const dcoef = [3 * a, 2 * b, c];
    const val = polyEval(dcoef, x0);
    return {
      data: { coeffs: [a, b, c, d], x0 },
      statement: `Let \\(f(x) = ${polyTex([a, b, c, d])}\\). Find \\(f'(${x0})\\).`,
      answers: [{ label: `f'(${x0})`, value: val }],
      hint: "Power rule: \\(\\frac{d}{dx}x^n = n x^{n-1}\\). Differentiate term by term, then substitute.",
      solution: [
        `\\(f'(x) = ${polyTex(dcoef)}\\)`,
        `\\(f'(${x0}) = ${3 * a}\\cdot${p(x0)}^2 + ${p(2 * b)}\\cdot${p(x0)} + ${p(c)} = ${val.toTex()}\\)`,
      ],
    };
  }

  function chainRule(rng) {
    const a = rng.nonzero(-3, 3);
    const b = rng.int(-4, 4);
    const n = rng.int(2, 4);
    const x0 = rng.int(-2, 2);
    const inner = a * x0 + b;
    const val = n * a * inner ** (n - 1);
    const innerTex = sumTex([
      [a, "x"],
      [b, ""],
    ]);
    return {
      data: { a, b, n, x0 },
      statement: `Let \\(f(x) = \\left(${innerTex}\\right)^{${n}}\\). Find \\(f'(${x0})\\).`,
      answers: [{ label: `f'(${x0})`, value: F(val) }],
      hint: "Chain rule: \\(\\frac{d}{dx}\\,g(x)^n = n\\,g(x)^{n-1}\\,g'(x)\\).",
      solution: [
        `\\(f'(x) = ${n}\\left(${innerTex}\\right)^{${n - 1}}\\cdot ${p(a)}\\)`,
        `At \\(x = ${x0}\\): the inner part is \\(${a}\\cdot${p(x0)} + ${p(b)} = ${inner}\\).`,
        `\\(f'(${x0}) = ${n}\\cdot${p(inner)}^{${n - 1}}\\cdot${p(a)} = ${val}\\)`,
      ],
    };
  }

  function definiteIntegral(rng) {
    let c3, c2, c1, c0;
    do {
      c3 = rng.int(-2, 2);
      c2 = rng.int(-3, 3);
      c1 = rng.int(-4, 4);
      c0 = rng.int(-4, 4);
    } while ((c3 === 0 && c2 === 0) || (c1 === 0 && c0 === 0));
    const lo = rng.int(-2, 1);
    const hi = rng.int(lo + 1, 3);
    const anti = [F(c3, 4), F(c2, 3), F(c1, 2), F(c0), F(0)];
    const Fhi = polyEval(anti, hi);
    const Flo = polyEval(anti, lo);
    const val = Fhi.sub(Flo);
    return {
      data: { coeffs: [c3, c2, c1, c0], lo, hi },
      statement: `Evaluate \\[\\int_{${lo}}^{${hi}} \\left(${polyTex([c3, c2, c1, c0])}\\right) dx.\\] Enter fractions like <code>7/3</code>.`,
      answers: [{ label: "\\text{value}", value: val }],
      hint: "Find an antiderivative \\(F\\) using \\(\\int x^n\\,dx = \\frac{x^{n+1}}{n+1}\\), then compute \\(F(b) - F(a)\\).",
      solution: [
        `Antiderivative: \\(F(x) = ${polyTex(anti)}\\)`,
        `\\(F(${hi}) = ${Fhi.toTex()}\\), \\(F(${lo}) = ${Flo.toTex()}\\)`,
        `\\(\\displaystyle\\int_{${lo}}^{${hi}} = F(${hi}) - F(${lo}) = ${val.toTex()}\\)`,
      ],
    };
  }

  function limitCancel(rng) {
    const r = rng.int(-4, 4);
    let s, t;
    do {
      s = rng.int(-4, 4);
      t = rng.int(-4, 4);
    } while (t === r || s === t);
    const num = [1, -(r + s), r * s];
    const den = [1, -(r + t), r * t];
    const val = F(r - s, r - t);
    return {
      data: { num, den, at: r },
      statement: `Evaluate \\[\\lim_{x \\to ${r}} \\frac{${polyTex(num)}}{${polyTex(den)}}.\\]`,
      answers: [{ label: "\\text{limit}", value: val }],
      hint: `Plugging in \\(x = ${r}\\) gives \\(0/0\\). Factor numerator and denominator — they share a factor.`,
      solution: [
        `\\(\\dfrac{${polyTex(num)}}{${polyTex(den)}} = \\dfrac{${lin("x", r)}${lin("x", s)}}{${lin("x", r)}${lin("x", t)}} = \\dfrac{${s === 0 ? "x" : lin("x", s)}}{${t === 0 ? "x" : lin("x", t)}}\\) for \\(x \\neq ${r}\\).`,
        `Now substitute \\(x = ${r}\\): \\(\\dfrac{${r} - ${p(s)}}{${r} - ${p(t)}} = \\dfrac{${r - s}}{${r - t}} = ${val.toTex()}\\).`,
      ],
    };
  }

  function partialDerivative(rng) {
    const a = rng.nonzero(-3, 3);
    const b = rng.nonzero(-2, 2);
    const c = rng.int(-3, 3);
    const d = rng.int(-4, 4);
    const x0 = rng.int(-2, 2);
    const y0 = rng.int(-2, 2);
    const fTex = sumTex([
      [a, "x^{2}y"],
      [b, "xy^{3}"],
      [c, "y^{2}"],
      [d, "x"],
    ]);
    const wrtX = rng.next() < 0.5;
    let derivTex, val, subst;
    if (wrtX) {
      derivTex = sumTex([
        [2 * a, "xy"],
        [b, "y^{3}"],
        [d, ""],
      ]);
      val = 2 * a * x0 * y0 + b * y0 ** 3 + d;
      subst = `${2 * a}\\cdot${p(x0)}\\cdot${p(y0)} + ${p(b)}\\cdot${p(y0)}^3 + ${p(d)}`;
    } else {
      derivTex = sumTex([
        [a, "x^{2}"],
        [3 * b, "xy^{2}"],
        [2 * c, "y"],
      ]);
      val = a * x0 ** 2 + 3 * b * x0 * y0 ** 2 + 2 * c * y0;
      subst = `${a}\\cdot${p(x0)}^2 + ${p(3 * b)}\\cdot${p(x0)}\\cdot${p(y0)}^2 + ${p(2 * c)}\\cdot${p(y0)}`;
    }
    const v = wrtX ? "x" : "y";
    const sym = `\\frac{\\partial f}{\\partial ${v}}`;
    return {
      data: { a, b, c, d, x0, y0, wrtX },
      statement: `Let \\(f(x, y) = ${fTex}\\). Find \\(\\dfrac{\\partial f}{\\partial ${v}}\\) at \\((x, y) = (${x0}, ${y0})\\).`,
      answers: [{ label: `${sym}(${x0},${y0})`, value: F(val) }],
      hint: `Differentiate with respect to \\(${v}\\) while treating \\(${wrtX ? "y" : "x"}\\) as a constant.`,
      solution: [`\\(${sym} = ${derivTex}\\)`, `At \\((${x0}, ${y0})\\): \\(${subst} = ${val}\\)`],
    };
  }

  function geometricSeries(rng) {
    const den = rng.int(2, 5);
    const num = rng.nonzero(-(den - 1), den - 1);
    const r = F(num, den);
    const a = rng.int(1, 6);
    const k = rng.int(0, 2);
    const first = r.pow(k).mul(a);
    const val = first.div(F(1).sub(r));
    const rTex = `\\left(${r.toTex()}\\right)`;
    return {
      data: { a, r: [num, den], k },
      statement: `Find the sum \\[\\sum_{n=${k}}^{\\infty} ${a === 1 ? "" : a} ${rTex}^{n}.\\]`,
      answers: [{ label: "\\text{sum}", value: val }],
      hint: "A geometric series with first term \\(t\\) and ratio \\(r\\), \\(|r| < 1\\), sums to \\(\\dfrac{t}{1 - r}\\). Be careful which term comes first.",
      solution: [
        `This is geometric with ratio \\(r = ${r.toTex()}\\) (and \\(|r| < 1\\), so it converges).`,
        `First term (\\(n = ${k}\\)): \\(t = ${a === 1 ? "" : a + "\\cdot"}${rTex}^{${k}} = ${first.toTex()}\\).`,
        `Sum \\(= \\dfrac{t}{1 - r} = \\dfrac{${first.toTex()}}{${F(1).sub(r).toTex()}} = ${val.toTex()}\\).`,
      ],
    };
  }

  function taylorCoefficient(rng) {
    const kind = rng.pick(["exp", "geom", "cos", "log"]);
    let k = rng.pick([-3, -2, -1, 1, 2, 3]);
    let n, fTex, val, steps;
    if (kind === "exp") {
      n = rng.int(2, 4);
      fTex = `e^{${kx(k)}}`;
      val = F(k ** n, factorial(n));
      steps = [
        `\\(e^{u} = \\sum_{m\\ge 0} \\dfrac{u^m}{m!}\\). With \\(u = ${kx(k)}\\), the \\(x^{${n}}\\) term is \\(\\dfrac{(${k})^{${n}}}{${n}!}x^{${n}}\\).`,
        `Coefficient \\(= \\dfrac{${k ** n}}{${factorial(n)}} = ${val.toTex()}\\).`,
      ];
    } else if (kind === "geom") {
      n = rng.int(2, 4);
      fTex = `\\dfrac{1}{1 ${k > 0 ? "-" : "+"} ${kx(Math.abs(k))}}`;
      val = F(k ** n);
      steps = [
        `\\(\\dfrac{1}{1-u} = \\sum_{m\\ge 0} u^m\\). With \\(u = ${kx(k)}\\), the \\(x^{${n}}\\) term is \\((${k})^{${n}}x^{${n}}\\).`,
        `Coefficient \\(= ${val.toTex()}\\).`,
      ];
    } else if (kind === "cos") {
      n = rng.pick([2, 4]);
      fTex = `\\cos(${kx(k)})`;
      const sign = (n / 2) % 2 === 0 ? 1 : -1;
      val = F(sign * k ** n, factorial(n));
      steps = [
        `\\(\\cos u = 1 - \\dfrac{u^2}{2!} + \\dfrac{u^4}{4!} - \\cdots\\). With \\(u = ${kx(k)}\\), the \\(x^{${n}}\\) term is \\(${sign < 0 ? "-" : ""}\\dfrac{(${k})^{${n}}}{${n}!}x^{${n}}\\).`,
        `Coefficient \\(= ${val.toTex()}\\).`,
      ];
    } else {
      k = 1;
      n = rng.int(2, 5);
      fTex = "\\ln(1 + x)";
      val = F(n % 2 === 0 ? -1 : 1, n);
      steps = [
        "\\(\\ln(1+x) = x - \\dfrac{x^2}{2} + \\dfrac{x^3}{3} - \\cdots = \\sum_{m\\ge 1} \\dfrac{(-1)^{m+1}}{m}x^m\\).",
        `Coefficient of \\(x^{${n}}\\): \\(\\dfrac{(-1)^{${n + 1}}}{${n}} = ${val.toTex()}\\).`,
      ];
    }
    return {
      data: { kind, k, n },
      statement: `Find the coefficient of \\(x^{${n}}\\) in the Maclaurin series (Taylor series at 0) of \\[f(x) = ${fTex}.\\]`,
      answers: [{ label: `[x^{${n}}]`, value: val }],
      hint: "Start from a known series (\\(e^u\\), \\(\\frac{1}{1-u}\\), \\(\\cos u\\), \\(\\ln(1+u)\\)) and substitute.",
      solution: steps,
    };
  }

  function linearODE(rng) {
    const r1 = rng.int(-5, 5);
    let r2;
    do r2 = rng.int(-5, 5);
    while (r2 === r1);
    const pp = -(r1 + r2);
    const qq = r1 * r2;
    const eq = sumTex([
      [1, "y''"],
      [pp, "y'"],
      [qq, "y"],
    ]);
    return {
      data: { p: pp, q: qq },
      statement: `The general solution of \\[${eq} = 0\\] has the form \\(y = C_1 e^{r_1 x} + C_2 e^{r_2 x}\\). Find \\(r_1\\) and \\(r_2\\). (Any order.)`,
      answers: [
        { label: "r_1", value: F(r1) },
        { label: "r_2", value: F(r2) },
      ],
      unordered: true,
      hint: "Try \\(y = e^{rx}\\). Substituting gives the characteristic equation \\(r^2 + pr + q = 0\\).",
      solution: [
        `Characteristic equation: \\(${polyTex([1, pp, qq], "r")} = 0\\).`,
        `Factor: \\(${lin("r", r1)}${lin("r", r2)} = 0\\), so \\(r = ${r1}\\) or \\(r = ${r2}\\).`,
        `General solution: \\(y = C_1${ex(r1)} + C_2${ex(r2)}\\).`,
      ],
    };
  }

  function doubleIntegral(rng) {
    const a = rng.int(1, 3);
    const b = rng.int(1, 3);
    const c = rng.nonzero(-3, 3);
    const d = rng.nonzero(-3, 3);
    // inner: ∫_0^b (c x + d y) dy = c b x + d b^2 / 2
    const innerX = F(c * b);
    const innerC = F(d * b * b, 2);
    const val = innerX.mul(F(a * a, 2)).add(innerC.mul(a));
    return {
      data: { a, b, c, d },
      statement: `Evaluate \\[\\int_{0}^{${a}} \\int_{0}^{${b}} \\left(${sumTex([
        [c, "x"],
        [d, "y"],
      ])}\\right) dy\\, dx.\\]`,
      answers: [{ label: "\\text{value}", value: val }],
      hint: "Do the inner integral in \\(y\\) first (treat \\(x\\) as a constant), then integrate the result in \\(x\\).",
      solution: [
        `Inner: \\(\\displaystyle\\int_0^{${b}} (${sumTex([[c, "x"], [d, "y"]])})\\,dy = \\left[${sumTex([[c, "xy"], [F(d, 2), "y^{2}"]])}\\right]_0^{${b}} = ${sumTex([[innerX, "x"], [innerC, ""]])}\\)`,
        `Outer: \\(\\displaystyle\\int_0^{${a}} \\left(${sumTex([[innerX, "x"], [innerC, ""]])}\\right) dx = \\left[${sumTex([[innerX.div(2), "x^{2}"], [innerC, "x"]])}\\right]_0^{${a}} = ${val.toTex()}\\)`,
      ],
    };
  }

  // =====================================================================
  // Probability & statistics
  // =====================================================================

  function combinations(rng) {
    const n = rng.int(6, 12);
    const k = rng.int(2, Math.min(5, n - 2));
    const val = binom(n, k);
    return {
      data: { n, k },
      statement: `A study group of ${k} students is chosen from a class of ${n}. How many different groups are possible?`,
      answers: [{ label: `\\binom{${n}}{${k}}`, value: F(val) }],
      hint: "Order doesn't matter, so use \\(\\binom{n}{k} = \\dfrac{n!}{k!\\,(n-k)!}\\).",
      solution: [
        `\\(\\dbinom{${n}}{${k}} = \\dfrac{${n}!}{${k}!\\,${n - k}!} = \\dfrac{${Array.from({ length: k }, (_, i) => n - i).join("\\cdot")}}{${Array.from({ length: k }, (_, i) => k - i).join("\\cdot")}} = ${val}\\)`,
      ],
    };
  }

  function urnProbability(rng) {
    const r = rng.int(2, 6);
    const b = rng.int(2, 6);
    const N = r + b;
    const same = rng.next() < 0.5;
    const pRR = F(r * (r - 1), N * (N - 1));
    const pBB = F(b * (b - 1), N * (N - 1));
    const val = same ? pRR.add(pBB) : pRR;
    const ask = same ? "both balls are the same colour" : "both balls are red";
    const steps = [
      `\\(P(\\text{red, red}) = \\dfrac{${r}}{${N}}\\cdot\\dfrac{${r - 1}}{${N - 1}} = ${pRR.toTex()}\\)`,
    ];
    if (same) {
      steps.push(`\\(P(\\text{blue, blue}) = \\dfrac{${b}}{${N}}\\cdot\\dfrac{${b - 1}}{${N - 1}} = ${pBB.toTex()}\\)`);
      steps.push(`\\(P(\\text{same}) = ${pRR.toTex()} + ${pBB.toTex()} = ${val.toTex()}\\)`);
    }
    return {
      data: { r, b, same },
      statement: `A bag contains ${r} red and ${b} blue balls. Two balls are drawn without replacement. What is the probability that ${ask}?`,
      answers: [{ label: "P", value: val }],
      hint: "Multiply the probabilities of each draw, remembering the bag has one fewer ball for the second draw.",
      solution: steps,
    };
  }

  function expectationVariance(rng) {
    const D = rng.pick([4, 6, 8, 10, 12]);
    // three positive numerators summing to D
    const c1 = rng.int(1, D - 2);
    const c2 = rng.int(1, D - c1 - 1);
    const counts = [c1, c2, D - c1 - c2];
    const vals = [];
    while (vals.length < 3) {
      const v = rng.int(-3, 6);
      if (!vals.includes(v)) vals.push(v);
    }
    vals.sort((x, y) => x - y);
    const probs = counts.map((c) => F(c, D));
    const E = probs.reduce((s, q, i) => s.add(q.mul(vals[i])), F(0));
    const E2 = probs.reduce((s, q, i) => s.add(q.mul(vals[i] ** 2)), F(0));
    const V = E2.sub(E.pow(2));
    const table =
      "\\begin{array}{c|ccc} x & " +
      vals.join(" & ") +
      " \\\\ \\hline P(X=x) & " +
      probs.map((q) => q.toTex()).join(" & ") +
      "\\end{array}";
    return {
      data: { vals, counts, D },
      statement: `A random variable \\(X\\) has the distribution \\[${table}\\] Find \\(E[X]\\) and \\(\\operatorname{Var}(X)\\).`,
      answers: [
        { label: "E[X]", value: E },
        { label: "\\operatorname{Var}(X)", value: V },
      ],
      hint: "\\(E[X] = \\sum x\\,P(X=x)\\) and \\(\\operatorname{Var}(X) = E[X^2] - (E[X])^2\\).",
      solution: [
        `\\(E[X] = ${vals.map((v, i) => `${p(v)}\\cdot${probs[i].toTex()}`).join(" + ")} = ${E.toTex()}\\)`,
        `\\(E[X^2] = ${vals.map((v, i) => `${p(v)}^2\\cdot${probs[i].toTex()}`).join(" + ")} = ${E2.toTex()}\\)`,
        `\\(\\operatorname{Var}(X) = ${E2.toTex()} - \\left(${E.toTex()}\\right)^2 = ${V.toTex()}\\)`,
      ],
    };
  }

  function binomialProbability(rng) {
    const n = rng.int(3, 6);
    const prob = rng.pick([F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4)]);
    const k = rng.int(0, n);
    const q = F(1).sub(prob);
    const val = prob.pow(k).mul(q.pow(n - k)).mul(binom(n, k));
    return {
      data: { n, p: [prob.n, prob.d], k },
      statement: `\\(X \\sim \\operatorname{Bin}\\!\\left(${n}, ${prob.toTex()}\\right)\\). Find \\(P(X = ${k})\\).`,
      answers: [{ label: `P(X=${k})`, value: val }],
      hint: "\\(P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}\\).",
      solution: [
        `\\(P(X=${k}) = \\dbinom{${n}}{${k}}\\left(${prob.toTex()}\\right)^{${k}}\\left(${q.toTex()}\\right)^{${n - k}} = ${binom(n, k)}\\cdot ${prob.pow(k).toTex()}\\cdot ${q.pow(n - k).toTex()} = ${val.toTex()}\\)`,
      ],
    };
  }

  function bayesTheorem(rng) {
    const prev = rng.pick([1, 2, 5, 10]);
    const sens = rng.pick([90, 95, 99]);
    const fpr = rng.pick([5, 10]);
    const P = F(prev, 100);
    const S = F(sens, 100);
    const FP = F(fpr, 100);
    const tp = P.mul(S);
    const fp = F(1).sub(P).mul(FP);
    const val = tp.div(tp.add(fp));
    return {
      data: { prev, sens, fpr },
      statement: `A disease affects ${prev}% of a population. A test detects it in ${sens}% of people who have it, but also gives a positive result for ${fpr}% of people who don't. A random person tests positive. What is the probability they have the disease? (Exact fraction, or a decimal with at least 3 decimal places.)`,
      answers: [{ label: "P(D \\mid +)", value: val }],
      hint: "Bayes: \\(P(D\\mid +) = \\dfrac{P(+\\mid D)P(D)}{P(+\\mid D)P(D) + P(+\\mid \\neg D)P(\\neg D)}\\).",
      solution: [
        `True positives: \\(P(+\\mid D)P(D) = ${S.toTex()}\\cdot${P.toTex()} = ${tp.toTex()}\\)`,
        `False positives: \\(P(+\\mid \\neg D)P(\\neg D) = ${FP.toTex()}\\cdot${F(1).sub(P).toTex()} = ${fp.toTex()}\\)`,
        `\\(P(D\\mid +) = \\dfrac{${tp.toTex()}}{${tp.toTex()} + ${fp.toTex()}} = ${val.toTex()} \\approx ${val.valueOf().toFixed(3)}\\)`,
      ],
    };
  }

  function meanVariance(rng) {
    const data = Array.from({ length: 5 }, () => rng.int(1, 10));
    const n = data.length;
    const sum = data.reduce((s, x) => s + x, 0);
    const mean = F(sum, n);
    const sq = data.map((x) => F(x).sub(mean).pow(2));
    const V = sq.reduce((s, x) => s.add(x), F(0)).div(n);
    return {
      data: { data },
      statement: `For the data \\(${data.join(",\\ ")}\\), find the mean and the <b>population</b> variance (divide by \\(n\\)).`,
      answers: [
        { label: "\\bar{x}", value: mean },
        { label: "\\sigma^2", value: V },
      ],
      hint: "\\(\\bar x = \\frac{1}{n}\\sum x_i\\), \\(\\sigma^2 = \\frac{1}{n}\\sum (x_i - \\bar x)^2\\).",
      solution: [
        `\\(\\bar{x} = \\dfrac{${data.join(" + ")}}{${n}} = \\dfrac{${sum}}{${n}} = ${mean.toTex()}\\)`,
        `\\(\\sigma^2 = \\dfrac{1}{${n}}\\left(${sq.map((s) => s.toTex()).join(" + ")}\\right) = ${V.toTex()}\\)`,
      ],
    };
  }

  function continuousPdf(rng) {
    const k = rng.int(1, 3);
    const a = rng.int(1, 3);
    const c = F(k + 1, a ** (k + 1));
    const E = F((k + 1) * a, k + 2);
    const xk = k === 1 ? "x" : `x^{${k}}`;
    return {
      data: { k, a },
      statement: `A random variable \\(X\\) has density \\(f(x) = c\\,${xk}\\) for \\(0 \\le x \\le ${a}\\), and \\(0\\) otherwise. Find the constant \\(c\\) and \\(E[X]\\).`,
      answers: [
        { label: "c", value: c },
        { label: "E[X]", value: E },
      ],
      hint: "A density must integrate to 1. Then \\(E[X] = \\int x f(x)\\,dx\\).",
      solution: [
        `\\(\\displaystyle\\int_0^{${a}} c\\,${xk}\\,dx = c\\cdot\\frac{${a}^{${k + 1}}}{${k + 1}} = 1 \\;\\Rightarrow\\; c = ${c.toTex()}\\)`,
        `\\(\\displaystyle E[X] = \\int_0^{${a}} x\\cdot c\\,${xk}\\,dx = c\\cdot\\frac{${a}^{${k + 2}}}{${k + 2}} = ${c.toTex()}\\cdot${F(a ** (k + 2), k + 2).toTex()} = ${E.toTex()}\\)`,
      ],
    };
  }

  // =====================================================================
  // Registry
  // =====================================================================

  const TOPICS = [
    ag.TOPIC,
    { id: "linalg", name: "Linear Algebra" },
    { id: "calc", name: "Calculus" },
    { id: "prob", name: "Probability & Statistics" },
  ];

  const TYPES = [
    ...ag.TYPES,
    { id: "det2", topic: "linalg", name: "2×2 determinant", gen: det2x2 },
    { id: "det3", topic: "linalg", name: "3×3 determinant", gen: det3x3 },
    { id: "matmul", topic: "linalg", name: "Matrix product", gen: matrixProduct },
    { id: "inverse", topic: "linalg", name: "Inverse matrix", gen: inverse2x2 },
    { id: "eigen", topic: "linalg", name: "Eigenvalues", gen: eigenvalues2x2 },
    { id: "cross", topic: "linalg", name: "Cross product", gen: crossProduct },
    { id: "rank", topic: "linalg", name: "Rank", gen: matrixRank },
    { id: "system", topic: "linalg", name: "Linear systems", gen: linearSystem },
    { id: "deriv", topic: "calc", name: "Derivatives", gen: derivativePoly },
    { id: "chain", topic: "calc", name: "Chain rule", gen: chainRule },
    { id: "integral", topic: "calc", name: "Definite integrals", gen: definiteIntegral },
    { id: "limit", topic: "calc", name: "Limits", gen: limitCancel },
    { id: "partial", topic: "calc", name: "Partial derivatives", gen: partialDerivative },
    { id: "series", topic: "calc", name: "Geometric series", gen: geometricSeries },
    { id: "taylor", topic: "calc", name: "Taylor series", gen: taylorCoefficient },
    { id: "ode", topic: "calc", name: "2nd-order ODEs", gen: linearODE },
    { id: "double", topic: "calc", name: "Double integrals", gen: doubleIntegral },
    { id: "comb", topic: "prob", name: "Combinations", gen: combinations },
    { id: "urn", topic: "prob", name: "Drawing without replacement", gen: urnProbability },
    { id: "expvar", topic: "prob", name: "Expectation & variance", gen: expectationVariance },
    { id: "binom", topic: "prob", name: "Binomial distribution", gen: binomialProbability },
    { id: "bayes", topic: "prob", name: "Bayes' theorem", gen: bayesTheorem },
    { id: "stats", topic: "prob", name: "Mean & variance of data", gen: meanVariance },
    { id: "pdf", topic: "prob", name: "Continuous densities", gen: continuousPdf },
  ];

  const byId = Object.fromEntries(TYPES.map((t) => [t.id, t]));

  function generate(typeId, seed) {
    const type = byId[typeId];
    if (!type) throw new Error(`Unknown problem type: ${typeId}`);
    const problem = type.gen(core.makeRng(seed));
    return { ...problem, type: typeId, topic: type.topic, name: type.name, why: type.why || null, seed };
  }

  return { TOPICS, TYPES, byId, generate, Fraction };
});
