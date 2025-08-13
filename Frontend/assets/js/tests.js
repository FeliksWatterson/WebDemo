// assets/js/tests.js
document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("tests-grid");
  if (!grid) return;

  const token = localStorage.getItem("token");
  if (!token) {
    grid.innerHTML =
      '<p class="muted">Bạn chưa đăng nhập. Vui lòng đăng nhập để xem danh sách đề.</p>';
    return;
  }

  const authHeader = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  };

  let items = [];
  try {
    const res = await fetch("/api/tests", { headers: authHeader });
    const data = res.ok ? await res.json().catch(() => ({})) : null;
    items = Array.isArray(data?.items) ? data.items : [];
  } catch {}

  render(items);

  function getId(t) {
    return t?.id || t?._id || t?.testId || t?.slug || "";
  }

  // Tên hiển thị: bỏ "(5 từ)" nếu có để khỏi rối mắt (không đổi server)
  function displayName(name) {
    return String(name || "")
      .replace(/\s*\(\d+\s*từ\)\s*/gi, "")
      .trim();
  }

  // đoán số câu hỏi từ nhiều field
  function guessCount(obj) {
    if (!obj || typeof obj !== "object") return null;
    if (Array.isArray(obj.questions)) return obj.questions.length;

    const flat = [
      "questionsCount",
      "questionCount",
      "totalQuestions",
      "totalQuestion",
      "numQuestions",
      "count",
      "size",
      "len",
    ];
    for (const k of flat) {
      const v = obj[k];
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
    const nest = [obj.stats, obj.meta, obj.summary];
    for (const o of nest) {
      if (o && typeof o === "object") {
        for (const k of flat) {
          const v = o[k];
          if (typeof v === "number" && Number.isFinite(v)) return v;
        }
      }
    }
    return null;
  }

  function render(list) {
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML =
        '<p class="muted">Chưa có đề nào. Hãy tạo bộ từ ở “Học từ vựng”, hệ thống sẽ tự lưu thành đề để bạn làm lại.</p>';
      return;
    }

    list.forEach((t, idx) => {
      const id = getId(t);
      const rawName = t.name || "Bộ đề";
      const name = escapeHtml(displayName(rawName));
      const immediateCount = guessCount(t);

      const card = document.createElement("div");
      card.className = "add-choice";
      card.style.position = "relative";

      // cụm icon nhỏ góc phải
      const toolsCss =
        "position:absolute;top:10px;right:10px;display:flex;gap:6px;align-items:center";
      const iconBtnCss =
        "width:28px;height:28px;border:1px solid #ddd;border-radius:9999px;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:.85";

      card.innerHTML = `
        <div class="tools" style="${toolsCss}">
          <button class="rename-btn" title="Đổi tên" aria-label="Đổi tên" style="${iconBtnCss}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 17.25V21h3.75L20.5 7.25l-3.75-3.75L3 17.25z" stroke="#666" fill="none"></path>
              <path d="M14.06 4.56l3.75 3.75 1.9-1.9a1 1 0 000-1.42l-2.33-2.33a1 1 0 00-1.42 0l-1.9 1.9z" fill="#666"></path>
            </svg>
          </button>
          <button class="delete-btn" title="Xóa đề" aria-label="Xóa đề" style="${iconBtnCss}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 6h18M8 6l1-2h6l1 2M6 6l1.5 14h9L18 6" stroke="#666"></path>
            </svg>
          </button>
        </div>

        <h3 class="card-title" style="margin:0 0 8px 0">${name}</h3>
        <p class="card-sub muted" style="margin-bottom:12px">
          <span class="qcount" data-id="${id}">
            ${
              immediateCount == null ? "… câu hỏi" : immediateCount + " câu hỏi"
            }
          </span>
        </p>

        <button class="btn has-before" type="button">
          <span class="span">Bắt đầu ▷</span>
        </button>
      `;

      // start
      card.querySelector(".btn").addEventListener("click", () => {
        location.href = "learn.html?test=" + encodeURIComponent(id);
      });

      // Enter/Space bắt đầu
      card.tabIndex = 0;
      card.addEventListener("keypress", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          location.href = "learn.html?test=" + encodeURIComponent(id);
        }
      });

      // xóa
      card.querySelector(".delete-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm("Xóa đề này? Hành động không thể hoàn tác.")) return;
        try {
          const res = await fetch("/api/tests/" + encodeURIComponent(id), {
            method: "DELETE",
            headers: authHeader,
          });
          if (!res.ok) throw new Error();
          items.splice(idx, 1);
          render(items);
        } catch {
          alert("Xóa đề thất bại. Vui lòng thử lại.");
        }
      });

      // đổi tên
      card.querySelector(".rename-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        const current = rawName;
        const input = prompt("Đổi tên đề:", current);
        if (input == null) return;
        const newName = input.trim();
        if (!newName || newName === current.trim()) return;
        try {
          const res = await fetch("/api/tests/" + encodeURIComponent(id), {
            method: "PATCH",
            headers: authHeader,
            body: JSON.stringify({ name: newName }),
          });
          if (!res.ok) throw new Error();
          // cập nhật UI tại chỗ (ẩn '(x từ)' nếu user vẫn để)
          card.querySelector(".card-title").textContent = displayName(newName);
          // đồng bộ mảng dữ liệu để lần render sau đúng tên
          items[idx] = { ...items[idx], name: newName };
        } catch {
          alert("Đổi tên thất bại. Vui lòng thử lại.");
        }
      });

      grid.appendChild(card);

      // lazy fetch count nếu chưa có
      if (immediateCount == null && id) {
        hydrateCount(id, card.querySelector(".qcount"));
      }
    });
  }

  async function hydrateCount(id, el) {
    try {
      const res = await fetch("/api/tests/" + encodeURIComponent(id), {
        headers: authHeader,
      });
      const data = res.ok ? await res.json().catch(() => ({})) : null;
      let n = guessCount(data);
      if (n == null) n = 0;
      if (el) el.textContent = n + " câu hỏi";
    } catch {
      // giữ nguyên "… câu hỏi" nếu lỗi
    }
  }
});

function escapeHtml(s) {
  return String(s || "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}
