/*
 * Book exercises: exercises from books you are reading, scheduled like the
 * mistakes in Math Drill. Your own books are stored by reference only (book,
 * section, number, page), so the problem text stays in the book. An exercise
 * deck from an openly licensed book may also carry the text and the book's
 * answer, together with its source and licence.
 * Works both in the browser (window.MathDrillExercises) and in Node (require).
 */
(function (root, factory) {
  const isNode = typeof module === "object" && module.exports;
  const lib = factory(isNode ? require("./study.js") : root.MathDrillStudy);
  if (isNode) module.exports = lib;
  else root.MathDrillExercises = lib;
})(typeof self !== "undefined" ? self : this, function (S) {
  "use strict";

  const BACKUP = "math-drill-exercises";
  const DECK = "math-drill-exercise-deck";
  const MAX_RANGE = 100;
  const clip = (value, n) => (typeof value === "string" ? value.trim().slice(0, n) : "");

  /**
   * "3.1–3.4, 3.9, 12" → ["3.1", "3.2", "3.3", "3.4", "3.9", "12"]. A range keeps
   * everything before its last number fixed ("II.3-II.5"); its ends must share that prefix.
   */
  function expandNumbers(text) {
    const numbers = [];
    for (const raw of String(text).split(/[,;、，]/)) {
      const token = raw.trim();
      if (!token) continue;
      const range = token.split(/\s*[-–—~〜]\s*/);
      if (range.length === 1) {
        numbers.push(token);
        continue;
      }
      const [a, b] = range.map((end) => /^(.*?)(\d+)$/.exec(end));
      if (range.length !== 2 || !a || !b || a[1] !== b[1] || Number(b[2]) < Number(a[2])) {
        return { numbers: [], error: `"${token}" is not a range like 3.1-3.6 or 4-9.` };
      }
      if (Number(b[2]) - Number(a[2]) >= MAX_RANGE) return { numbers: [], error: `"${token}" has more than ${MAX_RANGE} exercises.` };
      for (let n = Number(a[2]); n <= Number(b[2]); n++) numbers.push(a[1] + n);
    }
    const unique = [...new Set(numbers)];
    return unique.length ? { numbers: unique, error: null } : { numbers: [], error: "Enter at least one exercise number." };
  }

  const bookKey = (book) => (book.catalogId ? `id:${book.catalogId}` : `title:${book.title.trim().toLowerCase()}`);
  const itemId = (book, section, number) => `${bookKey(book)}|${section}|${number}`;

  /** New exercises from the form, skipping ones already saved. All are due today. */
  function addExercises(items, { title, catalogId, section, numbers, page }, today) {
    const book = { title: clip(title, 300), catalogId: clip(catalogId, 200) || null };
    if (!book.title) throw new Error("Enter the book.");
    const sec = clip(section, 60);
    const pg = Number.isInteger(page) && page > 0 ? page : null;
    const have = new Set(items.map((x) => x.id));
    const added = [];
    for (const number of numbers) {
      const id = itemId(book, sec, number);
      if (have.has(id)) continue;
      have.add(id);
      added.push({ id, book, section: sec, number: clip(number, 40), page: pg, added: today, step: 0, due: today, mastered: null, log: [] });
    }
    return { items: [...items, ...added], added: added.length, skipped: numbers.length - added.length };
  }

  /** Self-assessment: "solved" moves along the 1-3-7-16 day schedule; after the last step it is mastered. */
  function grade(item, ok, today) {
    const log = [...(item.log || []), { day: today, ok }];
    const next = S.reviewed(item, ok, today);
    return next ? { ...next, log } : { ...item, log, step: S.INTERVALS.length, due: null, mastered: today };
  }

  const isDue = (item, today) => !item.mastered && item.due !== null && item.due <= today;
  function dueQueue(items, today) {
    return items
      .filter((x) => isDue(x, today))
      .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.added < b.added ? -1 : a.added > b.added ? 1 : a.id < b.id ? -1 : 1));
  }
  /** Saved exercises grouped by book. */
  function bookSummary(items, today) {
    const groups = new Map();
    for (const x of items) {
      const key = bookKey(x.book);
      const g = groups.get(key) || { key, title: x.book.title, catalogId: x.book.catalogId, total: 0, mastered: 0, due: 0 };
      g.total++;
      if (x.mastered) g.mastered++;
      if (isDue(x, today)) g.due++;
      groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title));
  }

  const backup = (items, today) => ({ format: BACKUP, version: 1, exported: today, items });

  /** A saved item from a backup file, with every field checked; null if it is not one. */
  function cleanItem(x) {
    if (!x || typeof x !== "object" || !x.book || typeof x.id !== "string" || !clip(x.book.title, 300) || !clip(x.number, 40)) return null;
    const day = (d) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
    const item = {
      id: clip(x.id, 600),
      book: { title: clip(x.book.title, 300), catalogId: clip(x.book.catalogId, 200) || null },
      section: clip(x.section, 60),
      number: clip(x.number, 40),
      page: Number.isInteger(x.page) && x.page > 0 ? x.page : null,
      added: day(x.added) || "1970-01-01",
      step: Number.isInteger(x.step) && x.step >= 0 && x.step <= S.INTERVALS.length ? x.step : 0,
      due: day(x.due),
      mastered: day(x.mastered),
      log: Array.isArray(x.log) ? x.log.filter((e) => e && day(e.day)).map((e) => ({ day: e.day, ok: e.ok === true })) : [],
    };
    if (!item.mastered && !item.due) item.due = item.added;
    if (typeof x.text === "string" && typeof x.answer === "string" && x.source) {
      const source = cleanSource(x.source);
      if (source) Object.assign(item, { text: clip(x.text, 20000), answer: clip(x.answer, 20000), source });
    }
    return item;
  }
  /** A deck must say where its text comes from and under which licence it is shared. */
  function cleanSource(s) {
    const source = { title: clip(s && s.title, 300), authors: clip(s && s.authors, 300), license: clip(s && s.license, 200), url: clip(s && s.url, 500) };
    return source.title && source.license && /^https:\/\//.test(source.url) ? source : null;
  }

  /**
   * Restores a backup, or loads a deck of licensed exercises. Saved items win
   * over incoming ones with the same id, so progress is never overwritten.
   */
  function restore(items, data, today) {
    if (!data || typeof data !== "object") throw new Error("This is not a Math Drill exercise file.");
    let incoming;
    if (data.format === BACKUP && data.version === 1 && Array.isArray(data.items)) {
      incoming = data.items.map(cleanItem);
    } else if (data.format === DECK && data.version === 1 && Array.isArray(data.exercises)) {
      const source = cleanSource(data.source);
      if (!source) throw new Error("A deck needs its source title, licence and https link.");
      const book = { title: source.title, catalogId: clip(data.catalogId, 200) || null };
      incoming = data.exercises.map((e) =>
        e && clip(e.number, 40) && typeof e.text === "string" && typeof e.answer === "string"
          ? cleanItem({ id: itemId(book, clip(e.section, 60), clip(e.number, 40)), book, section: e.section, number: e.number, page: e.page, added: today, due: today, text: e.text, answer: e.answer, source })
          : null
      );
    } else {
      throw new Error("This is not a Math Drill exercise file.");
    }
    const have = new Set(items.map((x) => x.id));
    const fresh = incoming.filter((x) => x && !have.has(x.id) && have.add(x.id));
    return { items: [...items, ...fresh], added: fresh.length, ignored: incoming.length - fresh.length };
  }

  /** "Algebraic Curves · §3.3 · Exercise 3.17 · p. 41" */
  function label(item) {
    return [item.section && `§${item.section}`, `Exercise ${item.number}`, item.page && `p. ${item.page}`].filter(Boolean).join(" · ");
  }

  return { BACKUP, DECK, bookKey, expandNumbers, addExercises, grade, isDue, dueQueue, bookSummary, backup, restore, label };
});
