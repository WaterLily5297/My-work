/* Math Drill: further reading for each problem type, drawn from the Formosa public catalog.
 * Generated from https://waterlily5297.github.io/MathKnowledge-Public/catalog.json (updated 2026-10-19).
 * Each book keeps the catalog ID, so the catalog entry link opens a local PDF when the reader has
 * connected a local library there. Titles, authors and sources are copied from the catalog
 * (a romanized name the catalog repeats as "Name /Name" is shown once).
 * Works both in the browser (window.MathDrillReading) and in Node (require). */
(function (root, factory) {
  const lib = factory();
  if (typeof module === "object" && module.exports) module.exports = lib;
  else root.MathDrillReading = lib;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const CATALOG = "https://waterlily5297.github.io/MathKnowledge-Public/";

  const BOOKS = {
    "ag-classic-combinatorial-ca": { title: "Combinatorial Commutative Algebra", authors: "Ezra Miller; Bernd Sturmfels", language: "en", source: "https://math.berkeley.edu/~bernd/books.html" },
    "ag-classic-harris": { title: "Algebraic Geometry: A First Course", authors: "Joe Harris", language: "en", source: "https://link.springer.com/book/10.1007/978-1-4757-2189-8" },
    "ag-classic-iva": { title: "Ideals, Varieties, and Algorithms — Fourth Edition", authors: "David A. Cox; John Little; Donal O’Shea", language: "en", source: "https://dacox.people.amherst.edu/iva.html" },
    "ag-classic-kirwan": { title: "Complex Algebraic Curves", authors: "Frances Kirwan", language: "en", source: "https://homepages.math.uic.edu/~coskun/rtg-grad.html" },
    "ag-classic-miranda": { title: "Algebraic Curves and Riemann Surfaces", authors: "Rick Miranda", language: "en", source: "https://homepages.math.uic.edu/~coskun/rtg-grad.html" },
    "ag-classic-rpec": { title: "Rational Points on Elliptic Curves", authors: "Joseph H. Silverman; John T. Tate", language: "en", source: "https://www.math.brown.edu/johsilve/RPECHome.html" },
    "ag-classic-silverman-aec": { title: "The Arithmetic of Elliptic Curves", authors: "Joseph H. Silverman", language: "en", source: "https://www.math.brown.edu/johsilve/AECHome.html" },
    "ag-fujino-literature-guide-ja": { title: "A Guide to the Literature: Algebraic Geometry", authors: "Osamu Fujino", language: "ja", source: "https://www.math.kyoto-u.ac.jp/~fujino/sonota.html" },
    "ag-fulton-curves": { title: "Algebraic Curves: An Introduction to Algebraic Geometry", authors: "William Fulton", language: "en", source: "https://www.math.lsa.umich.edu/~wfulton/" },
    "ag-gathmann-geometry": { title: "Algebraic Geometry (2021/22 course notes)", authors: "Andreas Gathmann", language: "en", source: "https://agag-gathmann.math.rptu.de/en/alggeom.php" },
    "ag-kedlaya-p-adic-differential-equations": { title: "p-adic Differential Equations (First Edition, 2010)", authors: "Kiran S. Kedlaya", language: "en", source: "https://kskedlaya.org/papers/" },
    "ag-lazarsfeld-ag": { title: "Algebraic Curves and Riemann Surfaces — MAT538 Lecture Notes", authors: "Robert Lazarsfeld", language: "en", source: "https://www.math.stonybrook.edu/~roblaz/ClassNotes/index.html" },
    "ag-murfet-henselslemma": { title: "Daniel Murfet — Hensel’s Lemma", authors: "Daniel Murfet", language: "en", source: "https://therisingsea.org/" },
    "ag-stein-algebraic-number-theory-computational": { title: "Algebraic Number Theory: A Computational Approach", authors: "William Stein", language: "en", source: "https://www.wstein.org/books/" },
    "ag-yanagida-curves2018-lecture07": { title: "Algebraic Curves, Lecture 7: The Riemann-Roch Theorem for Curves", authors: "Shintaro Yanagida", language: "ja", source: "https://www.math.nagoya-u.ac.jp/~yanagida/edu/2018WA.html" },
    "cambridge-ia-l-probability": { title: "Cambridge Notes: Probability (2015, R. Weber)", authors: "Dexter Chua (personal lecture notes; lecturer named in title)", language: "en", source: "https://dec41.user.srcf.net/notes/" },
    "cambridge-ia-m-vectors-and-matrices": { title: "Cambridge Notes: Vectors and Matrices (2014, N. Peake)", authors: "Dexter Chua (personal lecture notes; lecturer named in title)", language: "en", source: "https://dec41.user.srcf.net/notes/" },
    "cambridge-ii-l-number-fields": { title: "Cambridge Notes: Number Fields (2016, I. Grojnowski)", authors: "Dexter Chua (personal lecture notes; lecturer named in title)", language: "en", source: "https://dec41.user.srcf.net/notes/" },
    "clp-1-problems": { title: "CLP-1 Differential Calculus: Problem Book", authors: "Joel Feldman; Andrew Rechnitzer; Elyse Yeager", language: "en", source: "https://personal.math.ubc.ca/~CLP/CLP1/" },
    "clp-1-text": { title: "CLP-1 Differential Calculus: Textbook", authors: "Joel Feldman; Andrew Rechnitzer; Elyse Yeager", language: "en", source: "https://personal.math.ubc.ca/~CLP/CLP1/" },
    "clp-2-problems": { title: "CLP-2 Integral Calculus: Problem Book", authors: "Joel Feldman; Andrew Rechnitzer; Elyse Yeager", language: "en", source: "https://personal.math.ubc.ca/~CLP/CLP2/" },
    "clp-2-text": { title: "CLP-2 Integral Calculus: Textbook", authors: "Joel Feldman; Andrew Rechnitzer; Elyse Yeager", language: "en", source: "https://personal.math.ubc.ca/~CLP/CLP2/" },
    "clp-3-problems": { title: "CLP-3 Multivariable Calculus: Problem Book", authors: "Joel Feldman; Andrew Rechnitzer; Elyse Yeager", language: "en", source: "https://personal.math.ubc.ca/~CLP/CLP3/" },
    "clp-3-text": { title: "CLP-3 Multivariable Calculus: Textbook", authors: "Joel Feldman; Andrew Rechnitzer; Elyse Yeager", language: "en", source: "https://personal.math.ubc.ca/~CLP/CLP3/" },
    "hefferon-linear-algebra": { title: "Linear Algebra", authors: "Jim Hefferon", language: "en", source: "https://hefferon.net/linearalgebra/" },
    "hiranabe-art-linear-algebra-ja": { title: "The Art of Linear Algebra — Japanese", authors: "Kenji Hiranabe", language: "ja", source: "https://github.com/kenjihiranabe/The-Art-of-Linear-Algebra" },
    "judson-ode-20260811": { title: "The Ordinary Differential Equations Project — 2026", authors: "Thomas W. Judson", language: "en", source: "https://judsonbooks.org/the-ordinary-differential-equations-project/" },
    "linear-algebra-done-right": { title: "Linear Algebra Done Right, 4th ed.", authors: "Sheldon Axler", language: "en", source: "https://linear.axler.net/" },
    "linear-algebra-done-wrong": { title: "Linear Algebra Done Wrong (2026-08-31)", authors: "Sergei Treil", language: "en", source: "https://sites.google.com/a/brown.edu/sergei-treil-homepage/linear-algebra-done-wrong" },
    "milne-ant": { title: "Algebraic Number Theory", authors: "J. S. Milne", language: "en", source: "https://www.jmilne.org/math/CourseNotes/" },
    "milne-elliptic-curves": { title: "Elliptic Curves (author online version)", authors: "J. S. Milne", language: "en", source: "https://www.jmilne.org/math/Books/" },
    "number-theory-shoup": { title: "A Computational Introduction to Number Theory and Algebra, 2nd ed.", authors: "Victor Shoup", language: "en", source: "https://shoup.net/ntb/" },
    "number-theory-stein": { title: "Elementary Number Theory: Primes, Congruences, and Secrets", authors: "William Stein", language: "en", source: "https://wstein.org/ent/" },
    "openstax-statistics": { title: "Introductory Statistics 2e", authors: "Barbara Illowsky; Susan Dean; OpenStax", language: "en", source: "https://openstax.org/details/books/introductory-statistics-2e" },
    "probability-grinstead-snell": { title: "Introduction to Probability", authors: "Charles M. Grinstead; J. Laurie Snell", language: "en", source: "https://math.dartmouth.edu/~prob/prob/prob.html" },
    "trench-ode-bvp": { title: "Elementary Differential Equations with Boundary Value Problems", authors: "William F. Trench", language: "en", source: "https://digitalcommons.trinity.edu/mono/9/" },
  };

  // Japanese-language resources shown for every problem in a topic.
  const TOPIC_READING = {
    ag: ["ag-fujino-literature-guide-ja"],
    linalg: ["hiranabe-art-linear-algebra-ja"],
  };

  // books: catalog IDs, most useful first. search: catalog filters for "find more".
  const READING = {
    "ag-sing": { books: ["ag-fulton-curves", "ag-gathmann-geometry"], search: {"q": "singular", "subject": "algebraic-geometry"} },
    "ag-intmult": { books: ["ag-fulton-curves", "ag-classic-kirwan"], search: {"q": "intersection", "subject": "algebraic-geometry"} },
    "ag-quotient": { books: ["ag-classic-iva", "ag-classic-combinatorial-ca"], search: {"q": "Gröbner"} },
    "ag-infinity": { books: ["ag-fulton-curves", "ag-classic-kirwan"], search: {"q": "projective", "subject": "algebraic-geometry"} },
    "ag-bezout": { books: ["ag-fulton-curves", "ag-classic-kirwan"], search: {"q": "algebraic curves"} },
    "ag-genus": { books: ["ag-fulton-curves", "ag-classic-kirwan"], search: {"q": "algebraic curves"} },
    "ag-hurwitz": { books: ["ag-classic-miranda", "ag-lazarsfeld-ag"], search: {"q": "Riemann surfaces"} },
    "ag-rr": { books: ["ag-fulton-curves", "ag-classic-miranda", "ag-yanagida-curves2018-lecture07"], search: {"q": "Roch"} },
    "ag-hilbert": { books: ["ag-classic-iva", "ag-classic-harris"], search: {"q": "Hilbert", "subject": "algebraic-geometry"} },
    "ag-embed": { books: ["ag-classic-harris", "ag-gathmann-geometry"], search: {"q": "projective", "subject": "algebraic-geometry"} },
    "det2": { books: ["hefferon-linear-algebra", "linear-algebra-done-right"], search: {"subject": "linear-algebra", "type": "book"} },
    "det3": { books: ["hefferon-linear-algebra", "linear-algebra-done-right"], search: {"subject": "linear-algebra", "type": "book"} },
    "matmul": { books: ["hefferon-linear-algebra", "linear-algebra-done-wrong"], search: {"subject": "linear-algebra", "type": "book"} },
    "inverse": { books: ["hefferon-linear-algebra", "linear-algebra-done-wrong"], search: {"subject": "linear-algebra", "type": "book"} },
    "rank": { books: ["hefferon-linear-algebra", "linear-algebra-done-wrong"], search: {"subject": "linear-algebra", "type": "book"} },
    "system": { books: ["hefferon-linear-algebra", "linear-algebra-done-wrong"], search: {"subject": "linear-algebra", "type": "book"} },
    "eigen": { books: ["linear-algebra-done-right", "hefferon-linear-algebra"], search: {"subject": "linear-algebra", "type": "book"} },
    "cross": { books: ["cambridge-ia-m-vectors-and-matrices"], search: {"subject": "linear-algebra", "type": "book"} },
    "limit": { books: ["clp-1-text", "clp-1-problems"], search: {"q": "calculus", "type": "book"} },
    "deriv": { books: ["clp-1-text", "clp-1-problems"], search: {"q": "calculus", "type": "book"} },
    "chain": { books: ["clp-1-text", "clp-1-problems"], search: {"q": "calculus", "type": "book"} },
    "integral": { books: ["clp-2-text", "clp-2-problems"], search: {"q": "calculus", "type": "book"} },
    "series": { books: ["clp-2-text", "clp-2-problems"], search: {"q": "calculus", "type": "book"} },
    "taylor": { books: ["clp-2-text", "clp-2-problems"], search: {"q": "calculus", "type": "book"} },
    "partial": { books: ["clp-3-text", "clp-3-problems"], search: {"q": "calculus", "type": "book"} },
    "double": { books: ["clp-3-text", "clp-3-problems"], search: {"q": "calculus", "type": "book"} },
    "ode": { books: ["judson-ode-20260811", "trench-ode-bvp"], search: {"q": "differential equations", "type": "book"} },
    "comb": { books: ["probability-grinstead-snell", "cambridge-ia-l-probability"], search: {"q": "probability", "type": "book"} },
    "urn": { books: ["probability-grinstead-snell", "cambridge-ia-l-probability"], search: {"q": "probability", "type": "book"} },
    "expvar": { books: ["probability-grinstead-snell", "cambridge-ia-l-probability"], search: {"q": "probability", "type": "book"} },
    "bayes": { books: ["probability-grinstead-snell", "cambridge-ia-l-probability"], search: {"q": "probability", "type": "book"} },
    "pdf": { books: ["probability-grinstead-snell", "cambridge-ia-l-probability"], search: {"q": "probability", "type": "book"} },
    "binom": { books: ["probability-grinstead-snell", "openstax-statistics"], search: {"q": "probability", "type": "book"} },
    "stats": { books: ["openstax-statistics"], search: {"q": "statistics", "type": "book"} },
    "nt-valuation": { books: ["milne-ant"], search: {"q": "p-adic"} },
    "nt-legendre": { books: ["number-theory-stein", "number-theory-shoup"], search: {"q": "number theory", "type": "book"} },
    "nt-hensel": { books: ["ag-murfet-henselslemma", "milne-ant"], search: {"q": "p-adic"} },
    "nt-ecpoints": { books: ["ag-classic-rpec", "ag-classic-silverman-aec", "milne-elliptic-curves"], search: {"q": "elliptic curves", "type": "book"} },
    "nt-ecfp2": { books: ["ag-classic-silverman-aec", "milne-elliptic-curves"], search: {"q": "elliptic curves", "type": "book"} },
    "nt-split": { books: ["milne-ant", "ag-stein-algebraic-number-theory-computational", "cambridge-ii-l-number-fields"], search: {"q": "number field"} },
    "nt-newton": { books: ["milne-ant", "ag-kedlaya-p-adic-differential-equations"], search: {"q": "p-adic"} },
  };

  function catalogUrl(params) {
    const url = new URL(CATALOG);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.hash = "catalog";
    return url.href;
  }

  // Everything the "Further reading" panel needs for one problem type.
  function forType(typeId, topicId) {
    const entry = READING[typeId];
    if (!entry) return null;
    const book = (id) => ({ id, ...BOOKS[id], catalog: catalogUrl({ id }) });
    return {
      books: entry.books.map(book),
      topicBooks: (TOPIC_READING[topicId] || []).map(book),
      search: { ...entry.search, url: catalogUrl(entry.search) },
    };
  }

  return { CATALOG, BOOKS, TOPIC_READING, READING, catalogUrl, forType };
});
