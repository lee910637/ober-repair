(() => {
  "use strict";

  const app = document.getElementById("app");
  const topTitle = document.getElementById("topTitle");
  const backBtn = document.getElementById("backBtn");

  /** @type {{faults: any[], nodes: Record<string, any>}} */
  let DATA = null;

  // path: array of {node, choiceLabel} taken during current wizard session
  let session = { faultId: null, path: [] };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function clone(tplId) {
    const tpl = document.getElementById(tplId);
    return tpl.content.cloneNode(true);
  }

  function render(node) {
    app.innerHTML = "";
    app.appendChild(node);
    window.scrollTo({ top: 0 });
  }

  // ---------------- Routing ----------------
  function goHome() {
    session = { faultId: null, path: [] };
    location.hash = "#/";
  }

  function goFault(faultId) {
    location.hash = `#/fault/${faultId}`;
  }

  function goNode(faultId, nodeId, path) {
    session = { faultId, path };
    location.hash = `#/wizard/${faultId}/${nodeId}`;
  }

  function goEnd(faultId, path, endInfo) {
    session = { faultId, path, end: endInfo };
    location.hash = `#/end/${faultId}`;
  }

  window.addEventListener("hashchange", route);

  function route() {
    if (!DATA) return; // wait for data load
    const hash = location.hash || "#/";
    const parts = hash.replace(/^#\//, "").split("/").filter(Boolean);

    if (parts[0] === "fault" && parts[1]) {
      backBtn.hidden = false;
      return renderFaultInfo(parts[1]);
    }
    if (parts[0] === "wizard" && parts[1] && parts[2]) {
      backBtn.hidden = false;
      return renderWizard(parts[1], parts[2]);
    }
    if (parts[0] === "end" && parts[1]) {
      backBtn.hidden = false;
      return renderConclusion(parts[1]);
    }
    backBtn.hidden = true;
    topTitle.textContent = "17108A-5-120 維修診斷";
    return renderHome();
  }

  backBtn.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else goHome();
  });

  // ---------------- Home ----------------
  function faultMatches(fault, q) {
    if (!q) return true;
    q = q.trim().toLowerCase();
    if (!q) return true;
    const hay = [fault.name, fault.description, ...(fault.keywords || [])]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }

  function renderHome() {
    const frag = clone("tpl-home");
    const list = $(".fault-list", frag);
    const input = $("#searchInput", frag);

    function draw(q) {
      list.innerHTML = "";
      const sorted = [...DATA.faults].sort((a, b) => {
        const rank = { 高: 0, 中: 1, 低: 2 };
        return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
      });
      const shown = sorted.filter((f) => faultMatches(f, q));
      if (shown.length === 0) {
        const p = document.createElement("p");
        p.className = "offline-note";
        p.textContent = "找不到符合的異常現象，請換個關鍵字，或參考紙本手冊。";
        list.appendChild(p);
        return;
      }
      for (const f of shown) {
        const card = clone("tpl-faultcard");
        const btn = $(".fault-card", card);
        $(".fault-name", card).textContent = f.name;
        const pb = $(".priority-badge", card);
        pb.textContent = `優先: ${f.priority}`;
        pb.classList.add(`priority-${f.priority}`);
        $(".fault-desc", card).textContent = f.description;
        $(".category-tag", card).textContent = f.category;
        const bt = $(".built-tag", card);
        if (f.built) {
          bt.textContent = "可逐步查修";
          bt.classList.add("yes");
        } else {
          bt.textContent = "建置中";
          bt.classList.add("no");
          btn.classList.add("dimmed");
        }
        btn.addEventListener("click", () => goFault(f.id));
        list.appendChild(card);
      }
    }

    input.addEventListener("input", () => draw(input.value));
    draw("");
    render(frag);
  }

  // ---------------- Fault info / entry ----------------
  function renderFaultInfo(faultId) {
    const fault = DATA.faults.find((f) => f.id === faultId);
    if (!fault) return goHome();
    topTitle.textContent = fault.name;

    if (fault.built && fault.startNode) {
      return goNode(fault.id, fault.startNode, []);
    }

    const frag = clone("tpl-faultinfo");
    $(".fi-name", frag).textContent = fault.name;
    $(".fi-desc", frag).textContent = fault.description;
    $(".fi-section", frag).textContent = `參考手冊章節：${fault.manualSection || "—"}`;
    $(".back-home", frag).addEventListener("click", goHome);
    render(frag);
  }

  // ---------------- Wizard ----------------
  function renderTrail(container, path, currentLabel) {
    container.innerHTML = "";
    path.forEach((step, i) => {
      const span = document.createElement("span");
      span.className = "trail-item";
      span.textContent = `${i + 1}. ${step.choiceLabel}`;
      container.appendChild(span);
    });
    if (currentLabel) {
      const span = document.createElement("span");
      span.className = "trail-item";
      span.textContent = currentLabel;
      container.appendChild(span);
    }
  }

  function renderWizard(faultId, nodeId) {
    const fault = DATA.faults.find((f) => f.id === faultId);
    const node = DATA.nodes[nodeId];
    if (!fault || !node) return goHome();
    topTitle.textContent = fault.name;

    // Rebuild path from session if it matches, otherwise start fresh at this node
    let path = session.faultId === faultId ? session.path : [];

    const frag = clone("tpl-wizard");
    renderTrail($(".trail", frag), path, `目前：第 ${path.length + 1} 步`);

    if (node.check) {
      const box = $(".check-box", frag);
      box.hidden = false;
      $(".check-location", frag).textContent = node.check.location || "—";
      $(".check-method", frag).textContent = node.check.method || "—";
      const unit = node.check.unit ? ` (${node.check.unit})` : "";
      $(".check-normal", frag).textContent = (node.check.normal || "—") + unit;
    }
    $(".prompt", frag).textContent = node.prompt;

    const optionsEl = $(".options", frag);
    node.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = opt.label;
      btn.addEventListener("click", () => {
        const newPath = [...path, { node: nodeId, choiceLabel: opt.label }];
        if (opt.next.type === "node") {
          goNode(faultId, opt.next.id, newPath);
        } else {
          goEnd(faultId, newPath, opt.next);
        }
      });
      optionsEl.appendChild(btn);
    });

    render(frag);
  }

  // ---------------- Conclusion ----------------
  function renderConclusion(faultId) {
    const fault = DATA.faults.find((f) => f.id === faultId);
    if (!fault || !session.end || session.faultId !== faultId) return goHome();
    topTitle.textContent = "診斷結論";

    const frag = clone("tpl-conclusion");
    $(".conclusion-text", frag).textContent = session.end.conclusion;
    $(".action-text", frag).textContent = session.end.action || "請依現場狀況處置。";
    renderTrail($(".trail", frag), session.path);
    $(".restart-btn", frag).addEventListener("click", () => goFault(faultId));
    $(".back-home", frag).addEventListener("click", goHome);

    render(frag);
  }

  // ---------------- Boot ----------------
  fetch("data/diagnosis-data.json")
    .then((r) => r.json())
    .then((data) => {
      DATA = data;
      route();
    })
    .catch((err) => {
      app.innerHTML = `<p class="offline-note">資料載入失敗，請確認曾經連網開啟過一次本工具。(${err})</p>`;
    });

  // ---------------- PWA install tip (iOS) ----------------
  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
  function isStandalone() {
    return window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  }
  const tip = document.getElementById("installTip");
  if (isIos() && !isStandalone() && !localStorage.getItem("installTipDismissed")) {
    tip.hidden = false;
  }
  document.getElementById("installTipClose").addEventListener("click", () => {
    tip.hidden = true;
    localStorage.setItem("installTipDismissed", "1");
  });

  // ---------------- Service worker ----------------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }
})();
