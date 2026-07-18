/**
 * Send email v2 helpers — advanced settings only.
 * Visual / rich / HTML modes are owned by send-email-enhancement.js
 * so this file no longer rewrites the composer DOM (that caused broken UI).
 */
(() => {
  const icon = (n) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${
      n === "settings"
        ? '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.4 6A7 7 0 0 0 8.8 7L6.4 6 4.5 9.5 6.6 11a7 7 0 0 0 0 2L4.5 14.5 6.4 18l2.4-1a7 7 0 0 0 1.6 1l.3 2.6h4L15 18a7 7 0 0 0 1.6-1l2.4 1 2-3.5-2.1-1.5a7 7 0 0 0 .1-1Z"/>'
        : '<path d="m6 6 12 12M18 6 6 18"/>'
    }</svg>`;

  function page() {
    const h = document.getElementById("senditto-platform-root");
    return h?.dataset.sendEnhanced === "true" ? h : null;
  }

  function notice(t) {
    document.querySelector(".se-toast")?.remove();
    document.body.insertAdjacentHTML("beforeend", `<div class="se-toast">✓ ${t}</div>`);
    setTimeout(() => document.querySelector(".se-toast")?.remove(), 1800);
  }

  function settings() {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="se-modal se-v2-settings"><button class="se-backdrop" data-v2-close></button><section class="se-dialog"><button class="se-close" data-v2-close>${icon("close")}</button><div class="se-modal-icon">${icon("settings")}</div><h2>Advanced message settings</h2><p>Control routing, delivery behaviour and metadata for this message.</p><div class="se-provider-row"><button type="button" class="se-provider active"><b>Balanced</b><small>Recommended routing</small></button><button type="button" class="se-provider"><b>Fastest</b><small>Lowest latency</small></button><button type="button" class="se-provider"><b>Economy</b><small>Batch optimised</small></button></div><div class="se-advanced-grid"><label>Priority<select class="se-input"><option>Normal</option><option>High</option><option>Low</option></select></label><label>Sending region<select class="se-input"><option>Automatic</option><option>Europe</option><option>North America</option><option>Asia Pacific</option></select></label><label>Message tag<input class="se-input" value="" placeholder="e.g. onboarding"></label><label>Custom metadata<input class="se-input" placeholder="customer_id: 1234"></label><label class="full">Webhook event group<select class="se-input"><option>Default events</option><option>Delivery only</option><option>Engagement events</option></select></label></div><div class="se-modal-actions"><button type="button" class="se-btn" data-v2-close>Cancel</button><button type="button" class="se-btn primary" data-v2-save>Save settings</button></div></section></div>`
    );
    const m = document.querySelector(".se-v2-settings");
    m.querySelectorAll("[data-v2-close]").forEach((x) => (x.onclick = () => m.remove()));
    m.querySelectorAll(".se-provider").forEach((x) => {
      x.onclick = () => {
        m.querySelectorAll(".se-provider").forEach((y) => y.classList.remove("active"));
        x.classList.add("active");
      };
    });
    m.querySelector("[data-v2-save]").onclick = () => {
      m.remove();
      notice("Advanced settings saved");
    };
  }

  function enhanceSideSettings() {
    const h = page();
    if (!h) return;
    const sideIcon = h.querySelector(".se-side-head > span");
    if (sideIcon && !h.querySelector("[data-v2-settings]")) {
      sideIcon.outerHTML = `<button type="button" class="se-settings-button" data-v2-settings aria-label="Open advanced message settings">${icon("settings")}</button>`;
    }
  }

  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest("[data-v2-settings]")) {
        e.preventDefault();
        settings();
      }
    },
    true
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelector(".se-v2-settings")?.remove();
  });

  const root = document.getElementById("root");
  if (root) {
    new MutationObserver(() => setTimeout(enhanceSideSettings, 0)).observe(root, {
      subtree: true,
      childList: true,
    });
  }
  setTimeout(enhanceSideSettings, 50);
})();
