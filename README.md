# Math Drill

Practice university math in your browser. Every problem is generated on the fly, so you never run out: type your answer, get it marked instantly, and read a worked, step-by-step solution.

![Math Drill screenshot](docs/screenshot.png)

## What you can practise

**Algebraic Geometry**: singular points (multiplicity and tangent cone), intersection multiplicities, dimensions of monomial quotients `k[x,y]/I`, points at infinity of projective closures, Bézout's theorem, genus of plane curves with nodes and cusps, Riemann–Hurwitz, Riemann–Roch, Hilbert functions, Veronese and Segre embeddings.

**Linear Algebra**: 2×2 and 3×3 determinants, matrix products, inverse matrices, eigenvalues, cross products, rank, linear systems.

**Calculus**: derivatives, chain rule, definite integrals, limits (0/0 forms), partial derivatives, geometric series, Taylor series coefficients, 2nd-order linear ODEs, double integrals.

**Probability & Statistics**: combinations, drawing without replacement, expectation and variance, the binomial distribution, Bayes' theorem, mean and variance of data, continuous densities.

34 problem types in all. Tick the ones you want in the sidebar, or use *Only this* to focus on one topic.

## Features

- **Endless problems**: numbers are randomised, but always chosen so the answer is a clean integer or fraction.
- **Exact checking**: answers are compared as exact fractions. Type `3`, `-2/5` or `0.125`; for answers like 1/3, a decimal with at least three places (`0.333`) is accepted too. Full-width digits work.
- **Worked solutions** for every problem, plus a hint if you're stuck.
- **Mistakes to revisit**: anything you miss is saved so you can retry exactly the same problem later.
- **Progress tracking**: score, streak and per-topic accuracy are saved in your browser.
- **Keyboard friendly**: press <kbd>Enter</kbd> to check, and <kbd>Enter</kbd> again for the next problem.
- Light and dark themes (follows your system setting), works on phones.

## Run it

No build step and no dependencies at runtime.

- **Locally**: download the repository and open `index.html` in your browser. (Math rendering uses KaTeX from a CDN, so you need an internet connection.)
- **On GitHub Pages**: in this repository go to *Settings → Pages*, set *Source* to *Deploy from a branch*, choose `main` and `/ (root)`, and save. The app will be live at `https://<your-username>.github.io/<repository-name>/` within a minute or two.

## Tests

The tests check every problem type over hundreds of random seeds against an independent calculation (numerical integration, brute-force probability, Gaussian elimination, exact polynomial gcds, brute-force monomial counts and so on), confirm that all generated math renders with KaTeX, and exercise the answer checker.

```bash
npm install
npm test
```

They also run automatically on GitHub Actions for every push.

## Project structure

```
index.html          the page
css/style.css       styles (engineering-pad look, light and dark)
js/core.js          exact fractions, seeded random numbers, answer parsing, TeX helpers
js/problems.js      linear algebra, calculus and probability generators, plus the topic list
js/problems-ag.js   algebraic geometry generators
js/app.js           the interface: picking problems, checking, progress, review
tests/              Node tests (node:test)
```

## Adding a problem type

1. Write a generator in `js/problems.js` (or `js/problems-ag.js` for algebraic geometry). It receives a seeded random number generator and returns the statement, the answers (as `Fraction`s), a hint and solution steps. Keep a `data` field with the raw numbers.
2. Register it in the `TYPES` list with an id, topic and name.
3. Add a matching verifier in `tests/problems.test.js` (or `tests/ag-verifiers.js`) that recomputes the answer from `data` a different way, then run `npm test`.

## License

MIT
