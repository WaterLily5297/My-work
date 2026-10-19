/*
 * Number theory and arithmetic geometry problem generators (p-adic valuations,
 * Legendre symbols, Hensel lifting, elliptic curves over finite fields,
 * splitting of primes in quadratic fields, Newton polygons).
 * Same contract as problems.js; registered there under the "nt" topic.
 */
(function (root, factory) {
  const core = typeof module === "object" && module.exports ? require("./core.js") : root.MathDrillCore;
  const lib = factory(core);
  if (typeof module === "object" && module.exports) module.exports = lib;
  else root.MathDrillNT = lib;
})(typeof self !== "undefined" ? self : this, function (core) {
  "use strict";
  const { F, sumTex, polyTex } = core;

  // ---------- Modular arithmetic ----------
  const mod = (a, m) => ((a % m) + m) % m;
  function powMod(b, e, m) {
    let r = 1;
    b = mod(b, m);
    for (; e > 0; e >>= 1, b = (b * b) % m) if (e & 1) r = (r * b) % m;
    return r;
  }
  function invMod(a, m) {
    let [r0, r1, s0, s1] = [mod(a, m), m, 1, 0];
    while (r1) {
      const q = Math.floor(r0 / r1);
      [r0, r1, s0, s1] = [r1, r0 - q * r1, s1, s0 - q * s1];
    }
    if (r0 !== 1) throw new Error(`${a} is not invertible mod ${m}`);
    return mod(s0, m);
  }
  /** Euler's criterion: 1, -1, or 0 when p divides a. */
  const legendre = (a, p) => (mod(a, p) === 0 ? 0 : powMod(a, (p - 1) / 2, p) === 1 ? 1 : -1);
  const squaresMod = (p) => [...new Set(Array.from({ length: p - 1 }, (_, x) => ((x + 1) * (x + 1)) % p))].sort((a, b) => a - b);
  const valuation = (n, p) => {
    let v = 0;
    for (n = Math.abs(n); n % p === 0; n /= p) v++;
    return v;
  };
  const sym = (a, n) => `\\left(\\frac{${a}}{${n}}\\right)`;
  const setTex = (xs) => (xs.length ? `\\{${xs.join(", ")}\\}` : "\\varnothing");
  const ODD_PRIMES = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

  // ---------- p-adic valuations ----------
  /** Legendre's formula, with the sum written out. */
  function legendreSum(n, p) {
    const parts = [];
    for (let q = p; q <= n; q *= p) parts.push(Math.floor(n / q));
    return { parts, total: parts.reduce((a, b) => a + b, 0) };
  }
  function padicValuation(rng) {
    const p = rng.pick([2, 3, 5, 7]);
    const showSum = (m, s) => `\\(v_{${p}}(${m}!) = ${s.parts.length ? s.parts.join(" + ") : "0"}${s.parts.length > 1 ? ` = ${s.total}` : ""}\\)`;
    if (rng.next() < 0.6) {
      const n = rng.int(12, 150);
      const k = rng.int(2, n - 2);
      const [a, b, c] = [legendreSum(n, p), legendreSum(k, p), legendreSum(n - k, p)];
      const v = a.total - b.total - c.total;
      return {
        data: { kind: "binomial", p, n, k },
        statement: `Compute the \\(${p}\\)-adic valuation \\(v_{${p}}\\!\\left(\\dbinom{${n}}{${k}}\\right)\\).`,
        answers: [{ label: `v_{${p}}`, value: F(v) }],
        hint: `Legendre's formula: \\(v_p(m!) = \\sum_{i \\ge 1} \\lfloor m / p^i \\rfloor\\). Then use \\(\\binom{n}{k} = \\frac{n!}{k!\\,(n-k)!}\\).`,
        solution: [
          showSum(n, a) + ".",
          showSum(k, b) + ".",
          showSum(n - k, c) + ".",
          `\\(v_{${p}}\\binom{${n}}{${k}} = ${a.total} - ${b.total} - ${c.total} = ${v}\\). (Kummer: this is the number of carries when adding \\(${k}\\) and \\(${n - k}\\) in base \\(${p}\\).)`,
        ],
      };
    }
    // |n!|_p = p^(-v): keep p^v a safe integer.
    let n;
    do n = rng.int(5, 40);
    while (legendreSum(n, p).total * Math.log2(p) > 50);
    const s = legendreSum(n, p);
    return {
      data: { kind: "absolute", p, n },
      statement: `Compute the \\(${p}\\)-adic absolute value \\(|${n}!|_{${p}}\\), where \\(|x|_p = p^{-v_p(x)}\\).`,
      answers: [{ label: `|${n}!|_{${p}}`, value: F(1, p ** s.total) }],
      hint: "Find \\(v_p(n!)\\) with Legendre's formula \\(v_p(n!) = \\sum_{i \\ge 1} \\lfloor n / p^i \\rfloor\\).",
      solution: [showSum(n, s) + ".", `So \\(|${n}!|_{${p}} = ${p}^{-${s.total}} = \\dfrac{1}{${p ** s.total}}\\).`],
    };
  }

  // ---------- Legendre symbols by quadratic reciprocity ----------
  function legendreSymbol(rng) {
    const p = rng.pick(ODD_PRIMES.filter((q) => q >= 11));
    let a;
    do a = rng.int(2, 3 * p);
    while (a % p === 0);
    const steps = [];
    let sign = 1;
    let [m, n] = [a % p, p];
    const value = () => `${sign < 0 ? "-" : ""}${sym(m, n)}`;
    if (a !== m) steps.push(`\\(${a} \\equiv ${m} \\pmod{${p}}\\), so \\(${sym(a, p)} = ${sym(m, p)}\\).`);
    // Jacobi symbols: reciprocity holds for odd positive coprime arguments.
    while (m !== 1) {
      if (m % 2 === 0) {
        let twos = 0;
        while (m % 2 === 0) [m, twos] = [m / 2, twos + 1];
        const r = n % 8;
        const two = r === 1 || r === 7 ? 1 : -1;
        if (twos % 2 === 1 && two < 0) sign = -sign;
        steps.push(
          `Take out \\(2^{${twos}}\\): \\(${sym(2, n)} = ${two}\\) because \\(${n} \\equiv ${r} \\pmod 8\\)${twos % 2 === 0 ? ", and it appears an even number of times" : ""}. The symbol is \\(${value()}\\).`
        );
        continue;
      }
      const flip = m % 4 === 3 && n % 4 === 3;
      if (flip) sign = -sign;
      const [top, bottom] = [m, n];
      [m, n] = [bottom % top, top];
      steps.push(
        `Reciprocity: \\(${sym(top, bottom)} = ${flip ? "-" : ""}${sym(bottom, top)}\\)${flip ? " since both are \\(\\equiv 3 \\pmod 4\\)" : " since one of them is \\(\\equiv 1 \\pmod 4\\)"}; reducing \\(${bottom} \\bmod ${top}\\) gives \\(${value()}\\).`
      );
    }
    steps.push(`\\(${sym(1, n)} = 1\\), so \\(${sym(a, p)} = ${sign}\\).`);
    steps.push(`Check with Euler's criterion: \\(${a}^{(${p}-1)/2} \\equiv ${sign > 0 ? 1 : -1} \\pmod{${p}}\\).`);
    return {
      data: { p, a },
      statement: `Compute the Legendre symbol \\(${sym(a, p)}\\). (\\(${p}\\) is prime.)`,
      answers: [{ label: sym(a, p), value: F(sign) }],
      hint: "Reduce the top modulo \\(p\\), take out factors of 2 with \\(\\left(\\frac{2}{n}\\right) = (-1)^{(n^2-1)/8}\\), then flip with quadratic reciprocity (for Jacobi symbols with odd positive coprime arguments).",
      solution: steps,
    };
  }

  // ---------- Hensel's lemma ----------
  function henselLift(rng) {
    const cube = rng.next() < 0.4;
    const p = rng.pick(cube ? [5, 7, 11, 13] : [3, 5, 7, 11, 13]);
    const k = p <= 7 ? rng.int(2, 3) : 2;
    const pk = p ** k;
    const e = cube ? 3 : 2;
    const x0 = rng.int(1, p - 1);
    // a ≡ x0^e (mod p) and p ∤ a, so f(x) = x^e − a has the simple root x0 mod p.
    const a = mod(x0 ** e + p * rng.int(1, p ** (k - 1) - 1), pk);
    const f = (x) => x ** e - a;
    const dfx0 = mod(e * x0 ** (e - 1), p);
    const inv = invMod(dfx0, p);
    const steps = [
      `\\(f(x) = x^{${e}} - ${a}\\) and \\(f'(${x0}) = ${e}\\cdot ${x0}^{${e - 1}} \\equiv ${dfx0} \\pmod{${p}}\\) is a unit, so the root lifts uniquely. Its inverse mod \\(${p}\\) is \\(${inv}\\).`,
    ];
    let x = x0;
    for (let j = 1; j < k; j++) {
      const q = f(x) / p ** j;
      const t = mod(-q * inv, p);
      const next = x + t * p ** j;
      steps.push(
        `Mod \\(${p}^{${j + 1}}\\): \\(f(${x}) = ${f(x)} = ${p ** j}\\cdot(${q})\\), so \\(t \\equiv -(${q})\\cdot ${inv} \\equiv ${t} \\pmod{${p}}\\) and \\(x = ${x} + ${t}\\cdot ${p ** j} = ${next}\\).`
      );
      x = next;
    }
    x = mod(x, pk);
    steps.push(`Check: \\(${x}^{${e}} - ${a} = ${f(x)}\\) is divisible by \\(${pk}\\).`);
    return {
      data: { p, k, e, a, x0 },
      statement: `Find the unique integer \\(x\\) with \\(0 \\le x < ${pk}\\), \\(x \\equiv ${x0} \\pmod{${p}}\\) and \\(x^{${e}} \\equiv ${a} \\pmod{${pk}}\\).`,
      answers: [{ label: "x", value: F(x) }],
      hint: `Hensel's lemma: lift one power of \\(${p}\\) at a time. If \\(f(x_j) \\equiv 0 \\pmod{p^j}\\), put \\(x_{j+1} = x_j + t p^j\\) with \\(t \\equiv -\\frac{f(x_j)}{p^j} f'(x_j)^{-1} \\pmod p\\).`,
      solution: steps,
    };
  }

  // ---------- Elliptic curves over F_p ----------
  function curve(rng, primes) {
    const p = rng.pick(primes);
    let a, b;
    do [a, b] = [rng.int(0, p - 1), rng.int(0, p - 1)];
    while (mod(4 * a ** 3 + 27 * b ** 2, p) === 0);
    const tex = `y^2 = ${polyTex([1, 0, a, b])}`;
    return { p, a, b, tex };
  }
  /** Points of y^2 = x^3 + ax + b over F_p, sorted by the type of each x. */
  function countByX(p, a, b) {
    const sq = [], zero = [], non = [];
    for (let x = 0; x < p; x++) {
      const v = mod(x ** 3 + a * x + b, p);
      (v === 0 ? zero : legendre(v, p) > 0 ? sq : non).push(x);
    }
    return { sq, zero, non, N: 1 + 2 * sq.length + zero.length };
  }
  function ellipticPoints(rng) {
    const { p, a, b, tex } = curve(rng, [5, 7, 11, 13, 17, 19, 23]);
    const { sq, zero, non, N } = countByX(p, a, b);
    const ap = p + 1 - N;
    return {
      data: { p, a, b },
      statement: `Let \\(E: ${tex}\\) over \\(\\mathbb{F}_{${p}}\\). Count its points \\(\\#E(\\mathbb{F}_{${p}})\\), including the point at infinity, and find \\(a_{${p}} = ${p} + 1 - \\#E(\\mathbb{F}_{${p}})\\).`,
      answers: [
        { label: `\\#E(\\mathbb{F}_{${p}})`, value: F(N) },
        { label: `a_{${p}}`, value: F(ap) },
      ],
      hint: "For each \\(x\\), the equation \\(y^2 = f(x)\\) has \\(1 + \\left(\\frac{f(x)}{p}\\right)\\) solutions. Do not forget the point at infinity.",
      solution: [
        `The nonzero squares mod \\(${p}\\) are \\(${setTex(squaresMod(p))}\\).`,
        `\\(f(x)\\) is a nonzero square for \\(x \\in ${setTex(sq)}\\) (2 points each), zero for \\(x \\in ${setTex(zero)}\\) (1 point each), and a non-square for \\(x \\in ${setTex(non)}\\).`,
        `\\(\\#E = 1 + 2\\cdot ${sq.length} + ${zero.length} = ${N}\\), so \\(a_{${p}} = ${p} + 1 - ${N} = ${ap}\\).`,
        `Hasse's bound \\(|a_p| \\le 2\\sqrt{p}\\) holds: \\(${Math.abs(ap)} \\le ${(2 * Math.sqrt(p)).toFixed(2)}\\).`,
      ],
    };
  }
  function ellipticExtension(rng) {
    const { p, a, b, tex } = curve(rng, [5, 7, 11, 13]);
    const { N } = countByX(p, a, b);
    const ap = p + 1 - N;
    const N2 = p * p + 1 - (ap * ap - 2 * p);
    return {
      data: { p, a, b },
      statement: `The curve \\(E: ${tex}\\) has \\(${N}\\) points over \\(\\mathbb{F}_{${p}}\\). How many points does it have over \\(\\mathbb{F}_{${p * p}}\\)?`,
      answers: [{ label: `\\#E(\\mathbb{F}_{${p * p}})`, value: F(N2) }],
      hint: "Write \\(1 - a_pT + pT^2 = (1 - \\alpha T)(1 - \\beta T)\\). Then \\(\\#E(\\mathbb{F}_{p^r}) = p^r + 1 - (\\alpha^r + \\beta^r)\\).",
      solution: [
        `\\(a_{${p}} = ${p} + 1 - ${N} = ${ap}\\), so \\(\\alpha + \\beta = ${ap}\\) and \\(\\alpha\\beta = ${p}\\).`,
        `\\(\\alpha^2 + \\beta^2 = (\\alpha + \\beta)^2 - 2\\alpha\\beta = ${ap * ap} - ${2 * p} = ${ap * ap - 2 * p}\\).`,
        `\\(\\#E(\\mathbb{F}_{${p * p}}) = ${p * p} + 1 - (${ap * ap - 2 * p}) = ${N2}\\).`,
      ],
    };
  }

  // ---------- Splitting of primes in quadratic fields ----------
  const SQUAREFREE = Array.from({ length: 61 }, (_, i) => i - 30).filter(
    (d) => d !== 0 && d !== 1 && ![4, 9, 25].some((s) => d % s === 0)
  );
  function quadraticSplitting(rng) {
    const d = rng.pick(SQUAREFREE);
    const p = rng.pick(ODD_PRIMES.slice(0, 10));
    const disc = mod(d, 4) === 1 ? d : 4 * d;
    const minpoly = `x^2 ${d < 0 ? "+" : "-"} ${Math.abs(d)}`;
    const steps = [`The discriminant of \\(\\mathbb{Q}(\\sqrt{${d}})\\) is \\(${disc}\\). Since \\(${p}\\) is odd, \\(${p}\\) splits like \\(${minpoly}\\) modulo \\(${p}\\) (Dedekind–Kummer).`];
    let efg;
    if (d % p === 0) {
      efg = [2, 1, 1];
      steps.push(`\\(${p} \\mid ${d}\\), so \\(${minpoly} \\equiv x^2 \\pmod{${p}}\\): \\(${p}\\) ramifies, \\((${p}) = \\mathfrak{p}^2\\).`);
    } else {
      const r = mod(d, p);
      const isSq = legendre(r, p) > 0;
      efg = isSq ? [1, 1, 2] : [1, 2, 1];
      steps.push(
        `\\(${d} \\equiv ${r} \\pmod{${p}}\\), and the nonzero squares mod \\(${p}\\) are \\(${setTex(squaresMod(p))}\\), so \\(${sym(d, p)} = ${isSq ? 1 : -1}\\).`,
        isSq
          ? `\\(${minpoly}\\) has two distinct roots mod \\(${p}\\): \\(${p}\\) splits, \\((${p}) = \\mathfrak{p}\\,\\mathfrak{p}'\\).`
          : `\\(${minpoly}\\) is irreducible mod \\(${p}\\): \\(${p}\\) is inert, \\((${p})\\) stays prime with residue field \\(\\mathbb{F}_{${p * p}}\\).`
      );
    }
    steps.push(`So \\((e, f, g) = (${efg.join(", ")})\\), and \\(efg = 2 = [K : \\mathbb{Q}]\\).`);
    return {
      data: { d, p },
      statement: `In \\(K = \\mathbb{Q}(\\sqrt{${d}})\\), the prime \\(${p}\\) factors as \\((${p}) = (\\mathfrak{p}_1 \\cdots \\mathfrak{p}_g)^e\\), with residue fields of size \\(${p}^f\\). Find \\(e\\), \\(f\\) and \\(g\\).`,
      answers: [
        { label: "e", value: F(efg[0]) },
        { label: "f", value: F(efg[1]) },
        { label: "g", value: F(efg[2]) },
      ],
      hint: "For an odd prime \\(p\\): ramified if \\(p \\mid d\\), split if \\(d\\) is a nonzero square mod \\(p\\), inert otherwise.",
      solution: steps,
    };
  }

  // ---------- Newton polygons ----------
  /** Lower convex hull of points [i, v], sorted by i. */
  function lowerHull(points) {
    const hull = [];
    for (const pt of points) {
      while (hull.length >= 2) {
        const [[x1, y1], [x2, y2]] = hull.slice(-2);
        // Drop the middle point unless it lies strictly below the chord.
        if ((y2 - y1) * (pt[0] - x1) >= (pt[1] - y1) * (x2 - x1)) hull.pop();
        else break;
      }
      hull.push(pt);
    }
    return hull;
  }
  function newtonPolygon(rng) {
    const p = rng.pick([2, 3, 5]);
    const n = rng.int(3, 4);
    const vals = [];
    for (let i = 0; i <= n; i++) {
      if (i === n) vals.push(0);
      else if (i > 0 && rng.next() < 0.25) vals.push(null);
      else vals.push(rng.int(0, p === 5 ? 3 : 4));
    }
    const units = [1, 2, 3, 4, 6, 7].filter((u) => u % p !== 0);
    const coeffs = vals.map((v, i) => (v === null ? 0 : (i === n ? 1 : rng.sign()) * rng.pick(units) * p ** v));
    const points = coeffs.map((c, i) => [i, c === 0 ? null : valuation(c, p)]).filter(([, v]) => v !== null);
    const hull = lowerHull(points);
    const segments = [];
    for (let s = 0; s + 1 < hull.length; s++) {
      const [[x1, y1], [x2, y2]] = [hull[s], hull[s + 1]];
      segments.push({ from: hull[s], to: hull[s + 1], len: x2 - x1, root: F(y1 - y2, x2 - x1) });
    }
    const roots = segments.flatMap((sg) => new Array(sg.len).fill(sg.root)).sort((a, b) => a.sub(b).valueOf());
    const ftex = polyTex(coeffs.slice().reverse());
    return {
      data: { p, coeffs },
      statement: `Let \\(f(x) = ${ftex} \\in \\mathbb{Q}_{${p}}[x]\\). List the \\(${p}\\)-adic valuations \\(\\lambda_1 \\le \\cdots \\le \\lambda_{${n}}\\) of its roots in \\(\\overline{\\mathbb{Q}}_{${p}}\\), counted with multiplicity.`,
      answers: roots.map((r, i) => ({ label: `\\lambda_{${i + 1}}`, value: r })),
      hint: "Plot the points \\((i, v_p(a_i))\\) for \\(f = \\sum a_i x^i\\) and take the lower convex hull. A segment of slope \\(s\\) and horizontal length \\(\\ell\\) gives \\(\\ell\\) roots of valuation \\(-s\\).",
      solution: [
        `The points \\((i, v_{${p}}(a_i))\\) are \\(${points.map(([i, v]) => `(${i}, ${v})`).join(",\\ ")}\\).`,
        `The lower convex hull has vertices \\(${hull.map(([i, v]) => `(${i}, ${v})`).join(",\\ ")}\\).`,
        ...segments.map(
          (sg) =>
            `From \\((${sg.from.join(", ")})\\) to \\((${sg.to.join(", ")})\\): slope \\(${sg.root.neg().toTex()}\\), length \\(${sg.len}\\), so \\(${sg.len}\\) root${sg.len > 1 ? "s" : ""} of valuation \\(${sg.root.toTex()}\\).`
        ),
      ],
    };
  }

  const TOPIC = { id: "nt", name: "Number Theory" };
  const TYPES = [
    { id: "nt-valuation", topic: "nt", name: "p-adic valuations", gen: padicValuation, why: "Valuations are the first step from \\(\\mathbb{Z}\\) to the \\(p\\)-adic integers: with \\(|x|_p = p^{-v_p(x)}\\), numbers divisible by a high power of \\(p\\) are small, and completing \\(\\mathbb{Q}\\) for this absolute value gives \\(\\mathbb{Q}_p\\). Kummer's theorem, that \\(v_p\\binom{n}{k}\\) counts the carries when adding \\(k\\) and \\(n-k\\) in base \\(p\\), is a first taste of how base-\\(p\\) digits control \\(p\\)-adic size." },
    { id: "nt-legendre", topic: "nt", name: "Legendre symbols", gen: legendreSymbol, why: "For an odd prime \\(p \\nmid a\\), the symbol \\(\\left(\\frac{a}{p}\\right)\\) decides whether \\(p\\) splits in \\(\\mathbb{Q}(\\sqrt{a})\\), and quadratic reciprocity implies that the answer depends only on \\(p\\) modulo \\(4|a|\\). Artin reciprocity in class field theory extends this to every abelian extension of a number field." },
    { id: "nt-hensel", topic: "nt", name: "Hensel lifting", gen: henselLift, why: "Hensel's lemma is Newton's method in \\(\\mathbb{Z}_p\\): a simple root modulo \\(p\\) lifts to a unique root in \\(\\mathbb{Z}_p\\). Geometrically it is the lifting property of étale morphisms over a complete local ring, and it is the reason solutions modulo \\(p\\) so often come from \\(p\\)-adic solutions." },
    { id: "nt-ecpoints", topic: "nt", name: "Points on elliptic curves", gen: ellipticPoints, why: "Hasse's theorem bounds \\(|a_p| \\le 2\\sqrt{p}\\). The number \\(a_p\\) is the trace of Frobenius on the \\(\\ell\\)-adic Tate module, and for an elliptic curve over \\(\\mathbb{Q}\\) with good reduction at \\(p\\), modularity says \\(a_p\\) is the \\(p\\)-th Fourier coefficient of a weight-2 newform." },
    { id: "nt-ecfp2", topic: "nt", name: "Points over extensions", gen: ellipticExtension, why: "This is the Weil conjecture for an elliptic curve: its zeta function is \\(\\frac{1 - a_pT + pT^2}{(1-T)(1-pT)}\\), so one count over \\(\\mathbb{F}_p\\) determines the counts over every \\(\\mathbb{F}_{p^r}\\), and \\(|\\alpha| = |\\beta| = \\sqrt{p}\\) is the Riemann hypothesis for curves." },
    { id: "nt-split", topic: "nt", name: "Splitting in quadratic fields", gen: quadraticSplitting, why: "How primes factor in a ring of integers is the first question of algebraic number theory. \\(\\operatorname{Spec} \\mathcal{O}_K \\to \\operatorname{Spec} \\mathbb{Z}\\) behaves like a double cover: over a split prime the fibre has two points, over an inert prime one point with a bigger residue field, and the ramified primes are the branch points." },
    { id: "nt-newton", topic: "nt", name: "Newton polygons", gen: newtonPolygon, why: "Newton polygons read off the valuations of roots without finding them. Slopes come back throughout \\(p\\)-adic Hodge theory: the Dieudonné–Manin theorem classifies \\(F\\)-isocrystals by Newton slopes, and Mazur's theorem (Katz's conjecture) says that, under suitable hypotheses, the Newton polygon of Frobenius on crystalline cohomology lies on or above the Hodge polygon." },
  ];

  return { TOPIC, TYPES, nt: { mod, powMod, invMod, legendre, lowerHull } };
});
