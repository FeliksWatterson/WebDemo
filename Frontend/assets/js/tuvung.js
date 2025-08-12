/* =========================================================
   tuvung.js  —  FULL FILE (đã chỉnh)
   - Nhập tay có nút Quay lại (không reset từ đầu)
   - Học: tiến độ chỉ tăng khi TRẢ LỜI ĐÚNG (loại khỏi queue)
   - Khi sai: hiện đáp án đúng (MC, viết nghĩa, viết ngược, matching)
   - Fix vụ "Enter/viết bừa vẫn đúng" → chỉ đúng tuyệt đối (chuẩn hóa)
   - Fix crash khi bấm "Làm lại câu sai" → dùng let + initLearnUI()
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // Khu chọn cách thêm từ
  // -----------------------------
  const containerTwo = document.querySelector(".add-two");
  const choices = document.querySelectorAll(".add-choice");
  const manualCard = document.getElementById("card-manual");
  const importCard = document.getElementById("card-import");
  const manualGoBtn = document.getElementById("manual-go");
  const wordCountEl = document.getElementById("word-count");
  const wordEntrySec = document.getElementById("word-entry-section");
  const fileInput = document.getElementById("file-upload");

  if (containerTwo && choices.length) {
    const activate = (type) => {
      choices.forEach((c) => c.classList.remove("active"));
      const target = type === "manual" ? manualCard : importCard;
      target?.classList.add("active");
      containerTwo.classList.add("solo");
    };
    const resetChoices = () => {
      choices.forEach((c) => c.classList.remove("active"));
      containerTwo.classList.remove("solo");
      if (wordEntrySec) wordEntrySec.innerHTML = "";
    };
    choices.forEach((card) => {
      card.addEventListener("click", (e) => {
        const tag = e.target.tagName.toLowerCase();
        if (["button", "label", "input"].includes(tag)) return;
        activate(card.dataset.type);
      });
    });
    manualGoBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const n = parseInt(wordCountEl.value, 10);
      if (n > 0) {
        activate("manual");
        createWordEntryForm(n, wordEntrySec, resetChoices);
      } else {
        alert("Vui lòng nhập số lượng từ lớn hơn 0.");
      }
    });
    fileInput?.addEventListener("change", (e) => {
      activate("import");
      handleFileUpload(e);
    });
  }

  // -----------------------------
  // Khu học từ (learn.html)
  // -----------------------------
  const learnContainer = document.getElementById("learn-container");
  if (learnContainer) {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic");
    let vocabulary = [];
    if (topic) {
      vocabulary = getPresetVocabulary(topic);
    } else {
      try {
        const raw = localStorage.getItem("userVocabulary");
        vocabulary = JSON.parse(raw || "[]");
        if (!Array.isArray(vocabulary)) throw new Error("bad-format");
      } catch (e) {
        localStorage.removeItem("userVocabulary");
        alert(
          "Bộ từ tải lên bị lỗi hoặc quá lớn. Hãy import lại (ưu tiên .txt/.json)."
        );
        vocabulary = [];
      }
    }
    if (vocabulary.length > 0) {
      startLearning(vocabulary, learnContainer);
    } else {
      learnContainer.innerHTML =
        "<h2>Không có từ vựng.</h2><p>Vui lòng quay lại và thêm bộ từ mới để bắt đầu học.</p>";
    }
  }
});

/* =========================================================
   Import file
   ========================================================= */
async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".json")) {
      const text = await file.text();
      const data = JSON.parse(text);
      return saveVocabulary(data);
    } else if (name.endsWith(".txt")) {
      const text = await file.text();
      const data = parseRawText(text);
      return saveVocabulary(data);
    } else if (name.endsWith(".pdf")) {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let all = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        all += content.items.map((it) => it.str).join(" ") + "\n";
      }
      const data = parseRawText(all);
      return saveVocabulary(data);
    } else if (name.endsWith(".docx")) {
      const buf = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      const data = parseRawText(result.value || "");
      return saveVocabulary(data);
    } else {
      alert("Định dạng chưa hỗ trợ. Chọn .txt, .json, .pdf hoặc .docx");
    }
  } catch (err) {
    console.error(err);
    alert("Lỗi xử lý file: " + (err?.message || err));
  }
}

/* =========================================================
   Parse văn bản thô thành {word, meaning}
   ========================================================= */
function parseRawText(txt) {
  const raw = String(txt || "");

  const isAsciiWord = (w) => /^[A-Za-z][A-Za-z()\/'’-]*$/.test(w);
  const hasNonAscii = (s) => /[^\x00-\x7F]/.test(s);

  const normalize = (s) =>
    s
      .replace(/\u2013|\u2014/g, "-")
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\r?\n */g, "\n")
      .trim();

  const trySplitLine = (line) => {
    let m = line.match(/^(.+?)\s*[:,\-–—\t]\s*(.+)$/);
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
  const out1 = [];
  for (const line of lines) {
    const pair = trySplitLine(line);
    if (pair) out1.push(pair);
  }
  if (out1.length >= 2) return out1;

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

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

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

/* =========================================================
   Lưu bộ từ vào localStorage
   ========================================================= */
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
  let data = cleaned.slice();
  let ok = false;
  for (const cap of [800, 600, 500, 400, 300, 200, 100]) {
    try {
      data = cleaned.slice(0, cap);
      localStorage.setItem("userVocabulary", JSON.stringify(data));
      ok = true;
      break;
    } catch (e) {}
  }
  if (!ok) {
    alert(
      "File quá lớn, không thể lưu bộ từ. Hãy chia nhỏ file rồi import lại."
    );
    return;
  }
  if (isLoggedIn()) {
    try {
      await api("/api/vocab", { method: "POST", body: { vocabulary: data } });
    } catch (e) {}
  }
  window.location.href = "learn.html";
}
function createWordEntryForm(count, container, onBack) {
  container.innerHTML = "";

  if (onBack) {
    const back = document.createElement("div");
    back.className = "back-link";
    back.innerHTML = "← Quay lại lựa chọn";
    back.addEventListener("click", () => {
      container.innerHTML = "";
      onBack?.();
    });
    container.appendChild(back);
  }

  // Header tiến độ nhập (khác tiến độ làm bài)
  const header = document.createElement("div");
  header.id = "entry-progress";
  header.style.cssText = "margin:6px 0 12px; color:#666; font-weight:600;";
  container.appendChild(header);

  const wrapper = document.createElement("div");
  wrapper.className = "entry-box";
  container.appendChild(wrapper);

  // State
  let idx = 0; // 0-based
  const words = Array.from({ length: count }, () => ({
    word: "",
    meaning: "",
  }));

  function renderHeader() {
    header.textContent = `Tiến độ nhập   ${idx + 1}/${count} (${Math.round(
      ((idx + 1) / count) * 100
    )}%)`;
  }

  function renderStep() {
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
      </div>
    `;

    const wordInput = wrapper.querySelector("#word");
    const meaningInput = wrapper.querySelector("#meaning");
    const prevBtn = wrapper.querySelector("#prev-word");
    const nextBtn = wrapper.querySelector("#next-word");

    // nạp giá trị đã nhập (nếu có)
    wordInput.value = words[idx].word || "";
    meaningInput.value = words[idx].meaning || "";

    // disable nút "Quay lại" ở bước đầu
    if (idx === 0) {
      prevBtn.disabled = true;
      prevBtn.style.opacity = "0.6";
    }

    // điều hướng enter
    wordInput.addEventListener("keydown", (e) => {
      if (e.isComposing) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        meaningInput.focus();
        meaningInput.select();
      }
    });
    meaningInput.addEventListener("keydown", (e) => {
      if (e.isComposing) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        nextBtn.click();
      }
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        prevBtn.click();
      }
    });

    const saveCurrent = () => {
      words[idx].word = wordInput.value.trim();
      words[idx].meaning = meaningInput.value.trim();
    };

    prevBtn.addEventListener("click", (e) => {
      e.preventDefault();
      saveCurrent();
      if (idx > 0) {
        idx--;
        renderStep();
      }
    });

    nextBtn.addEventListener("click", (e) => {
      e.preventDefault();
      saveCurrent();

      if (!words[idx].word || !words[idx].meaning) {
        alert("Vui lòng nhập đầy đủ cả từ và nghĩa.");
        return;
      }

      if (!isLast) {
        idx++;
        renderStep();
      } else {
        // xác nhận không còn ô trống
        for (let i = 0; i < words.length; i++) {
          if (!words[i].word || !words[i].meaning) {
            idx = i;
            renderStep();
            alert(`Bước ${i + 1} chưa điền đủ.`);
            return;
          }
        }
        localStorage.setItem("userVocabulary", JSON.stringify(words));
        window.location.href = "learn.html";
      }
    });

    // focus hợp lý
    (wordInput.value ? meaningInput : wordInput).focus();
  }

  renderStep();
}

/* =========================================================
   Preset demo
   ========================================================= */
function getPresetVocabulary(topic) {
  const presets = {
    animals: [
      { word: "Dog", meaning: "Con chó" },
      { word: "Cat", meaning: "Con mèo" },
      { word: "Elephant", meaning: "Con voi" },
      { word: "Lion", meaning: "Sư tử" },
      { word: "Tiger", meaning: "Con hổ" },
      { word: "Monkey", meaning: "Con khỉ" },
    ],
    jobs: [
      { word: "Doctor", meaning: "Bác sĩ" },
      { word: "Teacher", meaning: "Giáo viên" },
      { word: "Engineer", meaning: "Kỹ sư" },
      { word: "Singer", meaning: "Ca sĩ" },
      { word: "Artist", meaning: "Họa sĩ" },
      { word: "Chef", meaning: "Đầu bếp" },
    ],
    food: [
      { word: "Apple", meaning: "Quả táo" },
      { word: "Rice", meaning: "Cơm" },
      { word: "Water", meaning: "Nước" },
      { word: "Bread", meaning: "Bánh mì" },
      { word: "Chicken", meaning: "Thịt gà" },
      { word: "Fish", meaning: "Cá" },
    ],
    travel: [
      { word: "Airplane", meaning: "Máy bay" },
      { word: "Hotel", meaning: "Khách sạn" },
      { word: "Beach", meaning: "Bãi biển" },
      { word: "Passport", meaning: "Hộ chiếu" },
      { word: "Suitcase", meaning: "Va-li" },
      { word: "Map", meaning: "Bản đồ" },
    ],
  };
  return presets[topic] || [];
}

/* =========================================================
   Học từ (progress chỉ tăng khi đúng)
   ========================================================= */
function startLearning(vocabulary, container) {
  const original = [...vocabulary];
  let queue = [...vocabulary].sort(() => Math.random() - 0.5);

  const wrongOnce = new Set();
  let correctCount = 0;
  let wrongTotal = 0;
  const startTime = Date.now();
  let lastType = null;
  let askedCount = 0;
  const MATCH_AFTER = Math.max(5, Math.ceil(original.length * 0.35));

  // ---------- biến UI phải là let để có thể gán lại khi reset ----------
  let progressEl, qArea;

  // util: chuẩn hóa so sánh (bỏ dấu tiếng Việt, khoảng trắng thừa, lowercase)
  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const next = (delay = 900) => setTimeout(renderQuestion, delay);

  function updateProgress() {
    const done = original.length - queue.length; // chỉ tăng khi đã loại khỏi queue
    const pct = Math.round((done / original.length) * 100);
    if (!progressEl) return;
    progressEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-weight:600;color:#111;">Tiến độ làm bài</div>
        <div style="opacity:.85">${done}/${original.length} (${pct}%)</div>
      </div>
      <div style="height:8px;background:#eee;border-radius:9999px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:hsl(210,82%,45%);"></div>
      </div>
    `;
  }

  function initLearnUI() {
    container.innerHTML = `
      <div id="learn-progress" style="margin:0 0 14px;"></div>
      <div id="question-area"></div>
    `;
    progressEl = container.querySelector("#learn-progress");
    qArea = container.querySelector("#question-area");
    updateProgress();
  }

  function renderComplete() {
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
      </div>
    `;

    document.getElementById("retry-wrong")?.addEventListener("click", () => {
      const wrongList = original.filter((w) =>
        wrongOnce.has(w.word + "||" + w.meaning)
      );
      if (!wrongList.length) return;
      correctCount = 0;
      wrongTotal = 0;
      wrongOnce.clear();
      queue = shuffle(wrongList);
      initLearnUI();
      renderQuestion();
    });

    document.getElementById("retry-all")?.addEventListener("click", () => {
      correctCount = 0;
      wrongTotal = 0;
      wrongOnce.clear();
      queue = shuffle(original);
      initLearnUI();
      renderQuestion();
    });
  }

  function pickType(canMatch) {
    const types = canMatch
      ? ["multiple-choice-meaning", "writing", "writing-reverse", "matching"]
      : ["multiple-choice-meaning", "writing", "writing-reverse"];
    if (types.length === 1) return types[0];
    let t,
      tries = 0;
    do {
      t = types[Math.floor(Math.random() * types.length)];
      tries++;
    } while (t === lastType && tries < 5);
    lastType = t;
    return t;
  }

  function renderQuestion() {
    if (!queue.length) return renderComplete();

    const card = queue[0];
    const canMatch = original.length >= 4 && askedCount >= MATCH_AFTER;
    const type = pickType(canMatch);
    askedCount++;

    if (type === "multiple-choice-meaning") {
      renderMC(card);
    } else if (type === "matching") {
      renderMatching(card);
    } else if (type === "writing-reverse") {
      renderWritingReverse(card);
    } else {
      renderWriting(card);
    }
  }

  function getFourOptions(correctMeaning) {
    const unique = [...new Set(original.map((v) => v.meaning))].filter(
      (m) => m !== correctMeaning
    );
    let wrongs = shuffle(unique).slice(0, 3);
    while (wrongs.length < 3 && unique.length > 0) {
      wrongs.push(unique[Math.floor(Math.random() * unique.length)]);
      wrongs = [...new Set(wrongs)];
    }
    while (wrongs.length < 3 && original.length > 0) {
      const any = original[Math.floor(Math.random() * original.length)].meaning;
      if (any !== correctMeaning) wrongs.push(any);
    }
    return shuffle([correctMeaning, ...wrongs]).slice(0, 4);
  }

  // ------------------ MC ------------------
  function renderMC(card) {
    qArea.innerHTML = "";
    const box = document.createElement("div");
    box.className = "question-card";
    box.innerHTML = `
      <h3>Từ "<strong>${card.word}</strong>" có nghĩa là gì?</h3>
      <div class="options"></div>
      <div class="explain" style="margin-top:10px; display:none;"></div>
    `;
    const opts = box.querySelector(".options");
    const explain = box.querySelector(".explain");

    getFourOptions(card.meaning).forEach((text) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.addEventListener("click", () => {
        [...opts.children].forEach((b) => (b.disabled = true));
        if (text === card.meaning) {
          btn.classList.add("correct");
          correctCount += 1;
          queue.shift(); // chỉ khi đúng mới loại
          updateProgress();
          next(800);
        } else {
          btn.classList.add("wrong");
          [...opts.children]
            .find((b) => b.textContent === card.meaning)
            ?.classList.add("correct");
          wrongTotal += 1;
          wrongOnce.add(card.word + "||" + card.meaning);
          explain.style.display = "block";
          explain.innerHTML = `<small>Đáp án đúng: <strong>${card.meaning}</strong></small>`;
          // sai -> đẩy xuống hàng đợi
          queue.push(queue.shift());
          next(1200);
        }
      });
      opts.appendChild(btn);
    });

    qArea.appendChild(box);
  }

  // ------------------ Viết nghĩa ------------------
  function renderWriting(card) {
    qArea.innerHTML = "";
    const form = document.createElement("form");
    form.className = "question-card";
    form.innerHTML = `
      <h3>Viết nghĩa của từ "<strong>${card.word}</strong>":</h3>
      <input type="text" id="writing-answer" class="input-field input-answer" placeholder="Nhập nghĩa..." autocomplete="off" autocapitalize="none" spellcheck="false">
      <div class="question-actions">
        <button type="submit" class="btn has-before"><span class="span">Kiểm tra</span></button>
      </div>
      <div class="explain" style="margin-top:10px; display:none;"></div>
    `;
    qArea.appendChild(form);

    const input = form.querySelector("#writing-answer");
    const explain = form.querySelector(".explain");
    input.focus();

    input.addEventListener("input", () =>
      input.classList.remove("correct", "wrong")
    );
    input.addEventListener("keydown", () =>
      input.classList.remove("correct", "wrong")
    );

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = norm(input.value);
      const correct = norm(card.meaning);

      // Chỉ đúng khi bằng tuyệt đối & không rỗng
      const ok = user.length > 0 && user === correct;

      if (ok) {
        input.classList.remove("wrong");
        input.classList.add("correct");
        correctCount += 1;
        queue.shift();
        updateProgress();
        next(800);
      } else {
        input.classList.remove("correct");
        input.classList.add("wrong");
        wrongTotal += 1;
        wrongOnce.add(card.word + "||" + card.meaning);
        explain.style.display = "block";
        explain.innerHTML = `<small>Đáp án đúng: <strong>${card.meaning}</strong></small>`;
        queue.push(queue.shift());
        next(1200);
      }
    });
  }

  // ------------------ Viết ngược ------------------
  function renderWritingReverse(card) {
    qArea.innerHTML = "";
    const form = document.createElement("form");
    form.className = "question-card";
    form.innerHTML = `
      <h3>Viết từ tiếng Anh cho nghĩa "<strong>${card.meaning}</strong>":</h3>
      <input type="text" id="writing-rev-answer" class="input-field input-answer" placeholder="Nhập từ tiếng Anh..." autocomplete="off" autocapitalize="none" spellcheck="false">
      <div class="question-actions">
        <button type="submit" class="btn has-before"><span class="span">Kiểm tra</span></button>
      </div>
      <div class="explain" style="margin-top:10px; display:none;"></div>
    `;
    qArea.appendChild(form);

    const input = form.querySelector("#writing-rev-answer");
    const explain = form.querySelector(".explain");
    input.focus();

    input.addEventListener("input", () => {
      input.classList.remove("correct", "wrong");
    });
    input.addEventListener("keydown", () => {
      input.classList.remove("correct", "wrong");
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = norm(input.value);
      const correct = norm(card.word);
      const ok = user.length > 0 && user === correct;

      if (ok) {
        input.classList.remove("wrong");
        input.classList.add("correct");
        correctCount += 1;
        queue.shift();
        updateProgress();
        next(800);
      } else {
        input.classList.remove("correct");
        input.classList.add("wrong");
        wrongTotal += 1;
        wrongOnce.add(card.word + "||" + card.meaning);
        explain.style.display = "block";
        explain.innerHTML = `<small>Đáp án đúng: <strong>${card.word}</strong></small>`;
        queue.push(queue.shift());
        next(1200);
      }
    });
  }

  // ------------------ Matching ------------------
  function renderMatching(card) {
    qArea.innerHTML = "";
    const box = document.createElement("div");
    box.className = "question-card";
    box.innerHTML = `<h3>Nối từ với nghĩa đúng:</h3>`;

    const others = shuffle(original.filter((v) => v.word !== card.word)).slice(
      0,
      3
    );
    const pairs = shuffle([card, ...others]);

    const leftWords = shuffle(pairs.map((p) => p.word));
    const rightMeans = shuffle(pairs.map((p) => p.meaning));
    const mapWordToMeaning = Object.fromEntries(
      pairs.map((p) => [p.word, p.meaning])
    );

    const board = document.createElement("div");
    board.className = "match-board";
    const colL = document.createElement("div");
    const colR = document.createElement("div");
    colL.className = "match-col";
    colR.className = "match-col";

    let selectedLeft = null;
    let selectedRight = null;
    let matched = 0;

    function clearSelections() {
      [...colL.children].forEach((t) => t.classList.remove("selected"));
      [...colR.children].forEach((t) => t.classList.remove("selected"));
      selectedLeft = null;
      selectedRight = null;
    }
    function checkIfDone() {
      if (matched === pairs.length) {
        correctCount += 1;
        queue.shift();
        updateProgress();
        next(700);
      }
    }

    leftWords.forEach((w) => {
      const t = document.createElement("button");
      t.type = "button";
      t.className = "match-tile";
      t.textContent = w;
      t.addEventListener("click", () => {
        if (t.classList.contains("disabled")) return;
        [...colL.children].forEach((x) => x.classList.remove("selected"));
        t.classList.add("selected");
        selectedLeft = t;
        if (selectedRight) tryMatch();
      });
      colL.appendChild(t);
    });

    rightMeans.forEach((m) => {
      const t = document.createElement("button");
      t.type = "button";
      t.className = "match-tile";
      t.textContent = m;
      t.addEventListener("click", () => {
        if (t.classList.contains("disabled")) return;
        [...colR.children].forEach((x) => x.classList.remove("selected"));
        t.classList.add("selected");
        selectedRight = t;
        if (selectedLeft) tryMatch();
      });
      colR.appendChild(t);
    });

    function tryMatch() {
      const w = selectedLeft.textContent;
      const m = selectedRight.textContent;
      const ok = mapWordToMeaning[w] === m;

      if (ok) {
        selectedLeft.classList.remove("selected");
        selectedRight.classList.remove("selected");
        selectedLeft.classList.add("correct", "disabled");
        selectedRight.classList.add("correct", "disabled");
        matched += 1;
        clearSelections();
        checkIfDone();
      } else {
        wrongTotal += 1;
        wrongOnce.add(card.word + "||" + card.meaning);
        selectedLeft.classList.add("wrong");
        selectedRight.classList.add("wrong");

        // Hiện đáp án đúng cho cặp từ vừa chọn sai
        const ans = mapWordToMeaning[w];
        let explain = box.querySelector(".explain");
        if (!explain) {
          explain = document.createElement("div");
          explain.className = "explain";
          explain.style.marginTop = "10px";
          box.appendChild(explain);
        }
        explain.innerHTML = `<small>Đáp án đúng của "<strong>${w}</strong>": <strong>${ans}</strong></small>`;

        setTimeout(() => {
          selectedLeft.classList.remove("wrong", "selected");
          selectedRight.classList.remove("wrong", "selected");
          clearSelections();
        }, 600);
      }
    }

    board.appendChild(colL);
    board.appendChild(colR);
    box.appendChild(board);
    qArea.appendChild(box);
  }

  // bắt đầu
  initLearnUI();
  renderQuestion();
}
