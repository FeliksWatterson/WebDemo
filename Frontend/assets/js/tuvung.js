document.addEventListener("DOMContentLoaded", () => {
  // Global state management
  const AppState = {
    timers: new Set(),
    listeners: new Set(),
    currentQuestion: null,
    isProcessing: false,

    addTimer(timer) {
      this.timers.add(timer);
      return timer;
    },

    clearTimer(timer) {
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(timer);
      }
    },

    clearAllTimers() {
      this.timers.forEach((timer) => clearTimeout(timer));
      this.timers.clear();
    },

    addListener(element, event, handler) {
      const listener = { element, event, handler };
      element.addEventListener(event, handler);
      this.listeners.add(listener);
      return listener;
    },

    cleanup() {
      this.clearAllTimers();
      this.listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      this.listeners.clear();
      this.isProcessing = false;
    },
  };

  // Utility functions
  const Utils = {
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          AppState.clearTimer(timeout);
          func(...args);
        };
        AppState.clearTimer(timeout);
        timeout = AppState.addTimer(setTimeout(later, wait));
      };
    },

    throttle(func, limit) {
      let inThrottle;
      return function (...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          AppState.addTimer(setTimeout(() => (inThrottle = false), limit));
        }
      };
    },

    normalizeText(s) {
      return (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    },

    shuffle(array) {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },

    createDOMElement(tag, className, innerHTML) {
      const el = document.createElement(tag);
      if (className) el.className = className;
      if (innerHTML) el.innerHTML = innerHTML;
      return el;
    },
  };

  // JWT and user management
  function decodeJwtPayload(token) {
    try {
      const b = token.split(".")[1];
      const s = atob(b.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  function currentUserId() {
    const t = localStorage.getItem("token");
    if (!t) return null;
    const p = decodeJwtPayload(t);
    return p?.uid || p?.sub || p?.userId || p?._id || p?.email || null;
  }

  function vocabKey() {
    const uid = currentUserId();
    return uid ? `userVocabulary:${uid}` : "userVocabulary:guest";
  }

  function readVocabCache() {
    try {
      return JSON.parse(localStorage.getItem(vocabKey()) || "[]");
    } catch {
      return [];
    }
  }

  function writeVocabCache(arr) {
    try {
      localStorage.setItem(vocabKey(), JSON.stringify(arr || []));
    } catch {}
  }

  // Migration function (run once)
  (function migrateLegacyKey() {
    try {
      const legacy = localStorage.getItem("userVocabulary");
      if (legacy) {
        localStorage.setItem(vocabKey(), legacy);
        localStorage.removeItem("userVocabulary");
      }
    } catch {}
  })();

  // Auth helpers
  const isLoggedIn = () => !!localStorage.getItem("token");
  const authHeader = () =>
    isLoggedIn()
      ? { Authorization: "Bearer " + localStorage.getItem("token") }
      : {};

  // Optimized API function
  async function apiSafe(
    path,
    { method = "GET", body } = {},
    timeoutMs = 6000
  ) {
    const ctrl = new AbortController();
    const timer = AppState.addTimer(setTimeout(() => ctrl.abort(), timeoutMs));

    try {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      return res.ok ? data : null;
    } catch {
      return null;
    } finally {
      AppState.clearTimer(timer);
    }
  }

  // DOM elements
  const containerTwo = document.querySelector(".add-two");
  const manualCard = document.getElementById("card-manual");
  const importCard = document.getElementById("card-import");
  const choices = document.querySelectorAll(".add-choice");
  const manualGoBtn = document.getElementById("manual-go");
  const wordCountEl = document.getElementById("word-count");
  const wordEntrySec = document.getElementById("word-entry-section");
  const fileInput = document.getElementById("file-upload");
  const learnContainer = document.getElementById("learn-container");

  // Initialize add vocabulary section
  if (containerTwo && choices.length) {
    const activate = (type) => {
      if (type === "myset") {
        window.location.href = "tests.html";
        return;
      }
      choices.forEach((c) => c.classList.remove("active"));
      (type === "manual" ? manualCard : importCard)?.classList.add("active");
      containerTwo.classList.add("solo");
    };

    const resetChoices = () => {
      choices.forEach((c) => c.classList.remove("active"));
      containerTwo.classList.remove("solo");
      if (wordEntrySec) wordEntrySec.innerHTML = "";
    };

    // Event handlers with cleanup
    choices.forEach((card) => {
      const handler = (e) => {
        const tag = e.target.tagName.toLowerCase();
        if (
          ["button", "label", "input"].includes(tag) &&
          card.dataset.type !== "myset"
        )
          return;
        activate(card.dataset.type);
      };
      AppState.addListener(card, "click", handler);
    });

    if (manualGoBtn) {
      const handler = (e) => {
        e.stopPropagation();
        const n = parseInt(wordCountEl.value, 10);
        if (n > 0) {
          activate("manual");
          createWordEntryForm(n, wordEntrySec, resetChoices);
        } else {
          alert("Vui lòng nhập số lượng từ lớn hơn 0.");
        }
      };
      AppState.addListener(manualGoBtn, "click", handler);
    }

    if (fileInput) {
      const handler = (e) => {
        activate("import");
        handleFileUpload(e);
      };
      AppState.addListener(fileInput, "change", handler);
    }

    mountMySetTileInAddTwo();
  }

  // Mount my test tile
  async function mountMySetTileInAddTwo() {
    if (!containerTwo) return;

    let count = 0;
    if (isLoggedIn()) {
      const data = await apiSafe("/api/tests");
      const items = Array.isArray(data?.items) ? data.items : [];
      count = items.length;
    }

    const myCard = Utils.createDOMElement("div", "add-choice");
    myCard.id = "card-myset";
    myCard.dataset.type = "myset";
    myCard.setAttribute("tabindex", "0");
    myCard.innerHTML = `
      <h3 class="card-title">Đề của bạn</h3>
      <p class="card-sub">Bạn đã tạo <strong>${count}</strong> đề. Bấm để chọn và làm.</p>`;

    const go = () => (window.location.href = "tests.html");
    AppState.addListener(myCard, "click", go);
    AppState.addListener(myCard, "keypress", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });

    containerTwo.appendChild(myCard);
  }

  // Question processing helpers
  function getCorrectIndexFromQuestion(q) {
    const ans = q?.answer ?? q?.correct ?? q?.correctAnswer ?? q?.answerIndex;
    if (typeof ans === "number") return ans;
    if (typeof ans === "string") {
      const s = ans.trim();
      const letter = s.toUpperCase();
      if (["A", "B", "C", "D"].includes(letter))
        return { A: 0, B: 1, C: 2, D: 3 }[letter];
      const i = (q.options || []).findIndex((o) => String(o).trim() === s);
      if (i >= 0) return i;
    }
    const target = String(
      q.answerText || q.correctText || q.answer || ""
    ).trim();
    if (target) {
      const i2 = (q.options || []).findIndex(
        (o) => String(o).trim() === target
      );
      if (i2 >= 0) return i2;
    }
    return null;
  }

  function getPrefetchedTest(id) {
    try {
      const raw = sessionStorage.getItem("pretest:" + id);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.data) return null;
      if (Date.now() - (obj.t || 0) > 10 * 60 * 1000) return null;
      return obj.data;
    } catch {
      return null;
    }
  }

  // Learning container initialization
  if (learnContainer) {
    (async () => {
      const qs = new URLSearchParams(location.search);
      const roomId = qs.get("room");
      const testId = qs.get("test");

      if (testId) {
        const token = localStorage.getItem("token");
        if (!token) {
          location.href = "./auth.html#login";
          return;
        }

        // Show loading
        learnContainer.innerHTML = `
          <div style="padding:24px 0">
            <div style="height:10px;background:#eee;border-radius:9999px;overflow:hidden;margin-bottom:12px">
              <div id="ldbar" style="height:100%;width:35%;background:hsl(210,82%,45%);transition:width .6s"></div>
            </div>
            <div style="color:#667">Đang tải đề…</div>
          </div>`;

        const pre = getPrefetchedTest(testId);
        let test = pre || null;

        if (!test) {
          const url = roomId
            ? `/api/rooms/${roomId}/tests/${testId}`
            : `/api/tests/${testId}`;

          try {
            const res = await fetch(url, {
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
              },
              credentials: "same-origin",
            });

            if (!res.ok) {
              const t = await res.text().catch(() => "");
              let m = "Không tải được đề.";
              try {
                const j = JSON.parse(t || "{}");
                m = j.error || j.message || m;
              } catch {}
              learnContainer.innerHTML = `<p style="color:#b00">${m}</p>`;
              return;
            }

            test = await res.json();
          } catch {
            learnContainer.innerHTML = `<p style="color:#b00">Mạng chậm hoặc máy chủ bận. Thử lại sau nhé.</p>`;
            return;
          }
        }

        // Process test questions
        const pairs = [];
        const qsArr = Array.isArray(test.questions) ? test.questions : [];
        for (const q of qsArr) {
          const word = String(q.text || q.word || "").trim();
          let meaning = "";
          const ci = getCorrectIndexFromQuestion(q);
          if (ci != null && Array.isArray(q.options) && q.options[ci] != null) {
            meaning = String(q.options[ci]).trim();
          } else {
            meaning = String(q.answerText || q.correctText || "").trim();
          }
          if (word && meaning) pairs.push({ word, meaning });
        }

        if (!pairs.length) {
          learnContainer.innerHTML = `<p>Đề này chưa có dữ liệu hợp lệ để học.</p>`;
          return;
        }

        startLearning(pairs, learnContainer);
        return;
      }

      // Load vocabulary from cache or API
      let vocabulary = readVocabCache();
      if (Array.isArray(vocabulary) && vocabulary.length) {
        startLearning(vocabulary, learnContainer);

        // Update from server in background
        if (isLoggedIn()) {
          apiSafe("/api/vocab").then((data) => {
            const arr = Array.isArray(data?.vocabulary) ? data.vocabulary : [];
            if (arr.length) {
              const normalized = arr.map((v) => ({
                word: String(v.word || "").trim(),
                meaning: String(v.meaning || "").trim(),
              }));
              writeVocabCache(normalized);
            }
          });
        }
        return;
      }

      if (!isLoggedIn()) {
        learnContainer.innerHTML =
          "<h2>Không có từ vựng.</h2><p>Vui lòng quay lại và thêm bộ từ mới để bắt đầu học.</p>";
        return;
      }

      // Load from server
      const data = await apiSafe("/api/vocab", {}, 7000);
      const arr = Array.isArray(data?.vocabulary) ? data.vocabulary : [];
      if (arr.length) {
        const normalized = arr.map((v) => ({
          word: String(v.word || "").trim(),
          meaning: String(v.meaning || "").trim(),
        }));
        writeVocabCache(normalized);
        startLearning(normalized, learnContainer);
      } else {
        learnContainer.innerHTML =
          "<h2>Không có từ vựng.</h2><p>Không tải được từ server hoặc bộ từ trống. Hãy thêm bộ mới trong mục Từ vựng.</p>";
      }
    })();
  }

  // File upload handler
  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    try {
      let data;
      if (name.endsWith(".json")) {
        const text = await file.text();
        data = JSON.parse(text);
      } else if (name.endsWith(".txt")) {
        const text = await file.text();
        data = parseRawText(text);
      } else if (name.endsWith(".pdf")) {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        let all = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          all += content.items.map((it) => it.str).join(" ") + "\n";
        }
        data = parseRawText(all);
      } else if (name.endsWith(".docx")) {
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        data = parseRawText(result.value || "");
      } else {
        alert("Định dạng chưa hỗ trợ. Chọn .txt, .json, .pdf hoặc .docx");
        return;
      }

      await saveVocabulary(data);
    } catch (err) {
      alert("Lỗi xử lý file: " + (err?.message || err));
    }
  }

  // Text parsing function (optimized)
  function parseRawText(txt) {
    const raw = String(txt || "");
    const isAsciiWord = (w) => /^[A-Za-z][A-Za-z()\/''-]*$/.test(w);
    const hasNonAscii = (s) => /[^\x00-\x7F]/.test(s);

    const normalize = (s) =>
      s
        .replace(/\u2013|\u2014/g, "-")
        .replace(/\u00A0/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/ *\r?\n */g, "\n")
        .trim();

    const trySplitLine = (line) => {
      let m = line.match(/^(.+?)\s*[:,\-—–\t]\s*(.+)$/);
      if (m) return { word: m[1].trim(), meaning: m[2].trim() };

      const tokens = line.split(/\s+/);
      const idx = tokens.findIndex((t) => hasNonAscii(t) && t.length > 0);
      if (idx > 0) {
        const left = tokens.slice(0, idx).join(" ").trim();
        const right = tokens.slice(idx).join(" ").trim();
        if (left && right) return { word: left, meaning: right };
      }
      return null;
    };

    const text = normalize(raw);
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    // Try line-by-line parsing first
    const out1 = [];
    for (const line of lines) {
      const pair = trySplitLine(line);
      if (pair) out1.push(pair);
    }
    if (out1.length >= 2) return out1;

    // Fallback to token-based parsing
    const tokens = text.split(/\s+/).filter(Boolean);
    const out2 = [];
    let mode = "ENG";
    let bufENG = [];
    let bufVI = [];

    const flush = () => {
      const w = bufENG.join(" ").trim();
      const v = bufVI.join(" ").trim();
      if (w && v) out2.push({ word: w, meaning: v });
      bufENG = [];
      bufVI = [];
    };

    for (const t of tokens) {
      if (mode === "ENG") {
        if (hasNonAscii(t)) {
          if (bufENG.length) {
            bufVI.push(t);
            mode = "VI";
          }
        } else {
          bufENG.push(t);
        }
      } else {
        if (!hasNonAscii(t) && isAsciiWord(t) && /^[A-Z]/.test(t)) {
          flush();
          bufENG.push(t);
          mode = "ENG";
        } else {
          bufVI.push(t);
        }
      }
    }
    flush();

    const clean = out2.filter(
      (p) => p.word && p.meaning && p.meaning.split(/\s+/).length <= 12
    );
    return clean.length ? clean : out1;
  }

  // Test builder
  function buildTestFromPairs(pairs, nameHint = "") {
    const pick = (arr, n) => Utils.shuffle(arr).slice(0, n);
    const meanings = [
      ...new Set(pairs.map((p) => String(p.meaning || "").trim())),
    ].filter(Boolean);

    const questions = pairs.map((p) => {
      const correct = String(p.meaning || "").trim();
      let distractors = meanings.filter((m) => m && m !== correct);
      distractors = pick(distractors, 3);

      while (distractors.length < 3 && meanings.length) {
        const any = meanings[Math.floor(Math.random() * meanings.length)];
        if (any && any !== correct && !distractors.includes(any)) {
          distractors.push(any);
        } else break;
      }

      const opts = pick([correct, ...distractors], 4);
      const idx = Math.max(0, opts.indexOf(correct));
      const letter = "ABCD"[idx] || "A";

      return {
        text: String(p.word || "").trim(),
        options: opts,
        answer: letter,
      };
    });

    const name =
      nameHint?.trim() || `Bộ đề ${new Date().toLocaleString("vi-VN")}`;
    return { name, timeLimit: 0, questions };
  }

  // Save vocabulary function
  async function saveVocabulary(vocabulary) {
    if (!Array.isArray(vocabulary)) {
      alert("Dữ liệu không hợp lệ.");
      return;
    }

    const cleaned = [];
    const seen = new Set();

    for (const it of vocabulary) {
      const w = String(it?.word || "").trim();
      const m = String(it?.meaning || "").trim();
      if (!w || !m) continue;

      const k = (w + "||" + m).toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      cleaned.push({ word: w, meaning: m });
    }

    if (!cleaned.length) {
      alert(
        "Không đọc được cặp từ hợp lệ.\nMỗi dòng nên là: english: tiếng Việt"
      );
      return;
    }

    // Try to save with different caps to avoid quota issues
    let data = cleaned.slice();
    let ok = false;
    for (const cap of [800, 600, 500, 400, 300, 200, 100]) {
      try {
        data = cleaned.slice(0, cap);
        writeVocabCache(data);
        ok = true;
        break;
      } catch {}
    }

    if (!ok) {
      alert(
        "File quá lớn, không thể lưu bộ từ. Hãy chia nhỏ file rồi import lại."
      );
      return;
    }

    // Save to server if logged in
    if (isLoggedIn()) {
      try {
        await apiSafe("/api/vocab", {
          method: "POST",
          body: { vocabulary: data },
        });
      } catch {}

      try {
        const payload = buildTestFromPairs(data);
        await apiSafe("/api/tests", { method: "POST", body: payload });
      } catch {}
    }

    window.location.href = "tests.html";
  }

  // Word entry form (optimized)
  function createWordEntryForm(count, container, onBack) {
    // Clean up previous state
    AppState.cleanup();
    container.innerHTML = "";

    if (onBack) {
      const back = Utils.createDOMElement(
        "div",
        "back-link",
        "← Quay lại lựa chọn"
      );
      back.style.cssText =
        "cursor:pointer;margin-bottom:10px;color:#246;font-weight:600";
      AppState.addListener(back, "click", () => {
        AppState.cleanup();
        container.innerHTML = "";
        onBack?.();
      });
      container.appendChild(back);
    }

    const header = Utils.createDOMElement("div");
    header.id = "entry-progress";
    header.style.cssText = "margin:6px 0 12px; color:#666; font-weight:600;";
    container.appendChild(header);

    const wrapper = Utils.createDOMElement("div", "entry-box");
    container.appendChild(wrapper);

    let idx = 0;
    const words = Array.from({ length: count }, () => ({
      word: "",
      meaning: "",
    }));

    const renderHeader = () => {
      header.textContent = `Tiến độ nhập ${idx + 1}/${count} (${Math.round(
        ((idx + 1) / count) * 100
      )}%)`;
    };

    const renderStep = () => {
      const isLast = idx === count - 1;
      renderHeader();

      wrapper.innerHTML = `
        <h4 style="margin-bottom:10px">Từ ${idx + 1} / ${count}</h4>
        <input type="text" id="word" class="input-field" placeholder="Nhập từ vựng (tiếng Anh)" autocomplete="off" autocapitalize="none" spellcheck="false" />
        <input type="text" id="meaning" class="input-field" placeholder="Nhập nghĩa (tiếng Việt)" autocomplete="off" autocapitalize="none" spellcheck="false" />
        <div style="display:flex; gap:10px; margin-top:10px;">
          <button id="prev-word" class="btn has-before" style="flex:1; justify-content:center">Quay lại</button>
          <button id="next-word" class="btn has-before" style="flex:1; justify-content:center">${
            isLast ? "Hoàn tất" : "Tiếp theo"
          }</button>
        </div>`;

      const wordInput = wrapper.querySelector("#word");
      const meaningInput = wrapper.querySelector("#meaning");
      const prevBtn = wrapper.querySelector("#prev-word");
      const nextBtn = wrapper.querySelector("#next-word");

      wordInput.value = words[idx].word || "";
      meaningInput.value = words[idx].meaning || "";

      if (idx === 0) {
        prevBtn.disabled = true;
        prevBtn.style.opacity = "0.6";
      }

      const saveCurrent = () => {
        words[idx].word = wordInput.value.trim();
        words[idx].meaning = meaningInput.value.trim();
      };

      // Event handlers
      const wordKeyHandler = (e) => {
        if (e.isComposing) return;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          meaningInput.focus();
          meaningInput.select();
        }
      };

      const meaningKeyHandler = (e) => {
        if (e.isComposing) return;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          nextBtn.click();
        }
        if (e.key === "Enter" && e.shiftKey) {
          e.preventDefault();
          prevBtn.click();
        }
      };

      const prevHandler = (e) => {
        e.preventDefault();
        if (AppState.isProcessing) return;
        saveCurrent();
        if (idx > 0) {
          idx--;
          renderStep();
        }
      };

      const nextHandler = (e) => {
        e.preventDefault();
        if (AppState.isProcessing) return;
        AppState.isProcessing = true;

        saveCurrent();
        if (!words[idx].word || !words[idx].meaning) {
          alert("Vui lòng nhập đầy đủ cả từ và nghĩa.");
          AppState.isProcessing = false;
          return;
        }

        if (!isLast) {
          idx++;
          AppState.isProcessing = false;
          renderStep();
        } else {
          // Final validation
          for (let i = 0; i < words.length; i++) {
            if (!words[i].word || !words[i].meaning) {
              idx = i;
              AppState.isProcessing = false;
              renderStep();
              alert(`Bước ${i + 1} chưa điền đủ.`);
              return;
            }
          }
          saveVocabulary(words);
        }
      };

      // Add event listeners
      AppState.addListener(wordInput, "keydown", wordKeyHandler);
      AppState.addListener(meaningInput, "keydown", meaningKeyHandler);
      AppState.addListener(prevBtn, "click", prevHandler);
      AppState.addListener(nextBtn, "click", nextHandler);

      // Focus appropriate field
      (wordInput.value ? meaningInput : wordInput).focus();
    };

    renderStep();
  }

  // Learning system (heavily optimized)
  function startLearning(vocabulary, container) {
    // Clean up previous state
    AppState.cleanup();

    const original = [...vocabulary];
    let queue = Utils.shuffle([...vocabulary]);
    const wrongOnce = new Set();
    let correctCount = 0;
    let wrongTotal = 0;
    const startTime = Date.now();
    let lastType = null;
    let askedCount = 0;
    let progressEl, qArea;

    const LearningState = {
      isComplete: false,
      currentCard: null,
    };

    const updateProgress = Utils.throttle(() => {
      if (!progressEl || LearningState.isComplete) return;
      const done = original.length - queue.length;
      const pct = Math.round((done / original.length) * 100);

      progressEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="font-weight:600;color:#111;">Tiến độ làm bài</div>
          <div style="opacity:.85">${done}/${original.length} (${pct}%)</div>
        </div>
        <div style="height:8px;background:#eee;border-radius:9999px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:hsl(210,82%,45%);transition:width 0.3s ease;"></div>
        </div>`;
    }, 100);

    const initLearnUI = () => {
      container.innerHTML = `<div id="learn-progress" style="margin:0 0 14px;"></div><div id="question-area"></div>`;
      progressEl = container.querySelector("#learn-progress");
      qArea = container.querySelector("#question-area");
      updateProgress();
    };

    const renderComplete = () => {
      LearningState.isComplete = true;
      AppState.clearAllTimers();

      const spent = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const pct = Math.round((correctCount / original.length) * 100);
      const wrongCount = wrongOnce.size;

      container.innerHTML = `
        <div class="complete-card">
          <div class="emoji">🎉</div>
          <h3 class="title">Chúc mừng! Bạn đã hoàn thành bài học.</h3>
          <p class="sub">Tiếp tục luyện tập mỗi ngày để nhớ lâu hơn nhé.</p>
          <div class="stats">
            <div class="stat"><span>${
              original.length
            }</span><small>Tổng số từ</small></div>
            <div class="stat"><span>${correctCount}</span><small>Trả lời đúng</small></div>
            <div class="stat"><span>${wrongCount}</span><small>Câu sai (ít nhất 1 lần)</small></div>
            <div class="stat"><span>${wrongTotal}</span><small>Lần trả lời sai</small></div>
            <div class="stat"><span>${pct}%</span><small>Độ chính xác</small></div>
            <div class="stat"><span>${spent}s</span><small>Thời gian</small></div>
          </div>
          <div class="actions">
            ${
              wrongCount > 0
                ? `<button id="retry-wrong" class="btn has-before">Làm lại câu sai</button>`
                : ""
            }
            <button id="retry-all" class="btn outline">Luyện lại toàn bộ</button>
            <a class="btn outline" href="tuvung.html">Quay lại chọn chủ đề</a>
          </div>
        </div>`;

      // Add retry handlers
      const retryWrong = document.getElementById("retry-wrong");
      const retryAll = document.getElementById("retry-all");

      if (retryWrong) {
        AppState.addListener(retryWrong, "click", () => {
          const wrongList = original.filter((w) =>
            wrongOnce.has(w.word + "||" + w.meaning)
          );
          if (!wrongList.length) return;
          restartLearning(wrongList);
        });
      }

      if (retryAll) {
        AppState.addListener(retryAll, "click", () => {
          restartLearning(original);
        });
      }
    };

    const restartLearning = (newVocabulary) => {
      AppState.cleanup();
      LearningState.isComplete = false;
      correctCount = 0;
      wrongTotal = 0;
      wrongOnce.clear();
      queue = Utils.shuffle(newVocabulary);
      lastType = null;
      askedCount = 0;
      initLearnUI();
      scheduleNextQuestion();
    };

    const pickType = (canMatch) => {
      const types = canMatch
        ? ["multiple-choice-meaning", "writing", "writing-reverse", "matching"]
        : ["multiple-choice-meaning", "writing", "writing-reverse"];

      if (types.length === 1) return types[0];

      let attempts = 0;
      let selectedType;

      do {
        selectedType = types[Math.floor(Math.random() * types.length)];
        attempts++;
      } while (selectedType === lastType && attempts < 5);

      lastType = selectedType;
      return selectedType;
    };

    const scheduleNextQuestion = Utils.debounce(() => {
      if (LearningState.isComplete || AppState.isProcessing) return;
      renderQuestion();
    }, 50);

    const renderQuestion = () => {
      try {
        if (!queue.length) {
          renderComplete();
          return;
        }

        if (AppState.isProcessing) return;

        AppState.isProcessing = false;
        LearningState.currentCard = queue[0];

        const canMatch =
          original.length >= 4 &&
          askedCount >= Math.max(5, Math.ceil(original.length * 0.35));

        const type = pickType(canMatch);
        askedCount++;

        // Clear previous question
        if (qArea) qArea.innerHTML = "";

        switch (type) {
          case "multiple-choice-meaning":
            renderMC(LearningState.currentCard);
            break;
          case "matching":
            renderMatching(LearningState.currentCard);
            break;
          case "writing-reverse":
            renderWritingReverse(LearningState.currentCard);
            break;
          default:
            renderWriting(LearningState.currentCard);
        }
      } catch (error) {
        console.warn("Question render error:", error);
        if (queue.length) {
          queue.push(queue.shift());
          const timer = AppState.addTimer(
            setTimeout(scheduleNextQuestion, 300)
          );
        }
      }
    };

    const handleAnswer = (isCorrect, card = LearningState.currentCard) => {
      if (AppState.isProcessing) return;
      AppState.isProcessing = true;

      if (isCorrect) {
        correctCount++;
        queue.shift();
        updateProgress();
        const timer = AppState.addTimer(
          setTimeout(() => {
            AppState.isProcessing = false;
            scheduleNextQuestion();
          }, 700)
        );
      } else {
        wrongTotal++;
        wrongOnce.add(card.word + "||" + card.meaning);
        queue.push(queue.shift());
        const timer = AppState.addTimer(
          setTimeout(() => {
            AppState.isProcessing = false;
            scheduleNextQuestion();
          }, 1100)
        );
      }
    };

    const getFourOptions = (correctMeaning) => {
      const unique = [...new Set(original.map((v) => v.meaning))].filter(
        (m) => m !== correctMeaning
      );
      let wrongs = Utils.shuffle(unique).slice(0, 3);

      while (wrongs.length < 3 && unique.length > 0) {
        const randomChoice = unique[Math.floor(Math.random() * unique.length)];
        if (!wrongs.includes(randomChoice)) {
          wrongs.push(randomChoice);
        } else {
          break;
        }
      }

      return Utils.shuffle([correctMeaning, ...wrongs]).slice(0, 4);
    };

    const renderMC = (card) => {
      const box = Utils.createDOMElement("div", "question-card");
      box.innerHTML = `
        <h3>Từ "<strong>${card.word}</strong>" có nghĩa là gì?</h3>
        <div class="options"></div>
        <div class="explain" style="margin-top:10px; display:none;"></div>`;

      const opts = box.querySelector(".options");
      const explain = box.querySelector(".explain");

      getFourOptions(card.meaning).forEach((text) => {
        const btn = Utils.createDOMElement("button");
        btn.textContent = text;

        const clickHandler = () => {
          if (AppState.isProcessing) return;

          // Disable all buttons
          [...opts.children].forEach((b) => (b.disabled = true));

          const isCorrect = text === card.meaning;

          if (isCorrect) {
            btn.classList.add("correct");
          } else {
            btn.classList.add("wrong");
            [...opts.children]
              .find((b) => b.textContent === card.meaning)
              ?.classList.add("correct");
            explain.style.display = "block";
            explain.innerHTML = `<small>Đáp án đúng: <strong>${card.meaning}</strong></small>`;
          }

          handleAnswer(isCorrect, card);
        };

        AppState.addListener(btn, "click", clickHandler);
        opts.appendChild(btn);
      });

      qArea.innerHTML = "";
      qArea.appendChild(box);
    };

    const renderWriting = (card) => {
      const form = Utils.createDOMElement("form", "question-card");
      form.innerHTML = `
        <h3>Viết nghĩa của từ "<strong>${card.word}</strong>":</h3>
        <input type="text" id="writing-answer" class="input-field input-answer" placeholder="Nhập nghĩa..." autocomplete="off" autocapitalize="none" spellcheck="false">
        <div class="question-actions"><button type="submit" class="btn has-before"><span class="span">Kiểm tra</span></button></div>
        <div class="explain" style="margin-top:10px; display:none;"></div>`;

      const input = form.querySelector("#writing-answer");
      const explain = form.querySelector(".explain");

      const inputHandler = () => input.classList.remove("correct", "wrong");
      AppState.addListener(input, "input", inputHandler);
      AppState.addListener(input, "keydown", inputHandler);

      const submitHandler = (e) => {
        e.preventDefault();
        if (AppState.isProcessing) return;

        const userAnswer = Utils.normalizeText(input.value);
        const correctAnswer = Utils.normalizeText(card.meaning);
        const isCorrect = userAnswer.length > 0 && userAnswer === correctAnswer;

        if (isCorrect) {
          input.classList.add("correct");
        } else {
          input.classList.add("wrong");
          explain.style.display = "block";
          explain.innerHTML = `<small>Đáp án đúng: <strong>${card.meaning}</strong></small>`;
        }

        handleAnswer(isCorrect, card);
      };

      AppState.addListener(form, "submit", submitHandler);

      qArea.innerHTML = "";
      qArea.appendChild(form);
      input.focus();
    };

    const renderWritingReverse = (card) => {
      const form = Utils.createDOMElement("form", "question-card");
      form.innerHTML = `
        <h3>Viết từ tiếng Anh cho nghĩa "<strong>${card.meaning}</strong>":</h3>
        <input type="text" id="writing-rev-answer" class="input-field input-answer" placeholder="Nhập từ tiếng Anh..." autocomplete="off" autocapitalize="none" spellcheck="false">
        <div class="question-actions"><button type="submit" class="btn has-before"><span class="span">Kiểm tra</span></button></div>
        <div class="explain" style="margin-top:10px; display:none;"></div>`;

      const input = form.querySelector("#writing-rev-answer");
      const explain = form.querySelector(".explain");

      const inputHandler = () => input.classList.remove("correct", "wrong");
      AppState.addListener(input, "input", inputHandler);
      AppState.addListener(input, "keydown", inputHandler);

      const submitHandler = (e) => {
        e.preventDefault();
        if (AppState.isProcessing) return;

        const userAnswer = Utils.normalizeText(input.value);
        const correctAnswer = Utils.normalizeText(card.word);
        const isCorrect = userAnswer.length > 0 && userAnswer === correctAnswer;

        if (isCorrect) {
          input.classList.add("correct");
        } else {
          input.classList.add("wrong");
          explain.style.display = "block";
          explain.innerHTML = `<small>Đáp án đúng: <strong>${card.word}</strong></small>`;
        }

        handleAnswer(isCorrect, card);
      };

      AppState.addListener(form, "submit", submitHandler);

      qArea.innerHTML = "";
      qArea.appendChild(form);
      input.focus();
    };

    const renderMatching = (card) => {
      const box = Utils.createDOMElement("div", "question-card");
      box.innerHTML = `<h3>Nối từ với nghĩa đúng:</h3>`;

      const others = Utils.shuffle(
        original.filter((v) => v.word !== card.word)
      ).slice(0, 3);
      const pairs = Utils.shuffle([card, ...others]);

      const leftWords = Utils.shuffle(pairs.map((p) => p.word));
      const rightMeans = Utils.shuffle(pairs.map((p) => p.meaning));
      const mapWordToMeaning = Object.fromEntries(
        pairs.map((p) => [p.word, p.meaning])
      );

      const board = Utils.createDOMElement("div", "match-board");
      const colL = Utils.createDOMElement("div", "match-col");
      const colR = Utils.createDOMElement("div", "match-col");

      let selectedLeft = null;
      let selectedRight = null;
      let matched = 0;
      let processingMatch = false;

      const clearSelections = () => {
        [...colL.children].forEach((t) => t.classList.remove("selected"));
        [...colR.children].forEach((t) => t.classList.remove("selected"));
        selectedLeft = null;
        selectedRight = null;
      };

      const tryMatch = () => {
        if (processingMatch) return;
        processingMatch = true;

        const w = selectedLeft.textContent;
        const m = selectedRight.textContent;
        const isCorrect = mapWordToMeaning[w] === m;

        if (isCorrect) {
          selectedLeft.classList.remove("selected");
          selectedRight.classList.remove("selected");
          selectedLeft.classList.add("correct", "disabled");
          selectedRight.classList.add("correct", "disabled");
          matched++;
          clearSelections();
          processingMatch = false;

          if (matched === pairs.length) {
            handleAnswer(true, card);
          }
        } else {
          wrongTotal++;
          wrongOnce.add(card.word + "||" + card.meaning);
          selectedLeft.classList.add("wrong");
          selectedRight.classList.add("wrong");

          let explain = box.querySelector(".explain");
          if (!explain) {
            explain = Utils.createDOMElement("div", "explain");
            explain.style.marginTop = "10px";
            box.appendChild(explain);
          }
          explain.innerHTML = `<small>Đáp án đúng của "<strong>${w}</strong>": <strong>${mapWordToMeaning[w]}</strong></small>`;

          const timer = AppState.addTimer(
            setTimeout(() => {
              selectedLeft.classList.remove("wrong", "selected");
              selectedRight.classList.remove("wrong", "selected");
              clearSelections();
              processingMatch = false;
            }, 550)
          );
        }
      };

      leftWords.forEach((w) => {
        const tile = Utils.createDOMElement("button", "match-tile");
        tile.type = "button";
        tile.textContent = w;

        AppState.addListener(tile, "click", () => {
          if (AppState.isProcessing || processingMatch) return;
          if (tile.classList.contains("disabled")) return;

          [...colL.children].forEach((x) => x.classList.remove("selected"));
          tile.classList.add("selected");
          selectedLeft = tile;
          if (selectedRight) tryMatch();
        });

        colL.appendChild(tile);
      });

      rightMeans.forEach((m) => {
        const tile = Utils.createDOMElement("button", "match-tile");
        tile.type = "button";
        tile.textContent = m;

        AppState.addListener(tile, "click", () => {
          if (AppState.isProcessing || processingMatch) return;
          if (tile.classList.contains("disabled")) return;

          [...colR.children].forEach((x) => x.classList.remove("selected"));
          tile.classList.add("selected");
          selectedRight = tile;
          if (selectedLeft) tryMatch();
        });

        colR.appendChild(tile);
      });

      board.appendChild(colL);
      board.appendChild(colR);
      box.appendChild(board);

      qArea.innerHTML = "";
      qArea.appendChild(box);
    };

    // Initialize and start
    initLearnUI();
    scheduleNextQuestion();
  }

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    AppState.cleanup();
  });
});
