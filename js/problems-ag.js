/*
 * Algebraic geometry problem generators (plane curves, intersection theory,
 * genus, Riemann–Hurwitz, Riemann–Roch, Hilbert functions, embeddings).
 * Same contract as problems.js; registered there under the "ag" topic.
 */
(function (root, factory) {
  const core = typeof module === "object" && module.exports ? require("./core.js") : root.MathDrillCore;
  const lib = factory(core);
  if (typeof module === "object" && module.exports) module.exports = lib;
  else root.MathDrillAG = lib;
})(typeof self !== "undefined" ? self : this, function (core) {
  "use strict";
  const { F, p, sumTex, binom } = core;

  // ---------- Bivariate integer polynomials: { "i,j": coef } for coef·x^i·y^j ----------
  const key = (i, j) => `${i},${j}`;
  const terms = (f) =>
    Object.entries(f)
      .filter(([, c]) => c !== 0)
      .map(([k, c]) => {
        const [i, j] = k.split(",").map(Number);
        return { i, j, c };
      });
  const clean = (f) => Object.fromEntries(Object.entries(f).filter(([, c]) => c !== 0));
  const mono = (c, i = 0, j = 0) => clean({ [key(i, j)]: c });
  function padd(...fs) {
    const r = {};
    for (const f of fs) for (const { i, j, c } of terms(f)) r[key(i, j)] = (r[key(i, j)] || 0) + c;
    return clean(r);
  }
  const pscale = (f, s) => clean(Object.fromEntries(Object.entries(f).map(([k, c]) => [k, c * s])));
  function pmul(f, g) {
    const r = {};
    for (const a of terms(f)) for (const b of terms(g)) r[key(a.i + b.i, a.j + b.j)] = (r[key(a.i + b.i, a.j + b.j)] || 0) + a.c * b.c;
    return clean(r);
  }
  function ppow(f, k) {
    let r = mono(1);
    for (let n = 0; n < k; n++) r = pmul(r, f);
    return r;
  }
  /** f(X, Y) with X and Y replaced by the polynomials gx, gy. */
  function compose(f, gx, gy) {
    let r = {};
    for (const { i, j, c } of terms(f)) r = padd(r, pscale(pmul(ppow(gx, i), ppow(gy, j)), c));
    return r;
  }
  const X = mono(1, 1, 0);
  const Y = mono(1, 0, 1);
  const degree = (f) => Math.max(-1, ...terms(f).map((t) => t.i + t.j));
  const lowDegree = (f) => Math.min(...terms(f).map((t) => t.i + t.j));
  const homog = (f, d) => clean(Object.fromEntries(terms(f).filter((t) => t.i + t.j === d).map((t) => [key(t.i, t.j), t.c])));
  const dx = (f) => clean(Object.fromEntries(terms(f).filter((t) => t.i > 0).map((t) => [key(t.i - 1, t.j), t.c * t.i])));
  const dy = (f) => clean(Object.fromEntries(terms(f).filter((t) => t.j > 0).map((t) => [key(t.i, t.j - 1), t.c * t.j])));

  const pow1 = (v, k) => (k === 0 ? "" : k === 1 ? v : `${v}^{${k}}`);
  /** TeX, highest total degree first (or lowest first with ascending = true). */
  function ptex(f, vx = "x", vy = "y", ascending = false) {
    const ts = terms(f).sort((a, b) => {
      const da = a.i + a.j;
      const db = b.i + b.j;
      if (da !== db) return ascending ? da - db : db - da;
      return b.i - a.i;
    });
    return sumTex(ts.map(({ i, j, c }) => [c, pow1(vx, i) + pow1(vy, j)]));
  }

  // ---------- Univariate integer polynomials: arrays, lowest degree first ----------
  const uadd = (a, b) => Array.from({ length: Math.max(a.length, b.length) }, (_, k) => (a[k] || 0) + (b[k] || 0));
  function umul(a, b) {
    const r = new Array(a.length + b.length - 1).fill(0);
    a.forEach((x, i) => b.forEach((y, j) => (r[i + j] += x * y)));
    return r;
  }
  function upow(a, k) {
    let r = [1];
    for (let n = 0; n < k; n++) r = umul(r, a);
    return r;
  }
  const utexAsc = (a, v = "t") => sumTex(a.map((c, k) => [c, pow1(v, k)]));

  /** X + a written nicely: X, X + 2, X - 3. */
  const shift = (V, a) => (a === 0 ? V : `${V} ${a < 0 ? "-" : "+"} ${Math.abs(a)}`);

  /** "(y - 2x)" style linear factor y - r·x, or x itself. */
  const lineTex = (r, vx = "x", vy = "y") =>
    r === "X" ? vx : r === 0 ? vy : `(${vy} ${r > 0 ? "-" : "+"} ${Math.abs(r) === 1 ? "" : Math.abs(r)}${vx})`;

  // =====================================================================

  function singularPoint(rng) {
    const c = rng.pick([-3, -2, -1, 1, 2, 3]);
    const families = [
      { name: "a node", m: 2, lines: 2, f: padd(ppow(Y, 2), pscale(ppow(X, 3), -1), pscale(ppow(X, 2), -c)), why: `\\(Y^2 ${c > 0 ? "-" : "+"} ${Math.abs(c) === 1 ? "" : Math.abs(c)}X^2\\) has two distinct linear factors over \\(\\mathbb{C}\\) because \\(${c} \\neq 0\\)` },
      { name: "a cusp", m: 2, lines: 1, f: padd(ppow(Y, 2), pscale(ppow(X, 3), -c)), why: "\\(Y^2\\) is a double line, so there is one tangent line, \\(Y = 0\\)" },
      { name: "a tacnode", m: 2, lines: 1, f: padd(ppow(Y, 2), pscale(ppow(X, 4), -c)), why: "\\(Y^2\\) is a double line, so there is one tangent line, \\(Y = 0\\) (both branches are tangent to it)" },
      { name: "an \\(A_4\\) singularity (a higher cusp)", m: 2, lines: 1, f: padd(ppow(Y, 2), pscale(ppow(X, 5), -c)), why: "\\(Y^2\\) is a double line, so there is one tangent line, \\(Y = 0\\)" },
      { name: "a node (as on the folium of Descartes)", m: 2, lines: 2, f: padd(ppow(X, 3), ppow(Y, 3), pscale(pmul(X, Y), -c)), why: "\\(XY\\) splits into the two lines \\(X = 0\\) and \\(Y = 0\\)" },
      { name: "an \\(E_6\\) singularity", m: 3, lines: 1, f: padd(ppow(Y, 3), pscale(ppow(X, 4), -c)), why: "\\(Y^3\\) is a triple line, so there is one tangent line, \\(Y = 0\\)" },
    ];
    // Ordinary triple point: three distinct lines through the point
    const rs = [];
    while (rs.length < 3) {
      const r = rng.int(-2, 2);
      if (!rs.includes(r)) rs.push(r);
    }
    const tri = rs.reduce((acc, r) => pmul(acc, padd(Y, pscale(X, -r))), mono(1));
    families.push({ name: "an ordinary triple point (three lines through one point)", m: 3, lines: 3, f: tri, why: `\\(${rs.map((r) => lineTex(r, "X", "Y")).join("")}\\) has three distinct factors` });

    const fam = rng.pick(families);
    const a = rng.int(-3, 3);
    const b = rng.int(-3, 3);
    const f = compose(fam.f, padd(X, mono(-a)), padd(Y, mono(-b)));
    const local = compose(f, padd(X, mono(a)), padd(Y, mono(b)));
    const cone = homog(local, fam.m);
    return {
      data: { f, a, b },
      statement: `The affine plane curve \\[C:\\; ${ptex(f)} = 0\\] over \\(\\mathbb{C}\\) has exactly one singular point \\((x_0, y_0)\\). Find it, its multiplicity \\(m\\), and the number of distinct tangent lines there.`,
      answers: [
        { label: "x_0", value: F(a) },
        { label: "y_0", value: F(b) },
        { label: "m", value: F(fam.m) },
        { label: "\\#\\,\\text{tangents}", value: F(fam.lines) },
      ],
      hint: "Solve \\(f = f_x = f_y = 0\\). Then move the point to the origin: the multiplicity is the lowest degree appearing, and the tangent lines are the distinct linear factors of that lowest-degree part (the tangent cone).",
      solution: [
        `\\(f_x = ${ptex(dx(f))}\\), \\(\\; f_y = ${ptex(dy(f))}\\).`,
        `\\(f\\), \\(f_x\\), \\(f_y\\) all vanish at \\((${a}, ${b})\\), and nowhere else.`,
        `Substitute \\(x = ${shift("X", a)},\\ y = ${shift("Y", b)}\\): \\[f = ${ptex(local, "X", "Y", true)}.\\]`,
        `The lowest-degree part is \\(${ptex(cone, "X", "Y")}\\), of degree \\(${fam.m}\\), so \\(m = ${fam.m}\\).`,
        `Tangent lines: ${fam.why}. That gives ${fam.lines} distinct tangent line${fam.lines > 1 ? "s" : ""}; the point is ${fam.name}.`,
      ],
    };
  }

  function intersectionMultiplicity(rng) {
    const a1 = rng.int(-2, 2);
    const a2 = rng.nonzero(-2, 2);
    const a3 = rng.int(-1, 1);
    const pu = [0, a1, a2, a3]; // p(x), lowest degree first
    const pPoly = padd(mono(a1, 1, 0), mono(a2, 2, 0), mono(a3, 3, 0));
    const Fp = padd(Y, pscale(pPoly, -1));
    const s = rng.pick([-2, -1, 1, 2]);
    const A = rng.pick([mono(s), mono(s, 1, 0), mono(s, 0, 1)]);
    const m = rng.int(1, 5);
    const e = rng.nonzero(-3, 3);
    const w = rng.pick([padd(mono(e), mono(rng.int(-2, 2), 1, 0)), padd(mono(e), mono(rng.int(-2, 2), 0, 1))]);
    const G = padd(pmul(A, Fp), pmul(mono(1, m, 0), w));
    // G(t, p(t)) computed directly from the expanded G
    let sub = [0];
    for (const { i, j, c } of terms(G)) sub = uadd(sub, umul([c], umul(upow([0, 1], i), upow(pu, j))));
    while (sub.length > 1 && sub[sub.length - 1] === 0) sub.pop();
    const order = sub.findIndex((c) => c !== 0);
    const pTex = utexAsc(pu, "t");
    return {
      data: { F: Fp, G, m },
      statement: `Compute the intersection multiplicity at the origin, \\(I_0(F, G)\\), of the plane curves \\[\\begin{aligned} F &= ${ptex(Fp)}, \\\\ G &= ${ptex(G)}. \\end{aligned}\\]`,
      answers: [{ label: "I_0(F,G)", value: F(order) }],
      hint: "\\(F = 0\\) is the smooth graph \\(y = p(x)\\), parametrised by \\(t \\mapsto (t, p(t))\\). For a smooth curve, \\(I_0(F, G)\\) is the order of vanishing of \\(G\\) along that parametrisation.",
      solution: [
        `\\(F = 0\\) is smooth at the origin and parametrised by \\(x = t,\\ y = p(t) = ${pTex}\\).`,
        `Substituting into \\(G\\): \\[G(t, p(t)) = ${utexAsc(sub)}.\\]`,
        `The lowest power of \\(t\\) is \\(t^{${order}}\\), so \\(I_0(F, G) = \\operatorname{ord}_t G(t, p(t)) = ${order}\\).`,
      ],
    };
  }

  function monomialQuotient(rng) {
    const a = rng.int(2, 6);
    const b = rng.int(2, 6);
    const mixed = [];
    const nMixed = rng.int(0, 2);
    for (let n = 0; n < nMixed; n++) {
      const g = [rng.int(1, a - 1), rng.int(1, b - 1)];
      if (!mixed.some(([c, d]) => c === g[0] && d === g[1])) mixed.push(g);
    }
    mixed.sort((u, v) => v[0] - u[0]);
    const rows = [];
    for (let j = 0; j < b; j++) {
      let r = a;
      for (const [c, d] of mixed) if (d <= j) r = Math.min(r, c);
      rows.push(r);
    }
    const dim = rows.reduce((s, r) => s + r, 0);
    const gens = [`x^{${a}}`, ...mixed.map(([c, d]) => pow1("x", c) + pow1("y", d)), `y^{${b}}`];
    return {
      data: { a, b, mixed },
      statement: `Let \\(I = (${gens.join(",\\ ")}) \\subset k[x, y]\\). Find \\(\\dim_k k[x,y]/I\\).`,
      answers: [{ label: "\\dim_k k[x,y]/I", value: F(dim) }],
      hint: "For a monomial ideal, the monomials not in \\(I\\) form a basis of the quotient. Count them row by row: for each power \\(y^j\\), how many \\(x^i y^j\\) avoid every generator?",
      solution: [
        "A basis of \\(k[x,y]/I\\) is given by the monomials \\(x^i y^j\\) divisible by no generator (the “staircase”).",
        ...rows.map((r, j) => `\\(y^{${j}}\\): \\(x^i y^{${j}} \\notin I\\) exactly for \\(0 \\le i < ${r}\\), giving ${r}.`),
        `Total: \\(${rows.join(" + ")} = ${dim}\\).`,
      ],
    };
  }

  function pointsAtInfinity(rng) {
    const d = rng.int(2, 4);
    const pool = ["X", -2, -1, 0, 1, 2];
    const factors = Array.from({ length: d }, () => rng.pick(pool));
    let top = mono(1);
    for (const r of factors) top = pmul(top, r === "X" ? X : padd(Y, pscale(X, -r)));
    let lower = {};
    const nLower = rng.int(2, 4);
    for (let n = 0; n < nLower; n++) {
      const deg = rng.int(0, d - 1);
      const i = rng.int(0, deg);
      lower = padd(lower, mono(rng.nonzero(-3, 3), i, deg - i));
    }
    const f = padd(top, lower);
    const distinct = [...new Set(factors)];
    const counts = distinct.map((r) => factors.filter((x) => x === r).length);
    const factTex = distinct.map((r, k) => {
      const t = lineTex(r);
      return counts[k] > 1 ? `${r === "X" ? "x" : t}^{${counts[k]}}` : t;
    });
    const ptTex = (r) => (r === "X" ? "[0 : 1 : 0]" : `[1 : ${r} : 0]`);
    return {
      data: { f, d },
      statement: `Let \\(C \\subset \\mathbb{P}^2\\) be the projective closure of the affine curve \\[${ptex(f)} = 0.\\] How many distinct points does \\(C\\) have on the line at infinity \\(z = 0\\) (over \\(\\mathbb{C}\\))?`,
      answers: [{ label: "\\#\\,(C \\cap \\{z = 0\\})", value: F(distinct.length) }],
      hint: "Homogenise with \\(z\\) and set \\(z = 0\\): only the top-degree part survives. Count its distinct linear factors.",
      solution: [
        `Homogenising, every term of degree below \\(${d}\\) picks up a factor of \\(z\\), so on \\(z = 0\\) we are left with the degree-\\(${d}\\) part \\(${ptex(top)}\\).`,
        `It factors as \\(${factTex.join("")}\\).`,
        `Distinct points at infinity: \\(${distinct.map(ptTex).join(",\\ ")}\\), so there ${distinct.length === 1 ? "is 1" : `are ${distinct.length}`}.`,
      ],
    };
  }

  function bezout(rng) {
    let d, e;
    do {
      d = rng.int(2, 5);
      e = rng.int(1, 4);
    } while (d * e < 3);
    const m = rng.int(2, Math.min(d * e - 1, 5));
    const name = (k) => ({ 1: "a line", 2: "a conic", 3: "a cubic", 4: "a quartic", 5: "a quintic" })[k];
    return {
      data: { d, e, m },
      statement: `In \\(\\mathbb{P}^2(\\mathbb{C})\\), ${name(d)} \\(C\\) and ${name(e)} \\(D\\) have no common component. They meet at a point \\(P\\) with \\(I_P(C, D) = ${m}\\), and every other intersection is transverse. How many intersection points other than \\(P\\) are there?`,
      answers: [{ label: "\\#\\,\\text{others}", value: F(d * e - m) }],
      hint: "Bézout: \\(\\sum_{Q} I_Q(C, D) = \\deg C \\cdot \\deg D\\). A transverse intersection has multiplicity 1.",
      solution: [
        `By Bézout the multiplicities add up to \\(${d}\\cdot${e} = ${d * e}\\).`,
        `\\(P\\) accounts for \\(${m}\\); each other point contributes 1, so there are \\(${d * e} - ${m} = ${d * e - m}\\) of them.`,
      ],
    };
  }

  function genusPlaneCurve(rng) {
    const d = rng.int(3, 8);
    const pa = ((d - 1) * (d - 2)) / 2;
    const smooth = rng.next() < 0.3;
    let k = 0;
    let j = 0;
    if (!smooth) {
      k = rng.int(0, Math.min(4, pa));
      j = rng.int(0, Math.min(2, pa - k));
      if (k + j === 0) k = 1;
    }
    const g = pa - k - j;
    const sing = smooth
      ? "smooth"
      : `irreducible, and its only singularities are ${k ? `${k} ordinary node${k > 1 ? "s" : ""}` : ""}${k && j ? " and " : ""}${j ? `${j} ordinary cusp${j > 1 ? "s" : ""}` : ""}`;
    return {
      data: { d, k, j },
      statement: `A plane curve \\(C \\subset \\mathbb{P}^2\\) of degree \\(${d}\\) is ${sing}. What is the (geometric) genus of ${smooth ? "\\(C\\)" : "its normalisation \\(\\tilde C\\)"}?`,
      answers: [{ label: "g", value: F(g) }],
      hint: "A plane curve of degree \\(d\\) has arithmetic genus \\(\\frac{(d-1)(d-2)}{2}\\). Each node or ordinary cusp has \\(\\delta = 1\\) and lowers the geometric genus by 1.",
      solution: [
        `Arithmetic genus: \\(p_a = \\dfrac{(${d}-1)(${d}-2)}{2} = ${pa}\\).`,
        smooth
          ? `\\(C\\) is smooth, so its genus is \\(p_a = ${g}\\).`
          : `\\(g = p_a - \\sum_P \\delta_P = ${pa} - ${k} - ${j} = ${g}\\).`,
      ],
    };
  }

  function riemannHurwitz(rng) {
    const kind = rng.pick(["hyper", "fermat", "elliptic", "simple"]);
    let statement, g, steps, data;
    if (kind === "hyper") {
      const n = rng.int(3, 10);
      const R = n + (n % 2);
      g = (R - 2) / 2;
      data = { kind, n };
      statement = `Let \\(C\\) be the smooth projective model of \\(y^2 = f(x)\\), where \\(f\\) has degree \\(${n}\\) and distinct roots. Use the map \\((x, y) \\mapsto x\\) to \\(\\mathbb{P}^1\\) to find the genus of \\(C\\).`;
      steps = [
        "The map \\(x: C \\to \\mathbb{P}^1\\) has degree 2, and ramifies (with \\(e = 2\\)) exactly over the branch points.",
        `It branches over the ${n} roots of \\(f\\)${n % 2 ? ", and also over \\(\\infty\\) because the degree is odd" : "; since the degree is even, \\(\\infty\\) is not a branch point"}: ${R} ramification points in all.`,
        `Riemann–Hurwitz: \\(2g - 2 = 2(2\\cdot 0 - 2) + ${R}\\cdot(2-1) = ${R - 4}\\), so \\(g = ${g}\\).`,
      ];
    } else if (kind === "fermat") {
      const n = rng.int(2, 6);
      g = ((n - 1) * (n - 2)) / 2;
      data = { kind, n };
      statement = `Let \\(C = V(x^{${n}} + y^{${n}} - z^{${n}}) \\subset \\mathbb{P}^2\\) (the Fermat curve). Use the projection \\([x : y : z] \\mapsto [x : z]\\) and Riemann–Hurwitz to find the genus of \\(C\\).`;
      steps = [
        `The projection has degree \\(${n}\\): over \\([x : z]\\) we solve \\(y^{${n}} = z^{${n}} - x^{${n}}\\).`,
        `It is totally ramified (\\(e = ${n}\\)) where \\(z^{${n}} = x^{${n}}\\), i.e. over ${n} points, and unramified elsewhere.`,
        `\\(2g - 2 = ${n}(-2) + ${n}(${n} - 1) = ${n * (n - 3)}\\), so \\(g = ${g}\\) (matching \\(\\frac{(d-1)(d-2)}{2}\\) for a smooth plane curve).`,
      ];
    } else if (kind === "elliptic") {
      const n = rng.int(2, 5);
      const r = 2 * rng.int(1, 5);
      g = r / 2 + 1;
      data = { kind, n, r };
      statement = `A degree-\\(${n}\\) map \\(f: C \\to E\\) from a smooth projective curve to an elliptic curve has exactly \\(${r}\\) ramification points, each with ramification index 2. What is the genus of \\(C\\)?`;
      steps = [
        `Riemann–Hurwitz: \\(2g(C) - 2 = ${n}\\,(2g(E) - 2) + \\sum_P (e_P - 1)\\).`,
        `\\(g(E) = 1\\) kills the first term, so \\(2g - 2 = ${r}\\) and \\(g = ${g}\\).`,
      ];
    } else {
      const n = rng.int(2, 5);
      const r = 2 * n - 2 + 2 * rng.int(0, 4);
      g = (r - 2 * n + 2) / 2;
      data = { kind, n, r };
      statement = `A degree-\\(${n}\\) map \\(f: C \\to \\mathbb{P}^1\\) from a smooth projective curve has exactly \\(${r}\\) ramification points, each simple (\\(e = 2\\)). What is the genus of \\(C\\)?`;
      steps = [
        `Riemann–Hurwitz: \\(2g - 2 = ${n}\\,(2\\cdot 0 - 2) + ${r}\\cdot(2 - 1) = ${r - 2 * n}\\).`,
        `So \\(g = ${g}\\).`,
      ];
    }
    return {
      data,
      statement,
      answers: [{ label: "g(C)", value: F(g) }],
      hint: "Riemann–Hurwitz: for \\(f: C \\to D\\) of degree \\(n\\), \\(2g(C) - 2 = n\\,(2g(D) - 2) + \\sum_{P \\in C} (e_P - 1)\\).",
      solution: steps,
    };
  }

  function riemannRoch(rng) {
    const kind = rng.pick(["large", "canonical", "plane"]);
    if (kind === "large") {
      const g = rng.int(0, 5);
      const n = rng.int(Math.max(0, 2 * g - 1), 2 * g + 6);
      const l = n - g + 1;
      return {
        data: { kind, g, n },
        statement: `\\(C\\) is a smooth projective curve of genus \\(${g}\\) and \\(D\\) is a divisor on \\(C\\) of degree \\(${n}\\). Find \\(\\ell(D) = \\dim H^0(C, \\mathcal{O}_C(D))\\).`,
        answers: [{ label: "\\ell(D)", value: F(l) }],
        hint: "Riemann–Roch: \\(\\ell(D) - \\ell(K - D) = \\deg D - g + 1\\). When is \\(\\ell(K - D)\\) forced to be 0?",
        solution: [
          `\\(\\deg(K - D) = (2g - 2) - ${n} = ${2 * g - 2 - n} < 0\\), so \\(\\ell(K - D) = 0\\).`,
          `Riemann–Roch gives \\(\\ell(D) = ${n} - ${g} + 1 = ${l}\\).`,
        ],
      };
    }
    if (kind === "canonical") {
      const g = rng.int(1, 8);
      return {
        data: { kind, g },
        statement: `\\(C\\) is a smooth projective curve of genus \\(${g}\\) with canonical divisor \\(K\\). Find \\(\\deg K\\) and \\(\\ell(K)\\).`,
        answers: [
          { label: "\\deg K", value: F(2 * g - 2) },
          { label: "\\ell(K)", value: F(g) },
        ],
        hint: "Apply Riemann–Roch to \\(D = 0\\) and to \\(D = K\\), using \\(\\ell(0) = 1\\).",
        solution: [
          `\\(D = 0\\): \\(\\ell(0) - \\ell(K) = 0 - g + 1\\), and \\(\\ell(0) = 1\\), so \\(\\ell(K) = g = ${g}\\).`,
          `\\(D = K\\): \\(\\ell(K) - \\ell(0) = \\deg K - g + 1\\), so \\(${g} - 1 = \\deg K - ${g} + 1\\), giving \\(\\deg K = ${2 * g - 2}\\).`,
        ],
      };
    }
    const d = rng.int(2, 6);
    const k = rng.int(1, 4);
    const g = ((d - 1) * (d - 2)) / 2;
    const l = binom(k + 2, 2) - binom(k - d + 2, 2);
    const viaRR = k * d > 2 * g - 2;
    return {
      data: { kind, d, k },
      statement: `\\(C \\subset \\mathbb{P}^2\\) is a smooth plane curve of degree \\(${d}\\) and \\(H\\) is a line section. Find \\(\\ell(${k === 1 ? "" : k}H) = h^0(C, \\mathcal{O}_C(${k}))\\).`,
      answers: [{ label: `\\ell(${k === 1 ? "" : k}H)`, value: F(l) }],
      hint: "Use \\(0 \\to \\mathcal{O}_{\\mathbb{P}^2}(k - d) \\to \\mathcal{O}_{\\mathbb{P}^2}(k) \\to \\mathcal{O}_C(k) \\to 0\\) and \\(H^1(\\mathbb{P}^2, \\mathcal{O}(m)) = 0\\).",
      solution: [
        `Since \\(H^1(\\mathbb{P}^2, \\mathcal{O}(${k - d})) = 0\\), \\(h^0(\\mathcal{O}_C(${k})) = h^0(\\mathcal{O}_{\\mathbb{P}^2}(${k})) - h^0(\\mathcal{O}_{\\mathbb{P}^2}(${k - d}))\\).`,
        `\\(= \\dbinom{${k + 2}}{2} - ${k - d + 2 >= 2 ? `\\dbinom{${k - d + 2}}{2}` : "0"} = ${binom(k + 2, 2)} - ${binom(k - d + 2, 2)} = ${l}\\).`,
        viaRR
          ? `Check with Riemann–Roch: \\(g = ${g}\\), \\(\\deg(${k}H) = ${k * d} > 2g - 2 = ${2 * g - 2}\\), so \\(\\ell = ${k * d} - ${g} + 1 = ${l}\\).`
          : `(Here \\(\\deg(${k}H) = ${k * d} \\le 2g - 2 = ${2 * g - 2}\\), so Riemann–Roch alone isn't enough: \\(\\ell(K - ${k}H) \\neq 0\\).)`,
      ],
    };
  }

  function hilbertFunction(rng) {
    if (rng.next() < 0.7) {
      const n = rng.int(1, 3);
      const d = rng.int(1, 4);
      const t = rng.int(Math.max(0, d - 1), d + 4);
      const h = binom(t + n, n) - binom(t - d + n, n);
      const vars = Array.from({ length: n + 1 }, (_, i) => `x_${i}`).join(", ");
      return {
        data: { kind: "hyper", n, d, t },
        statement: `Let \\(S = k[${vars}]\\) and let \\(F \\in S\\) be a nonzero form of degree \\(${d}\\). Find the Hilbert function value \\(h_{S/(F)}(${t}) = \\dim_k (S/(F))_{${t}}\\).`,
        answers: [{ label: `h(${t})`, value: F(h) }],
        hint: "\\(\\dim S_t = \\binom{t+n}{n}\\), and multiplication by \\(F\\) maps \\(S_{t-d}\\) isomorphically onto \\((F)_t\\).",
        solution: [
          `\\(0 \\to S(-${d}) \\xrightarrow{\\cdot F} S \\to S/(F) \\to 0\\) is exact, so \\(h(${t}) = \\dim S_{${t}} - \\dim S_{${t - d}}\\).`,
          `\\(= \\dbinom{${t + n}}{${n}} - ${t - d >= 0 ? `\\dbinom{${t - d + n}}{${n}}` : "0"} = ${binom(t + n, n)} - ${binom(t - d + n, n)} = ${h}\\).`,
        ],
      };
    }
    const d = rng.int(1, 4);
    const e = rng.int(1, 4);
    const t = d + e + rng.int(0, 3);
    const parts = [binom(t + 2, 2), binom(t - d + 2, 2), binom(t - e + 2, 2), binom(t - d - e + 2, 2)];
    return {
      data: { kind: "ci", d, e, t },
      statement: `Let \\(F, G \\in k[x, y, z]\\) be forms of degrees \\(${d}\\) and \\(${e}\\) with no common factor. Find \\(\\dim_k \\big(k[x,y,z]/(F, G)\\big)_{${t}}\\).`,
      answers: [{ label: `h(${t})`, value: F(d * e) }],
      hint: "\\(F, G\\) is a regular sequence, so the Koszul complex \\(0 \\to S(-d-e) \\to S(-d) \\oplus S(-e) \\to S \\to S/(F,G) \\to 0\\) is exact.",
      solution: [
        "From the Koszul resolution, \\(h(t) = \\binom{t+2}{2} - \\binom{t-d+2}{2} - \\binom{t-e+2}{2} + \\binom{t-d-e+2}{2}\\).",
        `\\(h(${t}) = ${parts[0]} - ${parts[1]} - ${parts[2]} + ${parts[3]} = ${d * e}\\).`,
        `This equals \\(${d}\\cdot${e}\\): for \\(t \\ge d + e - 2\\) the Hilbert function of the \\(${d * e}\\) points of \\(V(F, G)\\) (with multiplicity) is constant, which is Bézout's theorem in disguise.`,
      ],
    };
  }

  function embeddings(rng) {
    if (rng.next() < 0.5) {
      const n = rng.int(1, 3);
      const d = rng.int(2, n === 3 ? 3 : 4);
      const N = binom(n + d, d) - 1;
      const deg = d ** n;
      return {
        data: { kind: "veronese", n, d },
        statement: `The degree-\\(${d}\\) Veronese embedding \\(\\nu_{${d}}: \\mathbb{P}^{${n}} \\hookrightarrow \\mathbb{P}^N\\) uses all monomials of degree \\(${d}\\). Find \\(N\\) and the degree of the image.`,
        answers: [
          { label: "N", value: F(N) },
          { label: "\\deg \\nu_{" + d + "}(\\mathbb{P}^{" + n + "})", value: F(deg) },
        ],
        hint: "Count monomials of degree \\(d\\) in \\(n+1\\) variables. For the degree, intersect with \\(n\\) general hyperplanes: each pulls back to a hypersurface of degree \\(d\\) in \\(\\mathbb{P}^n\\).",
        solution: [
          `There are \\(\\binom{${n} + ${d}}{${d}} = ${N + 1}\\) monomials of degree \\(${d}\\) in \\(${n + 1}\\) variables, so \\(N = ${N}\\).`,
          `\\(n = ${n}\\) general hyperplanes pull back to ${n} hypersurfaces of degree \\(${d}\\), which meet in \\(${d}^{${n}} = ${deg}\\) points (Bézout), so the degree is \\(${deg}\\).`,
        ],
      };
    }
    const m = rng.int(1, 3);
    const n = rng.int(1, 3);
    const N = (m + 1) * (n + 1) - 1;
    const deg = binom(m + n, m);
    return {
      data: { kind: "segre", m, n },
      statement: `The Segre embedding \\(\\sigma: \\mathbb{P}^{${m}} \\times \\mathbb{P}^{${n}} \\hookrightarrow \\mathbb{P}^N\\) sends \\(([x], [y])\\) to \\([x_i y_j]\\). Find \\(N\\) and the degree of the image.`,
      answers: [
        { label: "N", value: F(N) },
        { label: "\\deg \\sigma", value: F(deg) },
      ],
      hint: "Count the products \\(x_i y_j\\). For the degree, the hyperplane class is \\(h_1 + h_2\\); compute \\((h_1 + h_2)^{m+n}\\) using \\(h_1^{m+1} = h_2^{n+1} = 0\\) and \\(h_1^m h_2^n = 1\\).",
      solution: [
        `There are \\(${m + 1}\\cdot${n + 1} = ${N + 1}\\) coordinates \\(x_i y_j\\), so \\(N = ${N}\\).`,
        `\\(\\deg = (h_1 + h_2)^{${m + n}} = \\dbinom{${m + n}}{${m}} h_1^{${m}} h_2^{${n}} = ${deg}\\).`,
      ],
    };
  }

  const TOPIC = { id: "ag", name: "Algebraic Geometry" };
  const TYPES = [
    { id: "ag-sing", topic: "ag", name: "Singular points", gen: singularPoint },
    { id: "ag-intmult", topic: "ag", name: "Intersection multiplicity", gen: intersectionMultiplicity },
    { id: "ag-quotient", topic: "ag", name: "Monomial quotients", gen: monomialQuotient },
    { id: "ag-infinity", topic: "ag", name: "Points at infinity", gen: pointsAtInfinity },
    { id: "ag-bezout", topic: "ag", name: "Bézout's theorem", gen: bezout },
    { id: "ag-genus", topic: "ag", name: "Genus of plane curves", gen: genusPlaneCurve },
    { id: "ag-hurwitz", topic: "ag", name: "Riemann–Hurwitz", gen: riemannHurwitz },
    { id: "ag-rr", topic: "ag", name: "Riemann–Roch", gen: riemannRoch },
    { id: "ag-hilbert", topic: "ag", name: "Hilbert functions", gen: hilbertFunction },
    { id: "ag-embed", topic: "ag", name: "Veronese & Segre", gen: embeddings },
  ];

  return { TOPIC, TYPES, poly: { terms, padd, pmul, compose, mono, X, Y, degree, lowDegree, homog, dx, dy } };
});
