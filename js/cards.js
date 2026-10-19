/*
 * Review cards: turn saved mistakes into a Markdown note that Obsidian displays
 * and Formosa's card importer reads. Each problem becomes one multi-line card:
 * the statement, a line holding only "?", then the answer and worked solution.
 * Blank lines and headings separate cards, and math uses $...$ / $$...$$.
 * Works both in the browser (window.MathDrillCards) and in Node (require).
 */
(function (root, factory) {
  const lib = factory();
  if (typeof module === "object" && module.exports) module.exports = lib;
  else root.MathDrillCards = lib;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Formosa previews at most 200 cards from one note.
  const MAX_CARDS = 200;
  const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

  function decode(text) {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, name) => {
      if (name[0] === "#") return String.fromCodePoint(name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1)));
      return ENTITIES[name.toLowerCase()] ?? m;
    });
  }

  // Math is set aside first: it often contains < > & that must not be read as HTML.
  function htmlToMarkdown(html) {
    const math = [];
    const keep = (tex, display) => {
      math.push(display ? `$$${decode(tex).trim()}$$` : `$${decode(tex).trim()}$`);
      return `\u0000${math.length - 1}\u0000`;
    };
    let text = html
      .replace(/\\\[([\s\S]*?)\\\]/g, (m, tex) => keep(tex, true))
      .replace(/\\\(([\s\S]*?)\\\)/g, (m, tex) => keep(tex, false))
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(b|strong)>/gi, "**")
      .replace(/<\/?(i|em)>/gi, "*")
      .replace(/<\/?code>/gi, "`")
      .replace(/<[^>]*>/g, "");
    text = decode(text).replace(/\u0000(\d+)\u0000/g, (m, i) => math[Number(i)]);
    // A blank line would end the card early, and a lone "?" would split it again.
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && line !== "?")
      .join("\n");
  }

  function card(problem, topicName) {
    const answer = problem.answers.map((a) => `${a.label} = ${a.value.toTex()}`).join(",\\quad ");
    const lines = [
      `## ${problem.name} (${topicName})`,
      "",
      htmlToMarkdown(problem.statement),
      "?",
      `**Answer:** $${answer}$${problem.unordered ? " (in any order)" : ""}`,
      ...problem.solution.map(htmlToMarkdown),
      `*Math Drill: ${problem.type}, seed ${problem.seed}*`,
    ];
    return lines.join("\n");
  }

  // items: [{ type, seed }] as saved in "Mistakes to revisit".
  function toMarkdown(items, P, date) {
    const chosen = items.filter((r) => P.byId[r.type]).slice(0, MAX_CARDS);
    const topics = new Map(P.TOPICS.map((t) => [t.id, t.name]));
    const cards = chosen.map((r) => {
      const problem = P.generate(r.type, r.seed);
      return card(problem, topics.get(problem.topic));
    });
    const head = [
      "---",
      "source: Math Drill",
      `exported: ${date}`,
      "---",
      "",
      "# Math Drill: mistakes to revisit",
      "",
      "Each card is a problem you missed. The answer and worked solution come after the line with a single question mark.",
    ].join("\n");
    return { text: [head, ...cards].join("\n\n") + "\n", count: cards.length, skipped: items.length - cards.length };
  }

  return { MAX_CARDS, htmlToMarkdown, toMarkdown };
});
