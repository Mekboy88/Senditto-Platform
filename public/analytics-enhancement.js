/**
 * Analytics — computed only from real workspace activity (messages, campaigns).
 */
(() => {
  const S = () => window.SendittoStore;
  function store() {
    const s = S();
    if (!s || typeof s.list !== "function") throw new Error("Platform store is still loading. Click Try again.");
    return s;
  }
  const icon = (name) => {
    const paths = {
      chart: '<path d="M4 19V9m6 10V5m6 14v-7m5 7H2"/>',
      download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16"/>',
      refresh: '<path d="M20 6v5h-5"/><path d="M18.2 15a7 7 0 1 1-.7-7.8L20 11"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
      route: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h4a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H8m0 0 3-3m-3 3 3 3"/>',
      send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
      check: '<path d="m20 6-11 11-5-5"/>',
      eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
      click: '<path d="m9 9 9 9m-9-9v7l3-3 3 7 4-2-3-7 4-1Z"/>',
      bounce: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
      monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
      phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
      globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
      shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
      trend: '<path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.chart}</svg>`;
  };

  const state = {
    range: "Last 30 days",
    stream: "All streams",
    metric: "Delivered",
    open: null,
    updated: "Waiting for data",
  };

  const number = (n) => Math.round(n).toLocaleString("en-GB");

  function inRange(iso) {
    if (!iso) return true;
    const t = new Date(iso).getTime();
    const days =
      state.range === "Last 7 days"
        ? 7
        : state.range === "Last 90 days"
          ? 90
          : state.range === "This year"
            ? 365
            : 30;
    return Date.now() - t <= days * 86400000;
  }

  function dataset() {
    let messages = store()
      .list("messages")
      .filter((m) => inRange(m.createdAt));
    if (state.stream !== "All streams") {
      messages = messages.filter((m) => (m.stream || "Transactional") === state.stream);
    }
    const sent = messages.length;
    const delivered = messages.filter((m) => /delivered|opened|clicked|queued/i.test(m.status || "")).length;
    const opened = messages.filter((m) => /opened|clicked/i.test(m.status || "")).length;
    const clicked = messages.filter((m) => /clicked/i.test(m.status || "")).length;
    const bounced = messages.filter((m) => /bounce/i.test(m.status || "")).length;
    const rates = [
      sent ? delivered / sent : 0,
      delivered || sent ? opened / (delivered || sent) : 0,
      delivered || sent ? clicked / (delivered || sent) : 0,
    ];
    return { sent, delivered, opened, clicked, bounced, rates, messages };
  }

  function campaigns() {
    return store()
      .list("campaigns")
      .filter((c) => inRange(c.createdAt))
      .map((c) => [
        c.name,
        "—",
        "—",
        "—",
        c.status || "Draft",
      ]);
  }

  function emptyChartPath() {
    return "M0 180 L650 180";
  }

  /** Real per-period series for the active metric/range/stream. */
  function chartData(messages) {
    const W = 650;
    const H = 220;
    const padT = 14;
    const padB = 16;
    const match =
      state.metric === "Opened"
        ? /opened|clicked/i
        : state.metric === "Clicked"
          ? /clicked/i
          : /delivered|opened|clicked/i;

    const now = new Date();
    const buckets = [];
    if (state.range === "This year") {
      for (let m = 0; m <= now.getMonth(); m++) {
        buckets.push({ key: `${now.getFullYear()}-${String(m + 1).padStart(2, "0")}`, label: new Date(now.getFullYear(), m, 1).toLocaleDateString(undefined, { month: "short" }), n: 0, mode: "month" });
      }
    } else {
      const days = state.range === "Last 7 days" ? 7 : state.range === "Last 90 days" ? 90 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        buckets.push({ key: d2.toISOString().slice(0, 10), label: d2.toLocaleDateString(undefined, { day: "numeric", month: "short" }), n: 0, mode: "day" });
      }
    }
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    for (const m of messages) {
      if (!match.test(m.status || "")) continue;
      const key = buckets[0].mode === "month" ? (m.createdAt || "").slice(0, 7) : (m.createdAt || "").slice(0, 10);
      if (idx[key] != null) buckets[idx[key]].n += 1;
    }

    const max = Math.max(1, ...buckets.map((b) => b.n));
    const step = buckets.length > 1 ? W / (buckets.length - 1) : W;
    const pts = buckets.map((b, i) => [i * step, padT + (H - padT - padB) * (1 - b.n / max)]);
    const cl = (y) => Math.max(padT, Math.min(H - padB, y));
    let line = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      line += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${cl(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${cl(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    const labels = ["", "", "", "", "", "", ""];
    labels[0] = buckets[0] ? buckets[0].label : "";
    labels[3] = buckets[Math.floor((buckets.length - 1) / 2)] ? buckets[Math.floor((buckets.length - 1) / 2)].label : "";
    labels[6] = buckets[buckets.length - 1] ? buckets[buckets.length - 1].label : "";
    return { line, labels };
  }

  function render() {
    const host = document.getElementById("senditto-platform-root");
    if (!host) return;
    const d = dataset();
    const chart = chartData(d.messages);
    const hasData = d.sent > 0;
    state.updated = hasData
      ? `Updated at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : "No activity yet";
    host.dataset.analyticsEnhanced = "true";
    host.dataset.route = "analytics";
    host.innerHTML = `<div class="an-page"><div class="an-head"><div><small>PERFORMANCE INTELLIGENCE</small><h1>Analytics</h1><p>Understand delivery, engagement and conversion across every email stream.</p></div><div><button data-action="export">${icon("download")} Export report</button><button data-action="refresh">${icon("refresh")} <span>Refresh</span></button></div></div>
<div class="an-toolbar"><div class="an-select"><button data-menu="range">${icon("calendar")}<span><small>Date range</small><b>${state.range}</b></span><em>⌄</em></button>${state.open === "range" ? menu(["Last 7 days", "Last 30 days", "Last 90 days", "This year"], "range") : ""}</div><div class="an-select"><button data-menu="stream">${icon("route")}<span><small>Email stream</small><b>${state.stream}</b></span><em>⌄</em></button>${state.open === "stream" ? menu(["All streams", "Transactional", "Marketing", "Automations"], "stream") : ""}</div><div class="an-live"><i></i><span><small>Data status</small><b>${state.updated}</b></span></div></div>
<div class="an-metrics">${metric("send", "Emails sent", number(d.sent), hasData ? "Live" : "—", "blue")}${metric("check", "Delivered", number(d.delivered), hasData ? (d.rates[0] * 100).toFixed(1) + "%" : "—", "green")}${metric("eye", "Opened", number(d.opened), hasData ? (d.rates[1] * 100).toFixed(1) + "%" : "—", "violet")}${metric("click", "Clicked", number(d.clicked), hasData ? (d.rates[2] * 100).toFixed(1) + "%" : "—", "orange")}${metric("bounce", "Bounced", number(d.bounced), hasData ? "Live" : "—", "red")}</div>
${
  hasData
    ? `<div class="an-main"><section class="an-card an-chart"><header><div><h2>${state.metric} over time</h2><p>${state.range} · ${state.stream}</p></div><nav>${["Delivered", "Opened", "Clicked"]
        .map((x) => `<button data-metric="${x}" class="${state.metric === x ? "active" : ""}">${x}</button>`)
        .join("")}</nav></header><div class="an-summary"><b>${number(state.metric === "Delivered" ? d.delivered : state.metric === "Opened" ? d.opened : d.clicked)}</b><span>${icon("trend")} From your workspace activity</span></div><div class="an-line"><i></i><i></i><i></i><i></i><svg viewBox="0 0 650 220" preserveAspectRatio="none"><defs><linearGradient id="anArea" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#347cf4" stop-opacity=".25"/><stop offset="1" stop-color="#347cf4" stop-opacity="0"/></linearGradient></defs><path class="area" d="${chart.line} L650 220 L0 220Z"/><path class="stroke" d="${chart.line}"/></svg><footer>${chart.labels
        .map((x) => `<span>${x}</span>`)
        .join("")}</footer></div></section><section class="an-card an-funnel"><header><div><h2>Delivery funnel</h2><p>From accepted to clicked</p></div>${icon("chart")}</header>${[
        ["Accepted", number(d.sent), "100%"],
        ["Delivered", number(d.delivered), (d.rates[0] * 100).toFixed(2) + "%"],
        ["Opened", number(d.opened), (d.rates[1] * 100).toFixed(2) + "%"],
        ["Clicked", number(d.clicked), (d.rates[2] * 100).toFixed(2) + "%"],
      ]
        .map(
          (x, i) =>
            `<button data-detail="${x.join("|")}" style="width:${100 - i * 13}%"><span>${x[0]}</span><b>${x[1]}</b><em>${x[2]}</em></button>`
        )
        .join("")}<small>Click a stage to inspect performance.</small></section></div>
<section class="an-card an-campaigns"><header><div><h2>Campaigns in range</h2><p>From your campaign library</p></div><button data-action="all-campaigns">View all campaigns ${icon("arrow")}</button></header><div class="an-table"><div><span>Campaign</span><span>Delivered</span><span>Open rate</span><span>Click rate</span><span>Status</span><span></span></div>${
        campaigns().length
          ? campaigns()
              .map(
                (x) =>
                  `<button data-detail="${x.join("|")}"><span>${icon("send")}<b>${x[0]}</b></span>${x
                    .slice(1)
                    .map((v) => `<span>${v}</span>`)
                    .join("")}${icon("arrow")}</button>`
              )
              .join("")
          : `<div style="padding:24px;color:#6b7a90">No campaigns in this period.</div>`
      }</div></section>`
    : `<section class="an-card" style="margin-top:18px;padding:40px;text-align:center"><h2 style="margin:0 0 8px">No analytics yet</h2><p style="margin:0;color:#6b7a90">Send messages or create campaigns to populate live metrics. Nothing here is demo data.</p></section>`
}
</div>`;
    bind();
  }

  function menu(items, type) {
    return `<div class="an-menu">${items
      .map(
        (x) =>
          `<button data-choice="${type}|${x}" class="${state[type] === x ? "selected" : ""}">${x}${state[type] === x ? icon("check") : ""}</button>`
      )
      .join("")}</div>`;
  }

  function metric(ic, a, b, c, k) {
    return `<button class="an-card an-metric ${state.metric === a ? "active" : ""}" data-metric="${a}"><i class="${k}">${icon(ic)}</i><span><small>${a}</small><b>${b}</b><em>${c}</em></span></button>`;
  }

  function bind() {
    const host = document.getElementById("senditto-platform-root");
    host.querySelectorAll("[data-menu]").forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        state.open = state.open === b.dataset.menu ? null : b.dataset.menu;
        render();
      };
    });
    host.querySelectorAll("[data-choice]").forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        const [k, v] = b.dataset.choice.split("|");
        state[k] = v;
        state.open = null;
        render();
      };
    });
    host.querySelectorAll("[data-metric]").forEach((b) => {
      b.onclick = () => {
        state.metric = b.dataset.metric;
        render();
      };
    });
    host.querySelectorAll("[data-detail]").forEach((b) => {
      b.onclick = () => details(b.dataset.detail.split("|"));
    });
    host.querySelector('[data-action="export"]')?.addEventListener("click", exportCsv);
    host.querySelector('[data-action="all-campaigns"]')?.addEventListener("click", allCampaigns);
    host.querySelector('[data-action="refresh"]')?.addEventListener("click", (e) => {
      const button = e.currentTarget;
      button.classList.add("loading");
      button.disabled = true;
      const span = button.querySelector("span");
      if (span) span.textContent = "Refreshing data";
      setTimeout(() => render(), 400);
    });
  }

  function exportCsv() {
    const d = dataset();
    const csv = `Selection,${state.range} / ${state.stream}\nMetric,Value\nSent,${d.sent}\nDelivered,${d.delivered}\nUnique opens,${d.opened}\nUnique clicks,${d.clicked}\nBounces,${d.bounced}`;
    const u = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = u;
    a.download = `senditto-analytics.csv`;
    a.click();
    URL.revokeObjectURL(u);
  }

  function details(x) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="an-modal"><button></button><section class="an-detail-card"><button class="an-close">${icon("close")}</button><i>${icon("chart")}</i><small>ANALYTICS DETAIL</small><h2>${x[0]}</h2><b>${x[1] || "—"}</b><p>${x.slice(2).join(" · ") || "Live workspace metric"}</p><button class="an-done">Done</button></section></div>`
    );
    const modals = document.querySelectorAll(".an-modal");
    const modal = modals[modals.length - 1];
    modal.querySelectorAll(":scope>button,.an-close,.an-done").forEach((b) => (b.onclick = () => modal.remove()));
  }

  function allCampaigns() {
    const all = store().list("campaigns");
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="an-modal an-campaign-modal"><button></button><section><button class="an-close">${icon("close")}</button><div class="campaign-modal-head"><i>${icon("send")}</i><div><small>CAMPAIGN ANALYTICS</small><h2>All campaigns</h2><p>${state.range} · ${state.stream}</p></div></div><div class="campaign-modal-summary"><span><small>Total campaigns</small><b>${all.length}</b></span><span><small>Active</small><b>${all.filter((c) => c.status === "Active").length}</b></span><span><small>Draft</small><b>${all.filter((c) => c.status === "Draft").length}</b></span></div><div class="campaign-modal-table"><header><span>Campaign</span><span>Audience</span><span>Status</span></header>${
        all.length
          ? all
              .map(
                (c) =>
                  `<button data-full-detail="${c.name}|${c.audience || "—"}|${c.status || "Draft"}"><b>${c.name}</b><span>${c.audience || "—"}</span><span>${c.status || "Draft"}</span></button>`
              )
              .join("")
          : "<p style='padding:16px'>No campaigns yet.</p>"
      }</div><footer><button class="an-done">Close</button></footer></section></div>`
    );
    const modal = document.querySelector(".an-campaign-modal");
    modal.querySelectorAll(":scope>button,.an-close,.an-done").forEach((b) => (b.onclick = () => modal.remove()));
    modal.querySelectorAll("[data-full-detail]").forEach((b) => {
      b.onclick = () => details(b.dataset.fullDetail.split("|"));
    });
  }

  
  window.SendittoUI = window.SendittoUI || {};
  window.SendittoUI.analytics = () => render();

  document.addEventListener("click", (e) => {
    if (state.open && !e.target.closest(".an-select") && document.getElementById("senditto-platform-root")?.dataset.route === "analytics") {
      state.open = null;
      render();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      state.open = null;
      const modals = document.querySelectorAll(".an-modal");
      modals[modals.length - 1]?.remove();
    }
  });
})();
