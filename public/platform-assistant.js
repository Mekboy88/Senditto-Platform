/**
 * Senditto assistant — the customer-facing helper.
 *
 * A launcher in the corner of the app opens a panel that answers questions
 * about this workspace: campaign copy, subject lines, why mail is landing in
 * spam, how to verify a sending domain. The request goes to this site's own
 * /api/ai/assistant route, which attaches the session server-side, so the
 * answer is always scoped to the signed-in account.
 */
(() => {
  let panel = null;
  let busy = false;
  const thread = [];

  const SUGGESTIONS = [
    "Write a launch email for my product, with three subject lines to test.",
    "Why might my emails be landing in spam?",
    "How do I verify my sending domain?",
    "How is my sending doing so far?",
  ];

  function styles() {
    if (document.getElementById("senditto-assistant-css")) return;
    const el = document.createElement("style");
    el.id = "senditto-assistant-css";
    el.textContent = `
      .sa-launch{position:fixed;right:22px;bottom:22px;z-index:2147482000;display:flex;align-items:center;
        gap:8px;padding:12px 16px;border:0;border-radius:999px;background:#367ef5;color:#fff;font:600 14px/1
        -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;cursor:pointer;
        box-shadow:0 8px 24px rgba(54,126,245,.35)}
      .sa-launch:hover{background:#2b6ad6}
      .sa-panel{position:fixed;right:22px;bottom:84px;z-index:2147482001;width:min(400px,calc(100vw - 44px));
        height:min(560px,calc(100vh - 130px));display:flex;flex-direction:column;background:#fff;
        border:1px solid #e3e8ef;border-radius:14px;overflow:hidden;
        box-shadow:0 24px 60px rgba(16,24,40,.22);
        font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#111827}
      .sa-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;
        border-bottom:1px solid #eef2f7}
      .sa-head b{font-size:14px}
      .sa-head small{display:block;color:#6b7280;font-weight:400;font-size:12px}
      .sa-close{border:0;background:none;font-size:20px;line-height:1;color:#6b7280;cursor:pointer}
      .sa-body{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
      .sa-msg{padding:10px 12px;border-radius:10px;white-space:pre-wrap}
      .sa-you{align-self:flex-end;max-width:85%;background:#367ef5;color:#fff}
      .sa-bot{align-self:flex-start;max-width:92%;background:#f4f6fa;color:#111827}
      .sa-err{align-self:flex-start;max-width:92%;background:#fff1f0;color:#9f1239;font-size:13px}
      .sa-suggest{display:grid;gap:8px}
      .sa-suggest button{text-align:left;padding:10px 12px;border:1px solid #e3e8ef;border-radius:9px;
        background:#fff;cursor:pointer;font:inherit;font-size:13px;line-height:1.4;color:#374151}
      .sa-suggest button:hover{border-color:#367ef5;color:#111827}
      .sa-foot{display:flex;gap:8px;padding:12px;border-top:1px solid #eef2f7}
      .sa-foot input{flex:1;padding:10px 12px;border:1px solid #d8dee9;border-radius:9px;font:inherit}
      .sa-foot button{padding:10px 14px;border:0;border-radius:9px;background:#367ef5;color:#fff;
        font:600 14px/1 inherit;cursor:pointer}
      .sa-foot button:disabled{opacity:.55;cursor:default}
      @media (prefers-color-scheme:dark){
        .sa-panel{background:#161b22;border-color:#30363d;color:#e6edf3}
        .sa-head{border-color:#21262d} .sa-head small{color:#9aa4b2}
        .sa-bot{background:#21262d;color:#e6edf3}
        .sa-suggest button{background:#0d1117;border-color:#30363d;color:#adbac7}
        .sa-foot{border-color:#21262d}
        .sa-foot input{background:#0d1117;border-color:#30363d;color:#e6edf3}
      }`;
    document.head.appendChild(el);
  }

  function render() {
    const body = panel.querySelector(".sa-body");
    body.innerHTML = "";
    if (!thread.length) {
      const wrap = document.createElement("div");
      wrap.className = "sa-suggest";
      const intro = document.createElement("div");
      intro.className = "sa-msg sa-bot";
      intro.textContent =
        "Hello. I can help with your campaigns, your sending domains, and why mail does or doesn't arrive. What would you like to do?";
      body.appendChild(intro);
      for (const s of SUGGESTIONS) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = s;
        b.onclick = () => ask(s);
        wrap.appendChild(b);
      }
      body.appendChild(wrap);
    } else {
      for (const m of thread) {
        const el = document.createElement("div");
        el.className = `sa-msg ${m.role === "you" ? "sa-you" : m.role === "error" ? "sa-err" : "sa-bot"}`;
        el.textContent = m.text;
        body.appendChild(el);
      }
    }
    if (busy) {
      const el = document.createElement("div");
      el.className = "sa-msg sa-bot";
      el.textContent = "Thinking…";
      body.appendChild(el);
    }
    body.scrollTop = body.scrollHeight;
  }

  async function ask(text) {
    const q = String(text || "").trim();
    if (!q || busy) return;
    thread.push({ role: "you", text: q });
    busy = true;
    render();
    try {
      const workspaceId = window.SendittoStore?.get?.()?.selectedWorkspaceId || null;
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ question: q, workspaceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The assistant could not answer just now.");
      thread.push({ role: "bot", text: data.answer || "(no answer)" });
    } catch (e) {
      thread.push({ role: "error", text: e.message });
    } finally {
      busy = false;
      render();
    }
  }

  function open() {
    if (panel) return;
    styles();
    panel = document.createElement("div");
    panel.className = "sa-panel";
    panel.innerHTML = `
      <div class="sa-head">
        <div><b>Senditto assistant</b><small>Answers about your workspace</small></div>
        <button class="sa-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="sa-body"></div>
      <form class="sa-foot">
        <input type="text" placeholder="Ask about your campaigns, domains or delivery…" />
        <button type="submit">Ask</button>
      </form>`;
    document.body.appendChild(panel);
    panel.querySelector(".sa-close").onclick = close;
    panel.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      const input = panel.querySelector("input");
      const v = input.value;
      input.value = "";
      ask(v);
    };
    render();
  }

  function close() {
    panel?.remove();
    panel = null;
  }

  function mountLauncher() {
    if (document.querySelector(".sa-launch")) return;
    styles();
    const btn = document.createElement("button");
    btn.className = "sa-launch";
    btn.type = "button";
    btn.textContent = "✦ Ask Senditto";
    btn.onclick = () => (panel ? close() : open());
    document.body.appendChild(btn);
  }

  // Only for signed-in customers, and only once they are inside the app.
  function maybeMount() {
    if (!window.SendittoAuth?.isAuthenticated?.()) return;
    if (!document.querySelector(".dashboard-shell, [data-platform-root], .app-shell")) return;
    mountLauncher();
  }

  window.SendittoAssistant = { open, close, ask };
  window.addEventListener("senditto:signed-in", () => setTimeout(maybeMount, 1200));
  document.addEventListener("DOMContentLoaded", () => setInterval(maybeMount, 2000));
})();
