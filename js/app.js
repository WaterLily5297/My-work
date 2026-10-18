/* Math Drill — browser UI. Depends on core.js and problems.js (and KaTeX if it loaded). */
(function () {
  "use strict";
  const core = window.MathDrillCore;
  const P = window.MathDrillProblems;
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
  });

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return blank();
      const s = Object.assign(blank(), JSON.parse(raw));
      s.selected = s.selected.filter((id) => P.byId[id]);
      s.review = s.review.filter((r) => P.byId[r.type]);
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
      legend.append(lab);
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
    el.reviewCount.textContent = n;
    el.reviewEmpty.hidden = n > 0 || mode === "review";
    el.reviewStart.hidden = n === 0 || mode === "review";
    el.reviewStop.hidden = mode !== "review";
    el.modeFlag.hidden = mode !== "review";
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
    const key = (r) => r.type === current.type && r.seed === current.seed;
    if (ok && mode === "review") store.review = store.review.filter((r) => !key(r));
    if (!ok && !store.review.some(key)) store.review.push({ type: current.type, seed: current.seed });
    save();
    syncTopics();
    renderTally();
  }

  // ---------- Problem lifecycle ----------
  function pickNext() {
    if (mode === "review") {
      if (store.review.length === 0) {
        mode = "new";
      } else {
        // rotate so "Skip" moves on to the next missed problem
        const r = store.review.shift();
        store.review.push(r);
        save();
        return r;
      }
    }
    const pool = store.selected.length ? store.selected : P.TYPES.map((t) => t.id);
    let type = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && current && type === current.type) type = pool[Math.floor(Math.random() * pool.length)];
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

    el.feedback.textContent = "";
    el.hint.hidden = true;
    el.hint.innerHTML = current.hint;
    renderMath(el.hint);
    el.solution.hidden = true;
    el.steps.innerHTML = "";
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

  function showSolution() {
    el.steps.innerHTML = "";
    for (const step of current.solution) {
      const li = document.createElement("li");
      li.innerHTML = step;
      el.steps.append(li);
    }
    const li = document.createElement("li");
    li.innerHTML = `<b>Answer:</b> \\(${answerTex()}\\)${current.unordered ? " (in any order)" : ""}`;
    el.steps.append(li);
    renderMath(el.steps);
    el.solution.hidden = false;
  }

  function finish() {
    done = true;
    el.check.hidden = true;
    el.skip.hidden = true;
    el.next.hidden = false;
    el.solBtn.disabled = !el.solution.hidden;
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
    if (!scored) {
      record(res.ok);
      scored = true;
    }
    inputs.forEach((inp, i) => {
      inp.parentElement.classList.toggle("wrong", !res.perField[i]);
      inp.parentElement.classList.toggle("right", res.perField[i]);
    });
    if (res.ok) {
      setMark("check");
      el.feedback.textContent = mode === "review" ? "Correct. Removed from your mistakes." : "Correct.";
      finish();
    } else {
      setMark("cross");
      const n = res.perField.filter((x) => !x).length;
      el.feedback.textContent =
        current.answers.length > 1
          ? `Not quite: ${n} of ${current.answers.length} ${n === 1 ? "box is" : "boxes are"} wrong. Fix ${n === 1 ? "it" : "them"} and check again, or see the solution.`
          : "Not quite. Try again, or see the solution.";
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
      el.feedback.textContent = "Solution shown. This one is saved to your mistakes to try again later.";
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
    nextProblem();
  }

  // KaTeX scripts are deferred; DOMContentLoaded fires after they run.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
