// Book exercises: references to exercises in your own books, scheduled for review.
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/exercises.js");

const TODAY = "2026-10-19";

test("exercise numbers expand lists and ranges", () => {
  assert.deepEqual(E.expandNumbers("3.1–3.4, 3.9, 12").numbers, ["3.1", "3.2", "3.3", "3.4", "3.9", "12"]);
  assert.deepEqual(E.expandNumbers("4-6; 4").numbers, ["4", "5", "6"]);
  assert.deepEqual(E.expandNumbers("II.3 - II.5").numbers, ["II.3", "II.4", "II.5"]);
  assert.deepEqual(E.expandNumbers("1.2a, 1.2b").numbers, ["1.2a", "1.2b"]);
  assert.deepEqual(E.expandNumbers("5〜7、9").numbers, ["5", "6", "7", "9"]);
  for (const bad of ["3.1-4.2", "9-3", "1-500", "", " , "]) {
    const r = E.expandNumbers(bad);
    assert.deepEqual(r.numbers, [], bad);
    assert.ok(r.error, bad);
  }
});

test("adding exercises skips ones already saved and starts them today", () => {
  const book = { title: "Algebraic Curves", catalogId: "ag-fulton-curves", section: "3.3", page: 41 };
  let r = E.addExercises([], { ...book, numbers: ["3.17", "3.18"] }, TODAY);
  assert.equal(r.added, 2);
  assert.deepEqual(r.items[0], {
    id: "id:ag-fulton-curves|3.3|3.17",
    book: { title: "Algebraic Curves", catalogId: "ag-fulton-curves" },
    section: "3.3", number: "3.17", page: 41, added: TODAY, step: 0, due: TODAY, mastered: null, log: [],
  });
  r = E.addExercises(r.items, { ...book, numbers: ["3.18", "3.19"] }, TODAY);
  assert.equal(r.added, 1);
  assert.equal(r.skipped, 1);
  const byTitle = E.addExercises([], { title: "  My Notes  ", section: "", numbers: ["1"], page: 0 }, TODAY).items[0];
  assert.equal(byTitle.id, "title:my notes||1");
  assert.equal(byTitle.page, null);
  assert.throws(() => E.addExercises([], { title: " ", numbers: ["1"] }, TODAY), /Enter the book/);
  assert.equal(E.label(r.items[0]), "§3.3 · Exercise 3.17 · p. 41");
  assert.equal(E.label(byTitle), "Exercise 1");
});

test("self-grading follows the review schedule and ends in mastery", () => {
  let [x] = E.addExercises([], { title: "Book", numbers: ["1"] }, TODAY).items;
  x = E.grade(x, false, TODAY);
  assert.equal(x.due, "2026-10-20");
  assert.ok(!E.isDue(x, TODAY));
  let day = x.due;
  for (const wait of [1, 3, 7, 16]) {
    x = E.grade(x, true, day);
    assert.equal(x.due, require("../js/study.js").addDays(day, wait));
    day = x.due;
  }
  x = E.grade(x, true, day);
  assert.equal(x.mastered, day);
  assert.equal(x.due, null);
  assert.ok(!E.isDue(x, "2099-01-01"));
  assert.equal(x.log.length, 6);
  assert.deepEqual(x.log[0], { day: TODAY, ok: false });
});

test("the queue lists due exercises oldest first, and books are summarised", () => {
  let items = E.addExercises([], { title: "B", numbers: ["2", "1"] }, "2026-10-10").items;
  items = E.addExercises(items, { title: "A", numbers: ["9"] }, "2026-10-18").items;
  items[0] = { ...items[0], due: "2026-10-25" };
  assert.deepEqual(E.dueQueue(items, TODAY).map((x) => x.number), ["1", "9"]);
  items[1] = E.grade(items[1], true, TODAY);
  const summary = E.bookSummary(items, TODAY);
  assert.deepEqual(summary.map((b) => [b.title, b.total, b.due]), [["A", 1, 1], ["B", 2, 0]]);
});

test("a backup round-trips and never overwrites saved progress", () => {
  let items = E.addExercises([], { title: "Book", section: "1", numbers: ["1", "2"], page: 3 }, TODAY).items;
  items[0] = E.grade(items[0], true, TODAY);
  const file = JSON.parse(JSON.stringify(E.backup(items, TODAY)));
  assert.equal(file.format, "math-drill-exercises");
  const fresh = E.restore([], file, TODAY);
  assert.deepEqual(fresh.items, items);
  const older = E.addExercises([], { title: "Book", section: "1", numbers: ["1"], page: 3 }, "2026-01-01").items;
  const merged = E.restore(older, file, TODAY);
  assert.equal(merged.added, 1);
  assert.equal(merged.ignored, 1);
  assert.equal(merged.items[0].added, "2026-01-01", "the saved copy wins");
});

test("restore checks every field and rejects other files", () => {
  const file = E.backup([
    { id: "x", book: { title: "T", catalogId: 5 }, number: "1", page: -2, step: 99, due: "tomorrow", added: "2026-10-01", log: [{ day: "bad" }, { day: "2026-10-02", ok: "yes" }], extra: "<script>" },
    { id: "y", book: {}, number: "1" },
    null,
  ], TODAY);
  const r = E.restore([], file, TODAY);
  assert.equal(r.added, 1);
  assert.equal(r.ignored, 2);
  assert.deepEqual(r.items[0], {
    id: "x", book: { title: "T", catalogId: null }, section: "", number: "1", page: null,
    added: "2026-10-01", step: 0, due: "2026-10-01", mastered: null, log: [{ day: "2026-10-02", ok: false }],
  });
  for (const bad of [null, [], { format: "other" }, { format: "math-drill-exercises", version: 2, items: [] }]) {
    assert.throws(() => E.restore([], bad, TODAY), /not a Math Drill exercise file/);
  }
});

test("a backup is due weekly once there are exercises", () => {
  assert.deepEqual(E.backupStatus(null, TODAY, 0), { due: false, days: null }, "nothing to lose yet");
  assert.deepEqual(E.backupStatus(null, TODAY, 3), { due: true, days: null });
  assert.deepEqual(E.backupStatus("2026-10-13", TODAY, 3), { due: false, days: 6 });
  assert.deepEqual(E.backupStatus("2026-10-12", TODAY, 3), { due: true, days: 7 });
  assert.deepEqual(E.backupStatus("2026-09-28", "2026-10-05", 1), { due: true, days: 7 }, "across a month");
  assert.deepEqual(E.backupStatus("2026-03-28", "2026-04-04", 1), { due: true, days: 7 }, "across a daylight-saving change");
});

test("a deck of licensed exercises needs its source and licence", () => {
  const deck = {
    format: "math-drill-exercise-deck",
    version: 1,
    source: { title: "Open Book", authors: "A. Author", license: "CC BY-SA 4.0", url: "https://example.org/book" },
    exercises: [
      { section: "One.I.1", number: "1.17", page: 12, text: "Solve \\(x + 1 = 2\\).", answer: "\\(x = 1\\)" },
      { number: "1.18", text: "No answer here" },
    ],
  };
  const r = E.restore([], deck, TODAY);
  assert.equal(r.added, 1);
  assert.equal(r.ignored, 1);
  const [x] = r.items;
  assert.equal(x.text, "Solve \\(x + 1 = 2\\).");
  assert.equal(x.answer, "\\(x = 1\\)");
  assert.deepEqual(x.source, deck.source);
  assert.equal(x.due, TODAY);
  for (const source of [{ ...deck.source, license: "" }, { ...deck.source, url: "http://example.org" }, undefined]) {
    assert.throws(() => E.restore([], { ...deck, source }, TODAY), /source title, licence and https link/);
  }
  // A backup keeps the deck text with its source.
  assert.deepEqual(E.restore([], E.backup(r.items, TODAY), TODAY).items, r.items);
});
