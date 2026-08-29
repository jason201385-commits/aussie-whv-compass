/* 澳打指南針 — 共用腳本 */
(function () {
  "use strict";

  // ---------- SVG 圖示庫（一次注入，全站以 <use href="#i-xxx"> 引用） ----------
  var SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
    + '<symbol id="i-compass" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></symbol>'
    + '<symbol id="i-user" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></symbol>'
    + '<symbol id="i-idcard" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="11" r="2.5"/><path d="M14 9h5M14 13h5M5 17h14"/></symbol>'
    + '<symbol id="i-luggage" viewBox="0 0 24 24"><rect x="6" y="7" width="12" height="13" rx="2"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M9.5 20v1.5M14.5 20v1.5"/></symbol>'
    + '<symbol id="i-dollar" viewBox="0 0 24 24"><path d="M12 2v20M17 5.5H9.5a3.25 3.25 0 0 0 0 6.5h5a3.25 3.25 0 0 1 0 6.5H6"/></symbol>'
    + '<symbol id="i-home" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></symbol>'
    + '<symbol id="i-briefcase" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></symbol>'
    + '<symbol id="i-alert" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></symbol>'
    + '<symbol id="i-chat" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></symbol>'
    + '<symbol id="i-health" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></symbol>'
    + '<symbol id="i-plane" viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></symbol>'
    + '<symbol id="i-key" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></symbol>'
    + '<symbol id="i-heart" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></symbol>'
    + '<symbol id="i-check" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></symbol>'
    + '<symbol id="i-x" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></symbol>'
    + '<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></symbol>'
    + '<symbol id="i-flag" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></symbol>'
    + '<symbol id="i-lifebuoy" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></symbol>'
    + '<symbol id="i-coffee" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></symbol>'
    + '<symbol id="i-tool" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></symbol>'
    + '<symbol id="i-file" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></symbol>'
    + '<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></symbol>'
    + '<symbol id="i-star" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></symbol>'
    + '<symbol id="i-zap" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></symbol>'
    + '<symbol id="i-pin" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></symbol>'
    + '</svg>';
  var mount = document.createElement("div");
  mount.innerHTML = SPRITE;
  document.body.insertBefore(mount.firstChild, document.body.firstChild);

  // ---------- 鍵盤使用者可略過重複導覽 ----------
  var main = document.querySelector("main");
  if (main) {
    if (!main.id) main.id = "main-content";
    var skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#" + main.id;
    skip.textContent = "跳到主要內容";
    document.body.insertBefore(skip, document.body.firstChild);
  }

  // 導覽列目前頁面標示
  var path = location.pathname.split("/").pop() || "index.html";
  if (path === "index.html") {
    var brand = document.querySelector(".brand");
    if (brand) brand.setAttribute("aria-current", "page");
  }
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    if (a.getAttribute("href") === path) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
  });

  // ---------- 最近閱讀：只記錄白名單頁名，作為首頁的回訪續接 ----------
  var LAST_PAGE_KEY = "whv-last-page-v1";
  var JOURNEY_ORDER = [
    { path: "why.html", title: "自我釐清", phase: "01", stage: "還在考慮", remember: true },
    { path: "cost.html", title: "物價與薪水", phase: "01", stage: "還在考慮", remember: true },
    { path: "visa.html", title: "簽證與集簽", phase: "01", stage: "還在考慮", remember: true },
    { path: "prep.html", title: "行前準備與落地", phase: "02", stage: "決定要去", remember: true },
    { path: "health.html", title: "健康與安全", phase: "02", stage: "決定要去", remember: true },
    { path: "english.html", title: "英文資源與策略", phase: "02", stage: "決定要去", remember: true },
    { path: "housing.html", title: "住宿與租屋", phase: "03", stage: "已在澳洲", remember: true },
    { path: "work.html", title: "找工作", phase: "03", stage: "已在澳洲", remember: true },
    { path: "scam.html", title: "防詐騙", phase: "03", stage: "已在澳洲", remember: true },
    { path: "pr.html", title: "PR 路徑總覽", phase: "03", stage: "已在澳洲", remember: true },
    { path: "leave.html", title: "報稅、退休金與離澳", phase: "04", stage: "回程與延續", remember: true },
    { path: "about.html", title: "留下感謝・關於本站", phase: "04", stage: "回程與延續", remember: false }
  ];
  var JOURNEY_PAGES = {};
  JOURNEY_ORDER.forEach(function (item) {
    if (item.remember) JOURNEY_PAGES[item.path] = { title: item.title, stage: item.stage };
  });
  var resume = document.getElementById("journey-resume");
  if (resume) {
    try {
      var lastPage = JSON.parse(localStorage.getItem(LAST_PAGE_KEY) || "null");
      if (lastPage && Object.prototype.hasOwnProperty.call(JOURNEY_PAGES, lastPage.path)) {
        var lastMeta = JOURNEY_PAGES[lastPage.path];
        var resumeLink = document.getElementById("journey-resume-link");
        var resumeSummary = document.getElementById("journey-resume-summary");
        var resumeClear = document.getElementById("journey-resume-clear");
        resumeLink.href = lastPage.path;
        resumeLink.textContent = "回到「" + lastMeta.title + "」";
        resumeSummary.textContent = "你上次停在「" + lastMeta.title + "」，目前屬於「" + lastMeta.stage + "」階段。";
        resume.hidden = false;
        resumeClear.addEventListener("click", function () {
          try { localStorage.removeItem(LAST_PAGE_KEY); } catch (e) {}
          resume.hidden = true;
          var journeyStart = document.querySelector(".journey-directory a");
          if (journeyStart) journeyStart.focus();
        });
      }
    } catch (e) {
      try { localStorage.removeItem(LAST_PAGE_KEY); } catch (storageError) {}
    }
  } else if (Object.prototype.hasOwnProperty.call(JOURNEY_PAGES, path)) {
    try { localStorage.setItem(LAST_PAGE_KEY, JSON.stringify({ path: path })); } catch (e) {}
  }

  // ---------- 內容頁旅程導覽：讀完後仍知道上一站、全貌與下一站 ----------
  var journeyIndex = JOURNEY_ORDER.findIndex(function (item) { return item.path === path; });
  if (main && journeyIndex >= 0) {
    var currentJourney = JOURNEY_ORDER[journeyIndex];
    var previousJourney = journeyIndex > 0 ? JOURNEY_ORDER[journeyIndex - 1] : null;
    var nextJourney = journeyIndex < JOURNEY_ORDER.length - 1 ? JOURNEY_ORDER[journeyIndex + 1] : null;
    var pageJourneyNav = document.createElement("nav");
    pageJourneyNav.className = "page-journey-nav";
    pageJourneyNav.setAttribute("aria-label", "本頁在打工度假旅程中的位置");

    var journeyHead = document.createElement("div");
    journeyHead.className = "page-journey-head";
    var journeyEyebrow = document.createElement("span");
    journeyEyebrow.className = "section-eyebrow";
    journeyEyebrow.textContent = "JOURNEY " + currentJourney.phase;
    var journeyPosition = document.createElement("strong");
    journeyPosition.textContent = currentJourney.stage + "・第 " + (journeyIndex + 1) + " / " + JOURNEY_ORDER.length + " 頁";
    var journeyHint = document.createElement("small");
    journeyHint.textContent = "可以跳著讀；想順著走時，從這裡接下去。";
    journeyHead.appendChild(journeyEyebrow);
    journeyHead.appendChild(journeyPosition);
    journeyHead.appendChild(journeyHint);

    var makeJourneyStep = function (label, item, fallbackTitle, extraClass) {
      var link = document.createElement("a");
      link.className = "page-journey-step " + extraClass;
      link.href = item ? item.path : "index.html#journey-map";
      var direction = document.createElement("span");
      direction.textContent = label;
      var title = document.createElement("strong");
      title.textContent = item ? item.title : fallbackTitle;
      link.appendChild(direction);
      link.appendChild(title);
      return link;
    };

    var journeyLinks = document.createElement("div");
    journeyLinks.className = "page-journey-links";
    journeyLinks.appendChild(makeJourneyStep("上一站", previousJourney, "旅程首頁", "previous"));
    var overview = document.createElement("a");
    overview.className = "page-journey-overview";
    overview.href = "index.html#journey-map";
    overview.textContent = "查看完整旅程";
    journeyLinks.appendChild(overview);
    journeyLinks.appendChild(makeJourneyStep("下一站", nextJourney, "重新選階段", "next"));

    pageJourneyNav.appendChild(journeyHead);
    pageJourneyNav.appendChild(journeyLinks);
    main.appendChild(pageJourneyNav);
  }

  // ---------- 首頁 SVG 剪紙視差（減少動態與行動版停用） ----------
  var hero = document.querySelector(".hero");
  if (hero && window.matchMedia) {
    var heroMotion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    var heroWide = window.matchMedia("(min-width: 641px)");
    var heroTicking = false;
    var updateHeroParallax = function () {
      heroTicking = false;
      if (!heroMotion.matches || !heroWide.matches) {
        hero.style.removeProperty("--hero-gold-y");
        hero.style.removeProperty("--hero-green-y");
        hero.style.removeProperty("--hero-accent-y");
        return;
      }
      var offset = Math.min(window.scrollY || 0, 650);
      hero.style.setProperty("--hero-gold-y", (offset * 0.08).toFixed(1) + "px");
      hero.style.setProperty("--hero-green-y", (offset * 0.14).toFixed(1) + "px");
      hero.style.setProperty("--hero-accent-y", (offset * 0.2).toFixed(1) + "px");
    };
    var queueHeroParallax = function () {
      if (heroTicking) return;
      heroTicking = true;
      window.requestAnimationFrame(updateHeroParallax);
    };
    window.addEventListener("scroll", queueHeroParallax, { passive: true });
    window.addEventListener("resize", queueHeroParallax);
    updateHeroParallax();
  }

  // ---------- 回饋列（全站注入，讓這套系統有進步的可能） ----------
  var footer = document.querySelector(".site-footer");
  if (footer) {
    var pageName = (document.title.split("｜")[0] || document.title).trim();
    var issueUrl = "https://github.com/jason201385-commits/aussie-whv-compass/issues/new"
      + "?template=report.yml"
      + "&title=" + encodeURIComponent("[" + pageName + "] ")
      + "&page=" + encodeURIComponent(pageName + "（" + (location.pathname.split("/").pop() || "index.html") + "）");
    var thanksUrl = "https://github.com/jason201385-commits/aussie-whv-compass/issues/new"
      + "?template=thanks.yml"
      + "&page=" + encodeURIComponent(pageName + "（" + (location.pathname.split("/").pop() || "index.html") + "）");
    var bar = document.createElement("div");
    bar.className = "feedback-bar";
    bar.innerHTML = '<span class="fb-q">這一頁有幫助嗎？</span>'
      + '<div class="feedback-actions">'
      + '<button type="button" class="btn secondary" id="fb-share">有幫助，複製網址分享</button>'
      + '<a class="btn" target="_blank" rel="noopener noreferrer" href="' + issueUrl + '">回報問題／提建議</a>'
      + '<a class="btn ghost" target="_blank" rel="noopener noreferrer" aria-label="前往 GitHub 公開留下一句感謝（另開新頁）" href="' + thanksUrl + '">留下一句感謝（公開於 GitHub）</a>'
      + '</div>'
      + '<p class="feedback-note">回報與感謝會開啟公開的 GitHub Issue，需要登入並會顯示 GitHub 帳號；請勿留下個資或可識別第三人的資訊。</p>';
    footer.parentNode.insertBefore(bar, footer);
    var shareBtn = document.getElementById("fb-share");
    shareBtn.addEventListener("click", function () {
      var copied = function () {
        bar.querySelector(".fb-q").innerHTML = '<span class="fb-thanks">已複製連結——分享給下一個要出發的人，就是最好的回饋。</span>';
        shareBtn.style.display = "none";
      };
      var copyFailed = function () {
        bar.querySelector(".fb-q").textContent = "無法自動複製，請使用瀏覽器的分享或複製網址功能。";
      };
      try {
        navigator.clipboard.writeText(location.href).then(copied, copyFailed);
      } catch (e) { copyFailed(); }
    });
  }

  // ---------- 快選籤：點一下代替打字（data-fill → 填入指定 textarea） ----------
  document.addEventListener("click", function (e) {
    var chip = e.target.closest ? e.target.closest(".chip[data-fill]") : null;
    if (!chip) return;
    var ta = document.getElementById(chip.getAttribute("data-target"));
    if (!ta) return;
    var text = chip.getAttribute("data-fill");
    ta.value = ta.value.trim() ? ta.value.replace(/[、\s]+$/, "") + "、" + text : text;
    ta.dispatchEvent(new Event("input"));
    ta.focus();
  });

  // ---------- 自我釐清工作表（只在 why.html 生效） ----------
  var form = document.getElementById("worksheet");
  if (!form) return;

  var KEY = "whv-worksheet-v1";
  var statusEl = document.getElementById("ws-status");
  var fields = Array.prototype.slice.call(form.querySelectorAll("textarea"));

  function setStatus(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(function () { statusEl.textContent = ""; }, 3000);
  }

  // 讀回上次的答案（localStorage 只存在你自己的瀏覽器，不會上傳）
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    fields.forEach(function (f) {
      if (saved[f.id]) f.value = saved[f.id];
    });
  } catch (e) { /* 私密視窗或封鎖儲存時略過 */ }

  var saveTimer;
  function save() {
    try {
      var data = {};
      fields.forEach(function (f) { data[f.id] = f.value; });
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* 儲存被封鎖時忽略 */ }
  }
  fields.forEach(function (f) {
    f.addEventListener("input", function () {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { save(); setStatus("已自動儲存在你的瀏覽器"); }, 600);
    });
  });

  // 匯出成純文字檔
  var exportBtn = document.getElementById("ws-export");
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      var lines = ["我的澳洲打工度假自我釐清表", "產生日期：" + new Date().toLocaleDateString("zh-TW"), ""];
      form.querySelectorAll(".worksheet-q").forEach(function (q) {
        var label = q.querySelector("label");
        var ta = q.querySelector("textarea");
        if (!label || !ta) return;
        lines.push("■ " + label.textContent.trim());
        lines.push(ta.value.trim() ? ta.value.trim() : "（尚未填寫）");
        lines.push("");
      });
      var blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "我的打工度假自我釐清表.txt";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      setStatus("已匯出 .txt 檔");
    });
  }

  // 清空
  var clearBtn = document.getElementById("ws-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (!confirm("確定要清空所有答案嗎？此動作無法復原。")) return;
      fields.forEach(function (f) { f.value = ""; });
      try { localStorage.removeItem(KEY); } catch (e) {}
      setStatus("已清空");
    });
  }
})();
