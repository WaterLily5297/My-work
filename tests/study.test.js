// Study planning: spaced review, weighted practice and the activity calendar.
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../js/study.js");
const core = require("../js/core.js");

test("calendar days add across months, years and leap days", () => {
  assert.equal(S.addDays("2026-10-19", 1), "2026-10-20");
  assert.equal(S.addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(S.addDays("2026-12-25", 16), "2027-01-10");
  assert.equal(S.addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(S.addDays("2027-02-28", 1), "2027-03-01");
  assert.equal(S.addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(S.dayOf(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

test("a mistake comes back after 1, 3, 7 and 16 days, then graduates", () => {
  let item = S.missed("ag-rr", 5, "2026-10-19");
  assert.ok(S.isDue(item, "2026-10-19"), "due the day it was missed");
  const dues = [];
  let day = "2026-10-19";
  while (item) {
    item = S.reviewed(item, true, day);
    if (item) {
      dues.push(item.due);
      assert.ok(!S.isDue(item, day));
      day = item.due;
    }
  }
  assert.deepEqual(dues, ["2026-10-20", "2026-10-23", "2026-10-30", "2026-11-15"]);
});

test("a wrong review starts the schedule again from tomorrow", () => {
  const item = { type: "det2", seed: 1, step: 3, due: "2026-10-19" };
  assert.deepEqual(S.reviewed(item, false, "2026-10-19"), { type: "det2", seed: 1, step: 0, due: "2026-10-20" });
});

test("mistakes saved before scheduling are due now", () => {
  const old = S.normalise({ type: "det2", seed: 7 }, "2026-10-19");
  assert.deepEqual(old, { type: "det2", seed: 7, step: 0, due: "2026-10-19" });
  assert.ok(S.isDue({ type: "det2", seed: 7 }, "2026-10-19"));
  const summary = S.reviewSummary(
    [old, { type: "a", seed: 1, due: "2026-10-25" }, { type: "b", seed: 2, due: "2026-10-21" }, { type: "c", seed: 3, due: "2026-10-01" }],
    "2026-10-19"
  );
  assert.deepEqual(summary, { due: 2, later: 2, next: "2026-10-21" });
});

test("weak and untried types are picked more often, but every type stays possible", () => {
  const stats = { strong: { tries: 20, correct: 20 }, weak: { tries: 20, correct: 2 } };
  assert.ok(S.weight(stats.weak) > S.weight(stats.strong));
  assert.equal(S.weight(undefined), 3);
  const rng = core.makeRng(42);
  const counts = { strong: 0, weak: 0, fresh: 0 };
  for (let i = 0; i < 20000; i++) counts[S.weightedPick(["strong", "weak", "fresh"], stats, () => rng.next())]++;
  const total = S.weight(stats.strong) + S.weight(stats.weak) + 3;
  for (const id of ["strong", "weak", "fresh"]) {
    const expected = (20000 * (id === "fresh" ? 3 : S.weight(stats[id]))) / total;
    assert.ok(Math.abs(counts[id] - expected) < 0.05 * 20000, `${id}: ${counts[id]} vs ${expected}`);
  }
  assert.ok(counts.weak > 3 * counts.strong);
  assert.equal(S.weightedPick(["only"], {}, () => 0.999999), "only");
});

test("weakest lists tried types by smoothed accuracy", () => {
  const stats = { a: { tries: 4, correct: 4 }, b: { tries: 4, correct: 1 }, c: { tries: 1, correct: 0 }, d: { tries: 0, correct: 0 } };
  assert.deepEqual(S.weakest(stats, ["a", "b", "c", "d", "e"], 5).map((w) => w.id), ["b", "c", "a"]);
  assert.deepEqual(S.weakest(stats, ["a", "b", "c"], 1).map((w) => w.id), ["b"]);
});

test("the activity log and calendar count problems per day", () => {
  let days = {};
  days = S.logged(days, "2026-10-19", true);
  days = S.logged(days, "2026-10-19", false);
  days = S.logged(days, "2026-10-18", true);
  assert.deepEqual(days["2026-10-19"], { tries: 2, correct: 1 });
  const cal = S.calendar(days, "2026-10-19", 8); // 2026-10-19 is a Monday
  assert.equal(cal.length, 8);
  assert.ok(cal.every((week) => week.length === 7));
  const last = cal[7];
  assert.equal(last[0].day, "2026-10-18"); // the Sunday of this week
  assert.equal(last[0].tries, 1);
  assert.equal(last[1].tries, 2);
  assert.equal(last[2].tries, null, "future days are empty");
  assert.equal(cal[0][0].day, "2026-08-30");
  assert.equal(S.dayStreak(days, "2026-10-19"), 2);
  assert.equal(S.dayStreak(days, "2026-10-20"), 2, "a streak survives until the end of the next day");
  assert.equal(S.dayStreak(days, "2026-10-21"), 0);
});
