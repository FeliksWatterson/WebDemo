const Dashboard = {
  state: {
    charts: {},
    range: 30,
    targetMinutes: 60,
    logs: [], // [{date:'2025-08-26', minutes: 42}, ...]
  },

  init() {
    if (!this._hasToken()) {
      location.href = "./auth.html#login";
      return;
    }
    // UI
    const applyBtn = document.getElementById("applyBtn");
    const rangeSel = document.getElementById("rangeSel");
    const targetInp = document.getElementById("targetMinutes");
    if (rangeSel) this.state.range = parseInt(rangeSel.value, 10) || 30;
    if (targetInp)
      this.state.targetMinutes = parseInt(targetInp.value, 10) || 60;

    applyBtn?.addEventListener("click", () => {
      this.state.range = parseInt(rangeSel.value, 10) || 30;
      this.state.targetMinutes = Math.max(
        10,
        parseInt(targetInp.value, 10) || 60
      );
      localStorage.setItem("studyTarget", String(this.state.targetMinutes));
      this.render();
    });

    // load target saved
    const savedTarget = parseInt(
      localStorage.getItem("studyTarget") || "0",
      10
    );
    if (savedTarget > 0) {
      this.state.targetMinutes = savedTarget;
      if (targetInp) targetInp.value = savedTarget;
      document.getElementById("kpi-target").textContent = savedTarget + "'";
    }

    this.fetchLogs().then(() => this.render());
    // Expose helper to log minutes from anywhere:
    window.logStudyMinutes = (mins) => this._addLocalLog(mins);
  },

  async fetchLogs() {
    // 1) cố gắng lấy từ server nếu bạn đã có endpoint
    try {
      const res = await fetch(`/api/study/logs?range=${this.state.range}`, {
        headers: { "Content-Type": "application/json", ...this._authHeader() },
      });
      if (res.ok) {
        const json = await res.json(); // kỳ vọng [{date, minutes}]
        if (Array.isArray(json) && json.length) {
          this.state.logs = json;
          return;
        }
      }
    } catch (e) {
      /* ignore */
    }

    // 2) fallback: lấy từ localStorage
    const m = JSON.parse(localStorage.getItem("studyLog") || "{}");
    const days = this.state.range;
    const today = new Date();
    const arr = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = this._dateKey(d);
      arr.push({ date: key, minutes: m[key] || 0 });
    }
    this.state.logs = arr;
  },

  render() {
    this._renderKPIs();
    this._renderTimeline();
    this._renderTasksDemo();
  },

  _renderKPIs() {
    const todayKey = this._dateKey(new Date());
    const todayMins =
      this.state.logs.find((x) => x.date === todayKey)?.minutes || 0;
    const pct =
      Math.min(100, Math.round((todayMins / this.state.targetMinutes) * 100)) ||
      0;

    document.getElementById("kpi-today").textContent = `${todayMins}'`;
    document.getElementById("kpi-todayPct").textContent = `${pct}%`;
    document.getElementById(
      "kpi-target"
    ).textContent = `${this.state.targetMinutes}'`;
    document.getElementById("kpi-streak").textContent = this._calcStreak();
  },

  _renderTimeline() {
    const ctx = document.getElementById("chartTimeline");
    if (!ctx) return;

    // labels & percentages
    const labels = this.state.logs.map((x) => {
      const [y, m, d] = x.date.split("-");
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      return dt.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
    });
    const percents = this.state.logs.map((x) =>
      Math.min(100, Math.round((x.minutes / this.state.targetMinutes) * 100))
    );

    // draw/update
    if (this.state.charts.timeline) this.state.charts.timeline.destroy();
    this.state.charts.timeline = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "% đạt mục tiêu",
            data: percents,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: (v) => v + "%" },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (c) =>
                `${c.raw}% (${this.state.logs[c.dataIndex].minutes}' / ${
                  this.state.targetMinutes
                }')`,
            },
          },
        },
      },
    });
  },

  _renderTasksDemo() {
    const list = document.getElementById("taskList");
    if (!list) return;
    list.innerHTML = `
      <li>
        <div class="task-title">Ôn tập bất kỳ 30'</div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:50%"></div></div>
      </li>
      <li>
        <div class="task-title">Làm đề 30'</div>
        <div class="progress-bar"><div class="progress-bar-fill" style="width:20%"></div></div>
      </li>
    `;
  },

  /* ---------- Helpers ---------- */
  _authHeader() {
    const t = localStorage.getItem("token");
    return t ? { Authorization: "Bearer " + t } : {};
  },
  _hasToken() {
    return !!localStorage.getItem("token");
  },
  _dateKey(d) {
    return d.toISOString().slice(0, 10);
  },

  _addLocalLog(minutes) {
    // cộng dồn vào ngày hôm nay
    const key = this._dateKey(new Date());
    const map = JSON.parse(localStorage.getItem("studyLog") || "{}");
    map[key] = (map[key] || 0) + Math.max(0, Math.round(minutes));
    localStorage.setItem("studyLog", JSON.stringify(map));
    // Cập nhật ngay dashboard nếu đang mở
    this.fetchLogs().then(() => this.render());
  },

  _calcStreak() {
    // số ngày liên tiếp gần nhất đạt >= 100%
    let streak = 0;
    for (let i = this.state.logs.length - 1; i >= 0; i--) {
      const ok = this.state.logs[i].minutes >= this.state.targetMinutes;
      if (ok) streak++;
      else break;
    }
    return streak;
  },
};

document.addEventListener("DOMContentLoaded", () => Dashboard.init());
