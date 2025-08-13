(() => {
  const token = localStorage.getItem("token");
  if (!token) {
    location.href = "./auth.html#login";
    return;
  }

  function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    };
  }
  async function api(p, o = {}) {
    const r = await fetch(p, {
      ...o,
      headers: { ...headers(), ...(o.headers || {}) },
    });
    const t = await r.text();
    let d = {};
    try {
      d = t ? JSON.parse(t) : {};
    } catch {}
    if (!r.ok) throw new Error(d.error || d.message || `HTTP ${r.status}`);
    return d;
  }
  function uid() {
    try {
      const b = token.split(".")[1];
      return JSON.parse(atob(b.replace(/-/g, "+").replace(/_/g, "/"))).uid;
    } catch {
      return null;
    }
  }
  function esc(s) {
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

  // Elements
  const elCode = document.getElementById("join-code");
  const elRoomTitle = document.getElementById("room-title");
  const wrapMembers = document.getElementById("members-wrap");
  const ulMembers = document.getElementById("members");
  const ulTests = document.getElementById("tests");
  const btnAssign = document.getElementById("assign-btn");
  const btnDelete = document.getElementById("delete-btn");
  const grid = document.getElementById("assigned");
  const emptyNote = document.getElementById("assigned-empty");

  // Modal
  const modal = document.getElementById("room-actions-modal");
  const openActionsBtn = document.getElementById("open-room-actions");
  const closeEls = Array.from(
    document.querySelectorAll("#room-actions-modal [data-close]")
  );

  const q = new URLSearchParams(location.search);
  const roomId = q.get("id");
  if (!roomId) {
    location.href = "./class.html";
    return;
  }

  let currentRoom = null;

  function openModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }
  closeEls.forEach((el) => el.addEventListener("click", closeModal));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Card đề: giống trang tests
  function card(test, hue, room) {
    const id = test._id || test.id;
    const title = esc(test.name || "Bài kiểm tra");
    const count = Array.isArray(test.questions)
      ? test.questions.length
      : test.qCount || null;
    return `
      <div class="add-choice">
        <h3 class="card-title" style="margin:0 0 6px">${title}</h3>
        <p class="card-sub"><span class="qcount">${
          count == null ? "… câu hỏi" : count + " câu hỏi"
        }</span></p>
        <a class="btn has-before" href="./learn.html?room=${
          room.id
        }&test=${id}"><span class="span">Bắt đầu</span></a>
      </div>
    `;
  }

  async function populateTestsList(room) {
    if (!ulTests) return;
    const tests = await api("/api/tests");
    const assignedIds = new Set(
      (room.assignments || []).map((a) => String(a.testId))
    );
    ulTests.innerHTML =
      (tests.items || [])
        .filter((x) => !assignedIds.has(String(x._id)))
        .map((x) => {
          const time = x.timeLimit ? ` (${x.timeLimit}p)` : "";
          return `<li><label><input type="checkbox" value="${x._id}"> ${esc(
            x.name
          )}${time}</label></li>`;
        })
        .join("") || "<li>(Chưa có đề khả dụng)</li>";
  }

  async function loadRoom() {
    const room = await api(`/api/rooms/${roomId}`);
    currentRoom = room;

    if (elCode) elCode.textContent = room.joinCode || "";
    if (elRoomTitle)
      elRoomTitle.textContent = room.name ? `Phòng: ${room.name}` : "";

    // Members
    if (Array.isArray(room.members) && room.members.length) {
      if (wrapMembers) wrapMembers.style.display = "";
      if (ulMembers) {
        ulMembers.innerHTML = room.members
          .map((m) => {
            const owner =
              String(m.uid) === String(room.owner)
                ? ' <span style="opacity:.7">(chủ phòng)</span>'
                : "";
            return `<li>${esc(m.email || m.uid || m.name)}${owner}</li>`;
          })
          .join("");
      }
    } else {
      if (wrapMembers) wrapMembers.style.display = "none";
    }
    try {
      document.getElementById("stat-members").textContent =
        (room.members?.length || 0) + " thành viên";
    } catch {}

    const assigned = Array.isArray(room.assignments) ? room.assignments : [];
    let metas = [];
    if (!assigned.length) {
      if (grid) grid.innerHTML = "";
      if (emptyNote) emptyNote.style.display = "";
    } else {
      if (emptyNote) emptyNote.style.display = "none";
      for (const a of assigned) {
        try {
          metas.push(await api(`/api/tests/${a.testId}`));
        } catch {
          metas.push({
            _id: a.testId,
            name: a.name || "Bài kiểm tra",
            timeLimit: a.timeLimit || 0,
            questions: [],
          });
        }
      }
      if (grid) grid.innerHTML = metas.map((t, i) => card(t, i, room)).join("");
    }
    try {
      document.getElementById("stat-assign").textContent = metas.length + " đề";
    } catch {}

    // Quyền chủ phòng → thấy nút bút chì & xoá phòng; người thường → ẩn
    const owner = String(room.owner) === String(uid());
    if (openActionsBtn) openActionsBtn.style.display = owner ? "" : "none";
    if (btnDelete) btnDelete.style.display = owner ? "" : "none";
  }

  // Mở modal khi ấn bút chì (và nạp danh sách đề lúc mở)
  openActionsBtn?.addEventListener("click", async () => {
    await populateTestsList(currentRoom || {});
    openModal();
  });

  // Gán đề
  btnAssign?.addEventListener("click", async () => {
    const ids = Array.from(
      ulTests.querySelectorAll('input[type="checkbox"]:checked')
    ).map((i) => i.value);
    if (!ids.length) {
      alert("Chọn ít nhất một đề");
      return;
    }
    for (const testId of ids) {
      await api(`/api/rooms/${roomId}/assign`, {
        method: "POST",
        body: JSON.stringify({ testId }),
      });
    }
    await loadRoom();
    closeModal();
    alert("Đã gán đề");
  });

  // Xoá phòng
  btnDelete?.addEventListener("click", async () => {
    if (!confirm("Xoá phòng này?")) return;
    await api(`/api/rooms/${roomId}`, { method: "DELETE" });
    location.href = "./class.html";
  });

  // Copy mã tham gia
  const copyBtn = document.getElementById("copy-code");
  copyBtn?.addEventListener("click", () => {
    const code = elCode?.textContent?.trim();
    if (!code) return;
    navigator.clipboard?.writeText(code).then(
      () => alert("Đã sao chép mã tham gia"),
      () => alert("Không thể sao chép, hãy bôi đen và copy thủ công.")
    );
  });

  loadRoom().catch((e) => alert(e.message || "Lỗi tải phòng"));
})();
