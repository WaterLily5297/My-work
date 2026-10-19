// Further reading: every problem type points at books in the Formosa public catalog.
// Set FORMOSA_CATALOG to a copy of the catalog's catalog.json to also check that every
// book and search still matches the published catalog.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const P = require("../js/problems.js");
const R = require("../js/reading.js");

test("every problem type has further reading", () => {
  assert.deepEqual(Object.keys(R.READING).sort(), P.TYPES.map((t) => t.id).sort());
  for (const t of P.TYPES) {
    const reading = R.forType(t.id, t.topic);
    assert.ok(reading.books.length >= 1, t.id);
    assert.equal(new Set(reading.books.map((b) => b.id)).size, reading.books.length, `${t.id}: duplicate book`);
    assert.ok(reading.search.q || reading.search.subject, `${t.id}: empty search`);
  }
  assert.equal(R.forType("no-such-type", "ag"), null);
});

test("books are complete, used, and link to public https pages", () => {
  const used = new Set([
    ...Object.values(R.READING).flatMap((r) => r.books),
    ...Object.values(R.TOPIC_READING).flat(),
  ]);
  assert.deepEqual([...used].sort(), Object.keys(R.BOOKS).sort(), "every referenced book is defined and every book is used");
  for (const [id, book] of Object.entries(R.BOOKS)) {
    assert.ok(book.title && book.authors, id);
    assert.match(book.language, /^[a-z]{2,3}$/, id);
    const url = new URL(book.source);
    assert.equal(url.protocol, "https:", id);
    assert.doesNotMatch(url.hostname, /annas-archive|libgen|z-lib|zlibrary|sci-hub/, id);
  }
  // Topic-wide extras are the Japanese resources for classmates.
  for (const ids of Object.values(R.TOPIC_READING)) for (const id of ids) assert.equal(R.BOOKS[id].language, "ja", id);
});

test("catalog links use the public catalog's shareable parameters", () => {
  const reading = R.forType("ag-rr", "ag");
  const entry = new URL(reading.books[0].catalog);
  assert.equal(entry.origin + entry.pathname, R.CATALOG);
  assert.equal(entry.searchParams.get("id"), reading.books[0].id);
  assert.equal(entry.hash, "#catalog");
  assert.deepEqual(reading.topicBooks.map((b) => b.id), R.TOPIC_READING.ag);
  const search = new URL(R.forType("ag-quotient", "ag").search.url);
  assert.equal(search.searchParams.get("q"), "Gröbner");
  for (const t of P.TYPES) {
    const url = new URL(R.forType(t.id, t.topic).search.url);
    for (const key of url.searchParams.keys()) assert.ok(["q", "subject", "type", "language"].includes(key), `${t.id}: ${key}`);
  }
});

const catalogPath = process.env.FORMOSA_CATALOG;
test("books and searches match the published catalog", { skip: !catalogPath && "set FORMOSA_CATALOG to check" }, () => {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const items = new Map(catalog.items.map((row) => [row.id, row]));
  const labels = new Map(catalog.subjects.map((s) => [s.id, s.label]));
  const once = (text) => {
    const [head, ...rest] = text.split(" /");
    return rest.length === 1 && head.trim() === rest[0].trim() ? head : text;
  };
  for (const [id, book] of Object.entries(R.BOOKS)) {
    const row = items.get(id);
    assert.ok(row, `${id} is not in the catalog`);
    assert.equal(book.title, row.title, id);
    assert.equal(book.authors, once(row.authors), id);
    assert.equal(book.language, row.language, id);
    assert.equal(book.source, row.source, id);
  }
  // The same matching rule as the catalog page: filters, then a case-insensitive substring.
  for (const [type, { search }] of Object.entries(R.READING)) {
    const hits = catalog.items.filter((row) => {
      if (search.subject && !row.subjects.includes(search.subject)) return false;
      if (search.type && row.type !== search.type) return false;
      if (!search.q) return true;
      const text = [row.title, row.authors, row.year, ...row.subjects.map((s) => labels.get(s))].join(" ").toLowerCase();
      return text.includes(search.q.toLowerCase());
    });
    assert.ok(hits.length >= 2, `${type}: search finds ${hits.length}`);
  }
});
