/* Math Drill — book exercises page. Depends on reading.js, study.js and exercises.js. */
(function () {
  "use strict";
  const R = window.MathDrillReading;
  const S = window.MathDrillStudy;
  const E = window.MathDrillExercises;
  const KEY = "math-drill-exercises-v1";
  const DRILL_KEY = "math-drill-v1"; // shares the daily activity log with the problems page

  const $ = (id) => document.getElementById(id);
  const today = () => S.dayOf(new Date());
  const formatDay = (day) => new Date(`${day}T12:00:00`).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });

  // ---------- Persistence (browser storage may be unavailable; the page still works) ----------
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "null");
      return data ? E.restore([], data, today()).items : [];
    } catch {
      return [];
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(E.backup(items, today())));
    } catch {
      /* private mode or storage blocked: exercises last for this visit only */
    }
  }
  function logActivity(ok) {
    try {
      const drill = JSON.parse(localStorage.getItem(DRILL_KEY) || "{}");
      drill.days = S.logged(drill.days || {}, today(), ok);
      localStorage.setItem(DRILL_KEY, JSON.stringify(drill));
    } catch {
      /* the activity calendar is a convenience */
    }
  }

  let items = load();
  let current = null;
  let skipped = new Set(); // skipped this visit, so Skip moves on

  // ---------- Book titles from the Formosa catalog ----------
  const catalogByLabel = new Map();
  const optionLabel = (row) => `${row.title} — ${row.authors}`.slice(0, 200);
  async function loadCatalog() {
    try {
      const response = await fetch(R.CATALOG + "catalog.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("unavailable");
      const data = await response.json();
      const list = $("catalog-books");
      for (const row of data.items) {
        const label = optionLabel(row);
        if (catalogByLabel.has(label)) continue;
        catalogByLabel.set(label, row);
        const option = document.createElement("option");
        option.value = label;
        list.append(option);
      }
      $("catalog-status").textContent = `Suggestions come from the Formosa catalog (${catalogByLabel.size} titles). Any other title works too.`;
    } catch {
      $("catalog-status").textContent = "Type the book's title.";
    }
  }

  // ---------- Adding ----------
  $("add-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const typed = $("add-book").value.trim();
    const row = catalogByLabel.get(typed);
    const { numbers, error } = E.expandNumbers($("add-numbers").value);
    if (error) {
      $("add-status").textContent = error;
      $("add-numbers").focus();
      return;
    }
    const page = Number($("add-page").value);
    try {
      const result = E.addExercises(
        items,
        { title: row ? row.title : typed, catalogId: row ? row.id : null, section: $("add-section").value, numbers, page: Number.isInteger(page) && page > 0 ? page : null },
        today()
      );
      items = result.items;
      save();
      $("add-status").textContent = `Added ${result.added} ${result.added === 1 ? "exercise" : "exercises"}${result.skipped ? ` (${result.skipped} already saved)` : ""}. They are due today.`;
      $("add-numbers").value = "";
      $("add-page").value = "";
      render();
    } catch (e) {
      $("add-status").textContent = e.message;
    }
  });

  // ---------- Book list ----------
  function renderBooks() {
    const books = E.bookSummary(items, today());
    $("books-empty").hidden = books.length > 0;
    $("book-list").replaceChildren(
      ...books.map((b) => {
        const li = document.createElement("li");
        const title = document.createElement(b.catalogId ? "a" : "span");
        title.className = "book-title";
        title.textContent = b.title;
        if (b.catalogId) {
          title.href = R.catalogUrl({ id: b.catalogId });
          title.target = "_blank";
          title.rel = "noopener noreferrer";
          title.title = "Open in the Formosa catalog";
        }
        const counts = document.createElement("span");
        counts.className = "score";
        counts.textContent = `${b.due} due · ${b.mastered}/${b.total} mastered`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "link";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove all exercises from ${b.title}`);
        remove.addEventListener("click", () => {
          if (!confirm(`Remove all ${b.total} exercises from "${b.title}", with their history?`)) return;
          items = items.filter((x) => E.bookKey(x.book) !== b.key);
          save();
          render();
        });
        li.append(title, counts, remove);
        return li;
      })
    );
  }

  // ---------- The card ----------
  function renderMath(node) {
    if (window.renderMathInElement) {
      window.renderMathInElement(node, {
        delimiters: [
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false },
        ],
        throwOnError: false,
      });
    }
  }
  function showCard() {
    const queue = E.dueQueue(items, today());
    const waiting = queue.filter((x) => !skipped.has(x.id));
    current = waiting[0] || queue[0] || null;
    $("queue-count").textContent = `${queue.length} due today`;
    $("card").hidden = !current;
    $("queue-empty").hidden = Boolean(current);
    if (!current) {
      const upcoming = items.filter((x) => !x.mastered && x.due).map((x) => x.due).sort()[0];
      $("card-book").textContent = "";
      $("queue-empty-text").textContent = !items.length
        ? "Add exercises from a book you are reading. They are due straight away."
        : upcoming
          ? `Nothing due today. The next exercise comes back ${formatDay(upcoming)}.`
          : "Every exercise is mastered. Add more when you are ready.";
      return;
    }
    $("card-book").textContent = current.book.title;
    $("card-number").textContent = `Exercise ${current.number}`;
    const meta = $("card-meta");
    meta.replaceChildren([current.section && `§${current.section}`, current.page && `p. ${current.page}`].filter(Boolean).join(" · "));
    if (current.book.catalogId) {
      const link = document.createElement("a");
      link.href = R.catalogUrl({ id: current.book.catalogId });
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open the book in the catalog";
      meta.append(meta.textContent ? " · " : "", link);
    }
    const hasText = typeof current.text === "string";
    $("card-text").hidden = !hasText;
    $("card-text").textContent = hasText ? current.text : "";
    if (hasText) renderMath($("card-text"));
    $("card-instructions").textContent = hasText
      ? "Work it out on paper, then compare with the book's answer and mark how it went."
      : "Open the book at this exercise, work it out on paper, then mark how it went.";
    const log = current.log || [];
    const last = log[log.length - 1];
    $("card-history").textContent = last
      ? `Tried ${log.length} ${log.length === 1 ? "time" : "times"}; last on ${formatDay(last.day)}: ${last.ok ? "solved" : "not yet"}.`
      : "First try.";
    $("show-answer").hidden = !hasText;
    $("answer").hidden = true;
    $("card-feedback").textContent = "";
  }

  function gradeCurrent(ok) {
    if (!current) return;
    const graded = E.grade(current, ok, today());
    items = items.map((x) => (x.id === graded.id ? graded : x));
    save();
    logActivity(ok);
    const message = graded.mastered
      ? `Mastered: Exercise ${graded.number} leaves the queue.`
      : `Exercise ${graded.number} comes back ${formatDay(graded.due)}.`;
    render();
    $("card-feedback").textContent = message;
  }

  $("solved").addEventListener("click", () => gradeCurrent(true));
  $("not-yet").addEventListener("click", () => gradeCurrent(false));
  $("skip").addEventListener("click", () => {
    if (!current) return;
    skipped.add(current.id);
    if (E.dueQueue(items, today()).every((x) => skipped.has(x.id))) skipped = new Set();
    showCard();
  });
  $("remove").addEventListener("click", () => {
    if (!current || !confirm(`Remove Exercise ${current.number} from "${current.book.title}", with its history?`)) return;
    items = items.filter((x) => x.id !== current.id);
    save();
    render();
  });
  $("show-answer").addEventListener("click", () => {
    $("answer-text").textContent = current.answer;
    renderMath($("answer-text"));
    const s = current.source;
    const source = $("answer-source");
    source.replaceChildren(`From ${s.title}${s.authors ? ` by ${s.authors}` : ""}, shared under ${s.license}. `);
    const link = document.createElement("a");
    link.href = s.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Source";
    source.append(link);
    $("answer").hidden = false;
  });

  // Single-key shortcuts for the review card, except while typing in a field.
  const SHORTCUTS = { s: "solved", n: "not-yet", a: "show-answer", k: "skip" };
  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.target.closest("input, textarea, select, [contenteditable]")) return;
    const button = $(SHORTCUTS[event.key.toLowerCase()] || "");
    if (!button || $("card").hidden || button.hidden || button.disabled) return;
    event.preventDefault();
    button.click();
  });

  // ---------- Backup ----------
  $("backup").addEventListener("click", () => {
    const day = today();
    const url = URL.createObjectURL(new Blob([JSON.stringify(E.backup(items, day), null, 1)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `math-drill-exercises-${day}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $("backup-status").textContent = `Saved ${items.length} ${items.length === 1 ? "exercise" : "exercises"}.`;
  });
  $("restore").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("The file is larger than 5 MB.");
      const result = E.restore(items, JSON.parse(await file.text()), today());
      items = result.items;
      save();
      render();
      $("backup-status").textContent = `Added ${result.added} ${result.added === 1 ? "exercise" : "exercises"}${result.ignored ? `; ${result.ignored} already saved or unreadable were skipped` : ""}.`;
    } catch (e) {
      $("backup-status").textContent = e instanceof SyntaxError ? "This file is not valid JSON." : e.message;
    }
  });

  function render() {
    renderBooks();
    showCard();
  }

  function start() {
    render();
    loadCatalog();
  }
  // KaTeX scripts are deferred; DOMContentLoaded fires after they run.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
