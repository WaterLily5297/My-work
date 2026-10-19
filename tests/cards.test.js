// Review cards: missed problems become Markdown cards in the format Formosa imports
// (question lines, a line holding only "?", answer lines; blank lines and headings end a card).
const test = require("node:test");
const assert = require("node:assert/strict");
const katex = require("katex");
const P = require("../js/problems.js");
const { MAX_CARDS, htmlToMarkdown, toMarkdown } = require("../js/cards.js");

const SEEDS = 40;

test("htmlToMarkdown keeps math intact and converts the markup around it", () => {
  assert.equal(htmlToMarkdown("If \\(a < b\\) and \\(b<c\\), then <b>a</b> &lt; c."), "If $a < b$ and $b<c$, then **a** < c.");
  assert.equal(htmlToMarkdown("\\[ \\begin{pmatrix} 1 & 2 \\end{pmatrix} \\]"), "$$\\begin{pmatrix} 1 & 2 \\end{pmatrix}$$");
  assert.equal(htmlToMarkdown("Type <code>-3/4</code>&nbsp;here"), "Type `-3/4` here");
  assert.equal(htmlToMarkdown("one<br>\n\n?\n two "), "one\ntwo", "blank lines and lone question marks are removed");
  assert.equal(htmlToMarkdown("&#8730;2 &amp; &#x3c0;"), "√2 & π");
});

// Split a note the way Formosa does: blank lines, headings, quotes, tables and rules end a block.
function blocks(text) {
  const out = [];
  let current = [];
  let yaml = text.startsWith("---\n");
  for (const [i, line] of text.split("\n").entries()) {
    if (yaml) {
      if (i > 0 && line === "---") yaml = false;
      continue;
    }
    if (!line.trim() || /^ {0,3}#{1,6}\s/.test(line) || /^\s*(?:>|\||---+$)/.test(line)) {
      if (current.length) out.push(current);
      current = [];
    } else current.push(line);
  }
  if (current.length) out.push(current);
  return out;
}

test("every problem type exports as exactly one well-formed card per mistake", () => {
  const items = P.TYPES.flatMap((t) => Array.from({ length: SEEDS }, (_, s) => ({ type: t.id, seed: 1000 + s })));
  const { text, count, skipped } = toMarkdown(items.slice(0, MAX_CARDS), P, "2026-10-19");
  assert.equal(count, MAX_CARDS);
  assert.equal(skipped, 0);
  for (const t of P.TYPES) {
    const mine = items.filter((r) => r.type === t.id);
    const { text: one, count: n } = toMarkdown(mine, P, "2026-10-19");
    assert.equal(n, SEEDS);
    const cards = blocks(one).filter((b) => b.includes("?"));
    assert.equal(cards.length, SEEDS, `${t.id}: one card per problem`);
    for (const lines of cards) {
      assert.equal(lines.filter((l) => l.trim() === "?").length, 1, `${t.id}: a single separator line`);
      assert.match(lines.at(-1), new RegExp(`^\\*Math Drill: ${t.id}, seed \\d+\\*$`));
    }
    assert.doesNotMatch(one, /\\\(|\\\)|\\\[|\\\]|<\/?(?:b|code)>/, `${t.id}: leftover HTML or TeX delimiters`);
    // Every formula in the note still renders.
    for (const m of one.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)) {
      katex.renderToString(m[1] ?? m[2], { throwOnError: true, displayMode: Boolean(m[1]) });
    }
  }
  assert.match(text, /^---\nsource: Math Drill\nexported: 2026-10-19\n---\n/);
});

test("the export is deterministic, skips unknown types, and stops at Formosa's card limit", () => {
  const items = [{ type: "ag-rr", seed: 5 }, { type: "retired-type", seed: 1 }, { type: "det2", seed: 9 }];
  const a = toMarkdown(items, P, "2026-10-19"), b = toMarkdown(items, P, "2026-10-19");
  assert.equal(a.text, b.text);
  assert.equal(a.count, 2);
  assert.match(a.text, /## Riemann–Roch \(Algebraic Geometry\)\n\n[^\n]+\n\?\n\*\*Answer:\*\* \$\\ell\(H\) = 3\$/);
  const many = Array.from({ length: MAX_CARDS + 7 }, (_, s) => ({ type: "det2", seed: s }));
  const capped = toMarkdown(many, P, "2026-10-19");
  assert.equal(capped.count, MAX_CARDS);
  assert.equal(capped.skipped, 7);
});
