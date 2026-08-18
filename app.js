(() => {
  "use strict";

  const app = document.getElementById("app");
  const topTitle = document.getElementById("topTitle");
  const topBadge = document.getElementById("topBadge");
  const backBtn = document.getElementById("backBtn");

  /** @type {{series: any[], models: any[], faults: any[], nodes: Record<string, any>}} */
  let DATA = null;

  // path: array of {node, choiceLabel} taken during current wizard session
  let session = { modelId: null, faultId: null, path: [] };

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

  function setTop(title, badge) {
    topTitle.textContent = title;
    if (badge) {
      topBadge.textContent = badge;
      topBadge.hidden = false;
    } else {
      topBadge.hidden = true;
    }
  }

  // ---------------- Routing ----------------
  function goLanding() {
    session = { modelId: null, faultId: null, path: [] };
    location.hash = "#/";
  }

  function goSeries(seriesId) {
    session = { modelId: null, faultId: null, path: [] };
    location.hash = `#/series/${seriesId}`;
  }

  function goModelHome(modelId) {
    session = { modelId, faultId: null, path: [] };
    location.hash = `#/model/${modelId}`;
  }

  function goFault(modelId, faultId) {
    location.hash = `#/model/${modelId}/fault/${faultId}`;
  }

  function goNode(modelId, faultId, nodeId, path) {
    session = { modelId, faultId, path };
    location.hash = `#/model/${modelId}/wizard/${faultId}/${nodeId}`;
  }

  function goEnd(modelId, faultId, path, endInfo) {
    session = { modelId, faultId, path, end: endInfo };
    location.hash = `#/model/${modelId}/end/${faultId}`;
  }

  window.addEventListener("hashchange", route);

  function route() {
    if (!DATA) return; // wait for data load
    const hash = location.hash || "#/";
    const parts = hash.replace(/^#\//, "").split("/").filter(Boolean);

    if (parts[0] === "series" && parts[1]) {
      backBtn.hidden = false;
      return renderSeries(parts[1]);
    }
    if (parts[0] === "model" && parts[1]) {
      backBtn.hidden = false;
      if (parts[2] === "fault" && parts[3]) return renderFaultInfo(parts[1], parts[3]);
      if (parts[2] === "wizard" && parts[3] && parts[4]) return renderWizard(parts[1], parts[3], parts[4]);
      if (parts[2] === "end" && parts[3]) return renderConclusion(parts[1], parts[3]);
      return renderModelHome(parts[1]);
    }
    backBtn.hidden = true;
    setTop("歐伯維修", null);
    return renderLanding();
  }

  backBtn.addEventListener("click", () => {
    if (history.length > 1) history.back();
    else goLanding();
  });

  // ---------------- Landing (歐伯維修 首頁：A/N/E 系列) ----------------
  function renderLanding() {
    const frag = clone("tpl-landing");
    const list = $("#seriesList", frag);
    for (const s of DATA.series) {
      const count = DATA.models.filter((m) => m.series === s.id).length;
      const card = clone("tpl-seriescard");
      const btn = $(".series-card", card);
      $(".series-name", card).textContent = s.name;
      $(".series-count", card).textContent = count > 0 ? `${count} 個機型` : "尚無機型";
      if (count === 0) btn.classList.add("dimmed");
      btn.addEventListener("click", () => goSeries(s.id));
      list.appendChild(card);
    }
    render(frag);
  }

  // ---------------- 系列次頁：該系列下的機型清單 ----------------
  function renderSeries(seriesId) {
    const series = DATA.series.find((s) => s.id === seriesId);
    if (!series) return goLanding();
    setTop(series.name, null);

    const frag = clone("tpl-serieslist");
    const list = $("#modelList", frag);
    const models = DATA.models.filter((m) => m.series === seriesId);

    if (models.length === 0) {
      $(".empty-series-note", frag).hidden = false;
    }
    for (const m of models) {
      const card = clone("tpl-modelcard");
      const btn = $(".model-card", card);
      const img = $(".model-card-img", card);
      if (m.image) {
        img.src = m.image;
        img.alt = m.name;
        img.hidden = false;
      }
      $(".fault-name", card).textContent = m.name;
      $(".fault-desc", card).textContent = m.description || "";
      const bt = $(".built-tag", card);
      if (m.built) {
        bt.textContent = "可查修";
        bt.classList.add("yes");
      } else {
        bt.textContent = "建置中";
        bt.classList.add("no");
        btn.classList.add("dimmed");
      }
      btn.addEventListener("click", () => goModelHome(m.id));
      list.appendChild(card);
    }
    render(frag);
  }

  // ---------------- Model home (該機型的故障清單) ----------------
  function faultMatches(fault, q) {
    if (!q) return true;
    q = q.trim().toLowerCase();
    if (!q) return true;
    const hay = [fault.name, fault.description, ...(fault.keywords || [])]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }

  function renderModelHome(modelId) {
    const model = DATA.models.find((m) => m.id === modelId);
    if (!model) return goLanding();
    setTop(model.name, model.id);

    const frag = clone("tpl-home");
    const list = $(".fault-list", frag);
    const input = $("#searchInput", frag);
    const img = $(".hero-img", frag);
    if (model.image) {
      img.src = model.image;
      img.alt = model.name;
      img.hidden = false;
    }
    $(".hero-caption", frag).textContent = model.name;

    const modelFaults = DATA.faults.filter((f) => f.modelId === modelId);

    function draw(q) {
      list.innerHTML = "";
      const sorted = [...modelFaults].sort((a, b) => {
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
        btn.addEventListener("click", () => goFault(modelId, f.id));
        list.appendChild(card);
      }
    }

    input.addEventListener("input", () => draw(input.value));
    draw("");
    render(frag);
  }

  // ---------------- Fault info / entry ----------------
  function renderFaultInfo(modelId, faultId) {
    const model = DATA.models.find((m) => m.id === modelId);
    const fault = DATA.faults.find((f) => f.id === faultId && f.modelId === modelId);
    if (!model || !fault) return goLanding();
    setTop(fault.name, model.id);

    if (fault.built && fault.startNode) {
      return goNode(modelId, fault.id, fault.startNode, []);
    }

    const frag = clone("tpl-faultinfo");
    $(".fi-name", frag).textContent = fault.name;
    $(".fi-desc", frag).textContent = fault.description;
    $(".fi-section", frag).textContent = `參考手冊章節：${fault.manualSection || "—"}`;
    $(".back-model-home", frag).addEventListener("click", () => goModelHome(modelId));
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

  function renderWizard(modelId, faultId, nodeId) {
    const model = DATA.models.find((m) => m.id === modelId);
    const fault = DATA.faults.find((f) => f.id === faultId && f.modelId === modelId);
    const node = DATA.nodes[nodeId];
    if (!model || !fault || !node) return goLanding();
    setTop(fault.name, model.id);

    // Rebuild path from session if it matches, otherwise start fresh at this node
    let path = session.modelId === modelId && session.faultId === faultId ? session.path : [];

    const frag = clone("tpl-wizard");
    renderTrail($(".trail", frag), path, `目前：第 ${path.length + 1} 步`);

    if (node.check) {
      const box = $(".check-box", frag);
      box.hidden = false;
      $(".check-location", frag).textContent = node.check.location || "—";
      $(".check-method", frag).textContent = node.check.method || "—";
      const unit = node.check.unit ? ` (${node.check.unit})` : "";
      $(".check-normal", frag).textContent = (node.check.normal || "—") + unit;
      const photo = $(".check-photo", frag);
      if (node.check.photo) {
        photo.src = node.check.photo;
        photo.hidden = false;
      }
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
          goNode(modelId, faultId, opt.next.id, newPath);
        } else {
          goEnd(modelId, faultId, newPath, opt.next);
        }
      });
      optionsEl.appendChild(btn);
    });

    render(frag);
  }

  // ---------------- Conclusion ----------------
  function renderConclusion(modelId, faultId) {
    const model = DATA.models.find((m) => m.id === modelId);
    const fault = DATA.faults.find((f) => f.id === faultId && f.modelId === modelId);
    if (!model || !fault || !session.end || session.modelId !== modelId || session.faultId !== faultId) {
      return goLanding();
    }
    setTop("診斷結論", model.id);

    const frag = clone("tpl-conclusion");
    $(".conclusion-text", frag).textContent = session.end.conclusion;
    $(".action-text", frag).textContent = session.end.action || "請依現場狀況處置。";
    renderTrail($(".trail", frag), session.path);
    $(".restart-btn", frag).addEventListener("click", () => goFault(modelId, faultId));
    $(".back-model-home", frag).addEventListener("click", () => goModelHome(modelId));

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
