/* Math Drill — browser UI. Depends on core.js and problems.js (and KaTeX if it loaded). */
(function () {
  "use strict";
  const core = window.MathDrillCore;
  const P = window.MathDrillProblems;
  const R = window.MathDrillReading;
  const C = window.MathDrillCards;
  const S = window.MathDrillStudy;
  const STORE_KEY = "math-drill-v1";

  // ---------- Persistence (browser storage may be unavailable; the app still works) ----------
  const blank = () => ({
    stats: {},
    total: 0,
    correct: 0,
    streak: 0,
    best: 0,
    review: [],
    selected: P.TYPES.map((t) => t.id),
    days: {},
    smart: false,
  });
  const today = () => S.dayOf(new Date());
  const formatDay = (day) => new Date(`${day}T12:00:00`).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return blank();
      const s = Object.assign(blank(), JSON.parse(raw));
      s.selected = s.selected.filter((id) => P.byId[id]);
      s.review = s.review.filter((r) => P.byId[r.type]).map((r) => S.normalise(r, today()));
      return s;
    } catch {
      return blank();
    }
  }
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      /* private mode or storage blocked: progress lasts for this visit only */
    }
  }

  let store = load();
  let mode = "new"; // "new" | "review"
  let current = null;
  let scored = false; // has this problem counted toward the score yet?
  let done = false; // solved or solution shown
  let count = 0;
  let stepsShown = 0; // solution steps revealed one at a time
  let solutionFull = false;
  let reviewFinished = false;

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const el = {
    form: $("answer-form"),
    statement: $("statement"),
    fields: $("fields"),
    feedback: $("feedback"),
    check: $("check-btn"),
    next: $("next-btn"),
    hintBtn: $("hint-btn"),
    solBtn: $("solution-btn"),
    skip: $("skip-btn"),
    hint: $("hint"),
    solution: $("solution"),
    steps: $("solution-steps"),
    mark: $("mark"),
    why: $("why"),
    whyText: $("why-text"),
    reading: $("reading"),
    readingList: $("reading-list"),
    readingMore: $("reading-more"),
    no: $("problem-no"),
    type: $("problem-type"),
    modeFlag: $("mode-flag"),
    topicList: $("topic-list"),
    topicsCount: $("topics-count"),
    topicsPanel: $("topics-panel"),
    reviewEmpty: $("review-empty"),
    reviewStart: $("review-start"),
    reviewStop: $("review-stop"),
    reviewCount: $("review-count"),
    reviewLater: $("review-later"),
    smart: $("smart-mode"),
    stepBtn: $("step-btn"),
    daySummary: $("day-summary"),
    calendar: $("calendar"),
    weakEmpty: $("weak-empty"),
    weakList: $("weak-list"),
    exportBox: $("export-box"),
    exportCards: $("export-cards"),
    exportNote: $("export-note"),
  };

  // ---------- Math rendering ----------
  const DELIMS = [
    { left: "\\[", right: "\\]", display: true },
    { left: "\\(", right: "\\)", display: false },
  ];
  function renderMath(node) {
    if (window.renderMathInElement) {
      window.renderMathInElement(node, { delimiters: DELIMS, throwOnError: false });
    }
  }
  function renderTex(tex, node) {
    if (window.katex) window.katex.render(tex, node, { throwOnError: false });
    else node.textContent = tex;
  }

  // ---------- Further reading (links into the Formosa catalog) ----------
  function link(text, href) {
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = text;
    return a;
  }
  function span(text, className) {
    const s = document.createElement("span");
    s.className = className;
    s.textContent = text;
    return s;
  }
  // Returns false when there is nothing to show for this problem type.
  function renderReading() {
    el.readingList.replaceChildren();
    el.readingMore.replaceChildren();
    const reading = R && R.forType(current.type, current.topic);
    if (!reading) return false;
    for (const book of [...reading.books, ...reading.topicBooks]) {
      const li = document.createElement("li");
      li.append(link(book.title, book.source), span(` by ${book.authors}`, "by"));
      if (book.language === "ja") li.append(span("Japanese", "lang"));
      li.append(span(" · ", "entry"), link("catalog entry", book.catalog));
      el.readingList.append(li);
    }
    const q = reading.search.q;
    el.readingMore.append(link(q ? `Search the Formosa catalog for “${q}”` : "Browse more books in the Formosa catalog", reading.search.url));
    return true;
  }

  // ---------- Topic picker ----------
  function buildTopics() {
    el.topicList.innerHTML = "";
    for (const topic of P.TOPICS) {
      const types = P.TYPES.filter((t) => t.topic === topic.id);
      const fs = document.createElement("fieldset");
      fs.className = "topic-group";
      const legend = document.createElement("legend");
      const all = document.createElement("input");
      all.type = "checkbox";
      all.id = `topic-${topic.id}`;
      const lab = document.createElement("label");
      lab.className = "check";
      lab.htmlFor = all.id;
      lab.append(all, document.createTextNode(topic.name));
      const only = document.createElement("button");
      only.type = "button";
      only.className = "link only";
      only.textContent = "Only this";
      only.setAttribute("aria-label", `Practise only ${topic.name}`);
      only.addEventListener("click", () => {
        store.selected = types.map((t) => t.id);
        save();
        syncTopics();
        if (mode === "new" && current && current.topic !== topic.id) nextProblem();
      });
      legend.append(lab, only);
      fs.append(legend);

      const ul = document.createElement("ul");
      for (const t of types) {
        const li = document.createElement("li");
        const l = document.createElement("label");
        l.className = "check";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.value = t.id;
        cb.dataset.topic = topic.id;
        const score = document.createElement("span");
        score.className = "score";
        score.dataset.type = t.id;
        l.append(cb, document.createTextNode(t.name), score);
        li.append(l);
        ul.append(li);
      }
      fs.append(ul);
      el.topicList.append(fs);

      all.addEventListener("change", () => {
        const ids = types.map((t) => t.id);
        store.selected = all.checked
          ? [...new Set([...store.selected, ...ids])]
          : store.selected.filter((id) => !ids.includes(id));
        save();
        syncTopics();
        if (!current || !store.selected.includes(current.type)) maybeRefresh();
      });
    }
    el.topicList.addEventListener("change", (e) => {
      const cb = e.target;
      if (!cb.value || !P.byId[cb.value]) return;
      if (cb.checked) store.selected = [...new Set([...store.selected, cb.value])];
      else store.selected = store.selected.filter((id) => id !== cb.value);
      save();
      syncTopics();
      maybeRefresh();
    });
  }

  function syncTopics() {
    for (const topic of P.TOPICS) {
      const ids = P.TYPES.filter((t) => t.topic === topic.id).map((t) => t.id);
      const on = ids.filter((id) => store.selected.includes(id)).length;
      const all = $(`topic-${topic.id}`);
      all.checked = on === ids.length;
      all.indeterminate = on > 0 && on < ids.length;
    }
    for (const cb of el.topicList.querySelectorAll("input[value]")) {
      if (P.byId[cb.value]) cb.checked = store.selected.includes(cb.value);
    }
    for (const s of el.topicList.querySelectorAll(".score")) {
      const st = store.stats[s.dataset.type];
      s.textContent = st ? `${st.correct}/${st.tries}` : "";
      s.title = st ? `${st.correct} correct out of ${st.tries}` : "";
    }
    el.topicsCount.textContent = `(${store.selected.length} of ${P.TYPES.length})`;
  }

  // If the topic selection changed and the current problem is untouched, swap it for a matching one.
  function maybeRefresh() {
    if (mode !== "new") return;
    const untouched = !scored && !done && [...el.fields.querySelectorAll("input")].every((i) => !i.value);
    if (!current || (untouched && !store.selected.includes(current.type))) nextProblem();
  }

  // ---------- Tally & review ----------
  function renderTally() {
    $("stat-correct").textContent = store.correct;
    $("stat-total").textContent = store.total;
    $("stat-streak").textContent = store.streak;
    $("stat-best").textContent = store.best;
    const n = store.review.length;
    const { due, later, next } = S.reviewSummary(store.review, today());
    el.reviewCount.textContent = due;
    el.reviewEmpty.hidden = n > 0 || mode === "review";
    el.reviewStart.hidden = due === 0 || mode === "review";
    el.reviewStop.hidden = mode !== "review";
    el.reviewLater.hidden = later === 0 || mode === "review";
    el.reviewLater.textContent = later
      ? `${due === 0 ? "Nothing due today. " : ""}${later} more scheduled; the next comes back ${formatDay(next)}.`
      : "";
    el.modeFlag.hidden = mode !== "review";
    el.exportBox.hidden = n === 0 || !C;
    renderProgress();
  }

  // ---------- Progress: activity calendar and weakest types ----------
  const level = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4);
  function focusType(id) {
    store.selected = [id];
    mode = "new";
    save();
    syncTopics();
    nextProblem();
  }
  function renderProgress() {
    const t = today();
    const done = (store.days[t] || {}).tries || 0;
    const streak = S.dayStreak(store.days, t);
    el.daySummary.textContent = `${done} ${done === 1 ? "problem" : "problems"} today · ${streak}-day streak`;
    el.calendar.replaceChildren();
    for (const week of S.calendar(store.days, t, 8)) {
      const column = document.createElement("div");
      for (const { day, tries } of week) {
        const cell = document.createElement("span");
        cell.dataset.level = tries === null ? "future" : level(tries);
        if (tries !== null) cell.title = `${formatDay(day)}: ${tries} ${tries === 1 ? "problem" : "problems"}`;
        column.append(cell);
      }
      el.calendar.append(column);
    }
    // Only types below 80% (after smoothing) count as weak spots.
    const weak = S.weakest(store.stats, P.TYPES.map((x) => x.id), 5).filter((w) => w.score < 0.8);
    const tried = Object.values(store.stats).some((st) => st.tries > 0);
    el.weakEmpty.hidden = weak.length > 0;
    el.weakEmpty.textContent = tried
      ? "No weak spots: every type you have tried is above 80%."
      : "Answer a few problems to see where to focus.";
    el.weakList.replaceChildren(
      ...weak.map((w) => {
        const li = document.createElement("li");
        const type = P.byId[w.id];
        const name = span(type.name, "weak-name");
        const score = span(`${w.correct}/${w.tries}`, "score");
        const go = document.createElement("button");
        go.type = "button";
        go.className = "link";
        go.textContent = "Practise";
        go.setAttribute("aria-label", `Practise only ${type.name}`);
        go.addEventListener("click", () => focusType(w.id));
        li.append(name, score, go);
        return li;
      })
    );
  }

  // Saved mistakes become a Markdown note of review cards, made in the browser.
  function exportCards() {
    const date = new Date().toISOString().slice(0, 10);
    const { text, count, skipped } = C.toMarkdown(store.review, P, date);
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `math-drill-mistakes-${date}.md`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    el.exportNote.textContent = skipped
      ? `Saved the first ${count} of ${count + skipped} problems as cards (Formosa reads up to ${C.MAX_CARDS} cards per note).`
      : `Saved ${count} ${count === 1 ? "problem" : "problems"} as review cards.`;
  }

  function record(ok) {
    const st = (store.stats[current.type] ||= { tries: 0, correct: 0 });
    st.tries++;
    store.total++;
    if (ok) {
      st.correct++;
      store.correct++;
      store.streak++;
      store.best = Math.max(store.best, store.streak);
    } else {
      store.streak = 0;
    }
    const t = today();
    store.days = S.logged(store.days, t, ok);
    // Reviews move along the schedule; a new mistake is due straight away.
    const i = store.review.findIndex((r) => r.type === current.type && r.seed === current.seed);
    let outcome = null;
    if (mode === "review" && i >= 0) {
      outcome = S.reviewed(store.review[i], ok, t);
      if (outcome) store.review[i] = outcome;
      else store.review.splice(i, 1);
    } else if (!ok) {
      const item = S.missed(current.type, current.seed, t);
      if (i >= 0) store.review[i] = item;
      else store.review.push(item);
    }
    save();
    syncTopics();
    renderTally();
    return outcome;
  }

  // ---------- Problem lifecycle ----------
  function pickNext() {
    if (mode === "review") {
      const due = store.review.find((r) => S.isDue(r, today()));
      if (!due) {
        mode = "new";
        reviewFinished = true;
      } else {
        // rotate so "Skip" moves on to the next due problem
        store.review = [...store.review.filter((r) => r !== due), due];
        save();
        return due;
      }
    }
    const pool = store.selected.length ? store.selected : P.TYPES.map((t) => t.id);
    const draw = () => (store.smart ? S.weightedPick(pool, store.stats, Math.random) : pool[Math.floor(Math.random() * pool.length)]);
    let type = draw();
    if (pool.length > 1 && current && type === current.type) type = draw();
    return { type, seed: core.newSeed() };
  }

  function nextProblem() {
    const { type, seed } = pickNext();
    current = P.generate(type, seed);
    scored = false;
    done = false;
    count++;

    el.no.textContent = `No. ${count}`;
    el.type.textContent = `${current.name} (${P.TOPICS.find((t) => t.id === current.topic).name})`;
    el.statement.innerHTML = current.statement;
    renderMath(el.statement);

    el.fields.innerHTML = "";
    el.fields.className = "fields";
    el.fields.style.gridTemplateColumns = "";
    if (current.grid) {
      el.fields.classList.add("grid");
      el.fields.style.gridTemplateColumns = `repeat(${current.grid[1]}, auto)`;
    }
    current.answers.forEach((a, i) => {
      const wrap = document.createElement("label");
      wrap.className = "field";
      const lab = document.createElement("span");
      lab.className = "label";
      renderTex(`${a.label} =`, lab);
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "text";
      input.spellcheck = false;
      input.autocapitalize = "off";
      input.placeholder = i === 0 ? "e.g. -3/4" : "";
      input.setAttribute("aria-label", `Answer ${i + 1} of ${current.answers.length}`);
      input.addEventListener("input", () => wrap.classList.remove("wrong", "right"));
      wrap.append(lab, input);
      el.fields.append(wrap);
    });

    el.feedback.textContent = reviewFinished ? "No more reviews due today. Back to new problems." : "";
    reviewFinished = false;
    stepsShown = 0;
    solutionFull = false;
    el.stepBtn.disabled = false;
    el.stepBtn.textContent = "Next step";
    el.hint.hidden = true;
    el.hint.innerHTML = current.hint;
    renderMath(el.hint);
    el.solution.hidden = true;
    el.steps.innerHTML = "";
    el.why.hidden = true;
    el.whyText.innerHTML = current.why || "";
    renderMath(el.whyText);
    el.reading.hidden = true;
    el.reading.dataset.ready = renderReading() ? "yes" : "";
    setMark(null);
    el.check.hidden = false;
    el.skip.hidden = false;
    el.next.hidden = true;
    el.hintBtn.disabled = false;
    el.solBtn.disabled = false;
    renderTally();

    const first = el.fields.querySelector("input");
    // On phones, don't pop the keyboard up on page load; after that, always focus the first box.
    if (first && (count > 1 || window.matchMedia("(min-width: 821px)").matches)) first.focus({ preventScroll: true });
  }

  function setMark(kind) {
    el.mark.classList.remove("show-check", "show-cross");
    if (!kind) return;
    void el.mark.getBoundingClientRect(); // restart the drawing animation
    el.mark.classList.add(kind === "check" ? "show-check" : "show-cross");
  }

  function answerTex() {
    return current.answers.map((a) => `${a.label} = ${a.value.toTex()}`).join(",\\quad ");
  }

  /** The worked solution, ending with the answer. */
  function solutionSteps() {
    return [...current.solution, `<b>Answer:</b> \\(${answerTex()}\\)${current.unordered ? " (in any order)" : ""}`];
  }
  function appendSteps(steps) {
    for (const step of steps) {
      const li = document.createElement("li");
      li.innerHTML = step;
      el.steps.append(li);
      renderMath(li);
    }
    el.solution.hidden = false;
  }
  function showSolution() {
    appendSteps(solutionSteps().slice(stepsShown));
    stepsShown = solutionSteps().length;
    solutionFull = true;
    el.stepBtn.disabled = true;
  }
  // One step at a time; the last step is the answer, so it counts like "Show solution".
  function showNextStep() {
    const steps = solutionSteps();
    if (stepsShown >= steps.length - 1) return el.solBtn.click();
    appendSteps([steps[stepsShown]]);
    stepsShown++;
    if (stepsShown === steps.length - 1) el.stepBtn.textContent = "Show answer";
  }

  function finish() {
    done = true;
    el.why.hidden = !current.why;
    el.reading.hidden = !el.reading.dataset.ready;
    el.check.hidden = true;
    el.skip.hidden = true;
    el.next.hidden = false;
    el.solBtn.disabled = solutionFull;
    el.stepBtn.disabled = solutionFull;
    el.next.focus({ preventScroll: true });
  }

  function check() {
    if (done) return nextProblem();
    const inputs = [...el.fields.querySelectorAll("input")];
    const values = inputs.map((i) => i.value);
    if (values.every((v) => v.trim() === "")) {
      el.feedback.textContent = "Enter an answer first.";
      inputs[0].focus();
      return;
    }
    const empty = values.findIndex((v) => v.trim() === "");
    if (empty >= 0) {
      el.feedback.textContent = "Fill in every box before checking.";
      inputs[empty].focus();
      return;
    }
    const res = core.checkAnswers(current, values);
    const bad = res.unreadable.findIndex(Boolean);
    if (bad >= 0) {
      el.feedback.textContent = `“${values[bad].trim()}” isn't a number this checker can read. Use forms like 3, -2/5 or 0.125.`;
      inputs[bad].focus();
      return;
    }
    let outcome; // the review schedule after this answer, when it was the first try
    if (!scored) {
      outcome = record(res.ok);
      scored = true;
    }
    inputs.forEach((inp, i) => {
      inp.parentElement.classList.toggle("wrong", !res.perField[i]);
      inp.parentElement.classList.toggle("right", res.perField[i]);
    });
    if (res.ok) {
      setMark("check");
      el.feedback.textContent =
        mode !== "review"
          ? "Correct."
          : outcome === null
            ? "Correct. That is five in a row, so it leaves your mistakes."
            : outcome
              ? `Correct. It comes back ${formatDay(outcome.due)}.`
              : "Correct. The first try was wrong, so it comes back tomorrow.";
      finish();
    } else {
      setMark("cross");
      const n = res.perField.filter((x) => !x).length;
      el.feedback.textContent =
        current.answers.length > 1
          ? `Not quite: ${n} of ${current.answers.length} ${n === 1 ? "box is" : "boxes are"} wrong. Fix ${n === 1 ? "it" : "them"} and check again, or see the solution.`
          : "Not quite. Try again, or see the solution.";
      if (outcome && mode === "review") el.feedback.textContent += " This review counts as missed; it comes back tomorrow.";
      const firstWrong = inputs[res.perField.findIndex((x) => !x)];
      firstWrong?.focus();
      firstWrong?.select();
    }
  }

  // ---------- Events ----------
  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    check();
  });
  el.next.addEventListener("click", nextProblem);
  el.skip.addEventListener("click", nextProblem);
  el.stepBtn.addEventListener("click", showNextStep);
  el.smart.addEventListener("change", () => {
    store.smart = el.smart.checked;
    save();
  });
  el.hintBtn.addEventListener("click", () => {
    el.hint.hidden = false;
    el.hintBtn.disabled = true;
  });
  el.solBtn.addEventListener("click", () => {
    if (!scored) {
      record(false);
      scored = true;
    }
    showSolution();
    if (!done) {
      el.feedback.textContent =
        mode === "review" ? "Solution shown. It comes back tomorrow." : "Solution shown. It is now in your mistakes to revisit.";
      finish();
    }
    el.solBtn.disabled = true;
  });
  $("select-all").addEventListener("click", () => {
    store.selected = P.TYPES.map((t) => t.id);
    save();
    syncTopics();
  });
  $("reset-progress").addEventListener("click", () => {
    if (!confirm("Reset your score, streak and saved mistakes? Your topic selection is kept.")) return;
    const selected = store.selected;
    store = blank();
    store.selected = selected;
    mode = "new";
    save();
    syncTopics();
    renderTally();
  });
  el.reviewStart.addEventListener("click", () => {
    mode = "review";
    nextProblem();
  });
  el.exportCards.addEventListener("click", exportCards);
  el.reviewStop.addEventListener("click", () => {
    mode = "new";
    nextProblem();
  });

  // Handy for debugging in the console: MathDrill.current
  window.MathDrill = {
    get current() {
      return current;
    },
  };

  function start() {
    if (window.matchMedia("(max-width: 820px)").matches) el.topicsPanel.open = false;
    buildTopics();
    syncTopics();
    el.smart.checked = store.smart;
    nextProblem();
  }

  // KaTeX scripts are deferred; DOMContentLoaded fires after they run.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
