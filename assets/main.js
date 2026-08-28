/* 澳打指南針 — 共用腳本 */
(function () {
  "use strict";

  // 導覽列目前頁面標示
  var path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    if (a.getAttribute("href") === path) a.classList.add("active");
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
      saveTimer = setTimeout(function () { save(); setStatus("已自動儲存在你的瀏覽器 ✓"); }, 600);
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
      setStatus("已匯出 .txt 檔 ✓");
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
