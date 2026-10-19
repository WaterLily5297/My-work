/*
 * Study planning: spaced review of mistakes, practice weighted toward weak
 * problem types, and a daily activity log. Pure functions over plain data,
 * so the browser state stays a small JSON object.
 * Works both in the browser (window.MathDrillStudy) and in Node (require).
 */
(function (root, factory) {
  const lib = factory();
  if (typeof module === "object" && module.exports) module.exports = lib;
  else root.MathDrillStudy = lib;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Days to wait after each correct review; one more correct answer after the last graduates it.
  const INTERVALS = [1, 3, 7, 16];

  // ---------- Calendar days ("YYYY-MM-DD" in local time) ----------
  const pad = (n) => String(n).padStart(2, "0");
  const dayOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  function addDays(day, n) {
    const [y, m, d] = day.split("-").map(Number);
    // Noon UTC keeps the arithmetic clear of daylight-saving changes.
    const t = new Date(Date.UTC(y, m - 1, d, 12) + n * 86400000);
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  }
  const weekday = (day) => new Date(`${day}T12:00:00Z`).getUTCDay(); // 0 = Sunday

  // ---------- Spaced review ----------
  /** A newly missed problem: due today, at the first step. */
  const missed = (type, seed, today) => ({ type, seed, step: 0, due: today });
  /** Older saved mistakes have no schedule yet; they are due now. */
  const normalise = (item, today) => ({ step: 0, due: today, ...item });
  /**
   * The item after a review. A correct answer waits INTERVALS[step] days and
   * moves up a step, or graduates (null) after the last step. A wrong answer
   * starts again and comes back tomorrow.
   */
  function reviewed(item, ok, today) {
    const step = item.step || 0;
    if (!ok) return { ...item, step: 0, due: addDays(today, 1) };
    if (step >= INTERVALS.length) return null;
    return { ...item, step: step + 1, due: addDays(today, INTERVALS[step]) };
  }
  const isDue = (item, today) => !item.due || item.due <= today;
  function reviewSummary(items, today) {
    const due = items.filter((r) => isDue(r, today));
    const later = items.filter((r) => !isDue(r, today)).map((r) => r.due).sort();
    return { due: due.length, later: later.length, next: later[0] || null };
  }

  // ---------- Practice weighted toward weak types ----------
  /** Accuracy with one success and one failure added, so a new type starts at 1/2. */
  const smoothed = (st) => ((st ? st.correct : 0) + 1) / ((st ? st.tries : 0) + 2);
  /** Untried types and types with low accuracy get up to five times the weight. */
  const weight = (st) => (!st || st.tries === 0 ? 3 : 1 + 4 * (1 - smoothed(st)));
  /** Picks from pool with these weights; random() returns a number in [0, 1). */
  function weightedPick(pool, stats, random) {
    const ws = pool.map((id) => weight(stats[id]));
    let x = random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
      x -= ws[i];
      if (x < 0) return pool[i];
    }
    return pool[pool.length - 1];
  }
  /** Tried types, weakest first; ties go to the type with more attempts. */
  function weakest(stats, ids, n) {
    return ids
      .filter((id) => stats[id] && stats[id].tries > 0)
      .map((id) => ({ id, tries: stats[id].tries, correct: stats[id].correct, score: smoothed(stats[id]) }))
      .sort((a, b) => a.score - b.score || b.tries - a.tries)
      .slice(0, n);
  }

  // ---------- Daily activity ----------
  function logged(days, today, ok) {
    const d = days[today] || { tries: 0, correct: 0 };
    return { ...days, [today]: { tries: d.tries + 1, correct: d.correct + (ok ? 1 : 0) } };
  }
  /** Columns of seven days (Sunday first), ending with the week that contains today. */
  function calendar(days, today, weeks) {
    const start = addDays(today, -weekday(today) - 7 * (weeks - 1));
    return Array.from({ length: weeks }, (_, w) =>
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(start, 7 * w + i);
        return { day, tries: day > today ? null : (days[day] || {}).tries || 0 };
      })
    );
  }
  /** Consecutive days with practice, ending today or yesterday. */
  function dayStreak(days, today) {
    let day = days[today] ? today : addDays(today, -1);
    let n = 0;
    while (days[day]) [n, day] = [n + 1, addDays(day, -1)];
    return n;
  }

  return { INTERVALS, dayOf, addDays, missed, normalise, reviewed, isDue, reviewSummary, smoothed, weight, weightedPick, weakest, logged, calendar, dayStreak };
});
