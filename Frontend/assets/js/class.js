const rdMembers = document.getElementById("rd-members");
(() => {
  const API_BASE = "http://localhost:4000";

  function makeHeaders() {
    const token = localStorage.getItem("token") || "";
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    };
  }

  async function api(path, options = {}) {
    const res = await fetch(API_BASE + path, {
      ...options,
      headers: { ...makeHeaders(), ...(options.headers || {}) },
    });
    const txt = await res.text();
    let data;
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {
      data = { error: txt };
    }
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem("token");
        alert(
          data.error ||
            data.message ||
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        );
        location.href = "./auth.html#login";
        throw new Error("Unauthorized");
      }
      throw new Error(data.error || data.message || `HTTP ${res.status}`);
    }
    return data;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) {
      location.href = "./auth.html#login";
      return;
    }

    const elRooms = document.getElementById("rooms");
    const elRoomsEmpty = document.getElementById("rooms-empty");
    const elRoomName = document.getElementById("roomName");
    const elJoinCode = document.getElementById("joinCode");
    const elBtnCreate = document.getElementById("btnCreate");
    const elBtnJoin = document.getElementById("btnJoin");
    const boxDetail = document.getElementById("roomDetail");
    const rdClose = document.getElementById("rdClose");
    const rdAssignBtn = document.getElementById("rdAssignBtn");
    const rdAssignedUl = document.getElementById("rdAssignedList");
    const rdAssignUl = document.getElementById("rdAssignList");
    let currentRoomId = null;

    function li(html) {
      const x = document.createElement("li");
      x.innerHTML = html;
      return x;
    }
    function setHidden(el, v) {
      if (el) el.classList.toggle("hidden", !!v);
    }

    async function loadRooms() {
      try {
        const { items = [] } = await api("/api/rooms"); // server trả { items }
        if (!items.length) {
          if (elRooms) elRooms.innerHTML = "";
          setHidden(elRoomsEmpty, false);
          return;
        }
        setHidden(elRoomsEmpty, true);
        if (elRooms) {
          elRooms.innerHTML = "";
          items.forEach((r) => {
            const item = li(
              `<div class="room-row">
                    <div>
                    <div><b>${r.name || "(Không tên)"}</b></div>
                    <div class="muted">Mã: ${r.joinCode}</div>
                    </div>
                    <div class="room-actions">
                    <a class="btn-detail" href="room.html?id=${
                      r._id
                    }">Chi tiết</a>
                    </div>
                </div>`
            );
            item
              .querySelector(".btn-detail")
              .addEventListener("click", () => openRoom(r._id));
            elRooms.appendChild(item);
          });
        }
      } catch (e) {
        alert("Lỗi tải danh sách phòng: " + e.message);
      }
    }

    async function createRoom() {
      const name = (elRoomName?.value || "").trim();
      if (!name) return alert("Nhập tên phòng");
      try {
        await api("/api/rooms", {
          method: "POST",
          body: JSON.stringify({ name }),
        });
        elRoomName.value = "";
        await loadRooms();
      } catch (e) {
        alert(e.message);
      }
    }

    async function joinRoom() {
      const code = (elJoinCode?.value || "").trim().toUpperCase();
      if (!code) return alert("Nhập mã phòng");
      try {
        await api("/api/rooms/join", {
          method: "POST",
          body: JSON.stringify({ joinCode: code }),
        });
        elJoinCode.value = "";
        await loadRooms();
      } catch (e) {
        alert(e.message);
      }
    }

    async function openRoom(id) {
      try {
        const r = await api(`/api/rooms/${id}`);
        currentRoomId = r.id;
        rdAssignedUl.innerHTML =
          (r.assignments || [])
            .map(
              (a) =>
                `<li>${a.name}${
                  a.timeLimit ? " (" + a.timeLimit + "p)" : ""
                }</li>`
            )
            .join("") || "<li>(Chưa có)</li>";
        if (rdMembers) {
          rdMembers.innerHTML =
            (r.members || [])
              .map((m) => `<li>${m.email || m.uid}</li>`)
              .join("") || "<li>(Trống)</li>";
        }
        const tests = await api("/api/tests");
        rdAssignUl.innerHTML =
          (tests.items || [])
            .map(
              (t) =>
                `<li><label><input type="checkbox" value="${t._id}"> ${t.name}${
                  t.timeLimit ? " (" + t.timeLimit + "p)" : ""
                }</label></li>`
            )
            .join("") || "<li>(Không có danh sách đề)</li>";
        setHidden(boxDetail, false);
      } catch (e) {
        alert(e.message);
      }
    }

    async function assignTest() {
      if (!currentRoomId) return;
      const ids = Array.from(
        rdAssignUl?.querySelectorAll("input[type=checkbox]:checked") || []
      ).map((i) => i.value);
      if (!ids.length) return alert("Chọn ít nhất một đề");
      try {
        for (const testId of ids) {
          await api(`/api/rooms/${currentRoomId}/assign`, {
            method: "POST",
            body: JSON.stringify({ testId }),
          });
        }
        const r = await api(`/api/rooms/${currentRoomId}`);
        rdAssignedUl.innerHTML =
          (r.assignments || [])
            .map(
              (a) =>
                `<li>${a.name}${
                  a.timeLimit ? " (" + a.timeLimit + "p)" : ""
                }</li>`
            )
            .join("") || "<li>(Chưa có)</li>";
        alert("Đã gán đề vào phòng");
      } catch (e) {
        alert(e.message);
      }
    }

    elBtnCreate?.addEventListener("click", createRoom);
    elBtnJoin?.addEventListener("click", joinRoom);
    rdAssignBtn?.addEventListener("click", assignTest);
    rdClose?.addEventListener("click", () => setHidden(boxDetail, true));
    loadRooms();
  });
})();
