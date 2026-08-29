/* 澳打指南針 — 互動工具（純前端，無後端、不收集任何資料） */
(function () {
  "use strict";

  var fmt = function (n) { return "$" + Math.round(n).toLocaleString("en-AU"); };
  var icon = function (name) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; };

  /* ================= 集簽資格快查器（visa.html） ================= */
  var pcTool = document.getElementById("postcode-tool");
  if (pcTool && window.WHV_POSTCODES) {
    var D = window.WHV_POSTCODES;
    var inList = function (pc, list) {
      if (!list) return false;
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        if (e.indexOf("-") > 0) {
          var parts = e.split("-");
          if (pc >= parseInt(parts[0], 10) && pc <= parseInt(parts[1], 10)) return true;
        } else if (pc === parseInt(e, 10)) return true;
      }
      return false;
    };
    var stateOf = function (pc) {
      if (pc >= 800 && pc <= 999) return "NT";
      if (pc === 2899) return "NORFOLK";
      if ((pc >= 2600 && pc <= 2618) || (pc >= 2900 && pc <= 2920)) return "ACT";
      if (pc >= 2000 && pc <= 2999) return "NSW";
      if (pc >= 3000 && pc <= 3999) return "VIC";
      if (pc >= 4000 && pc <= 4999) return "QLD";
      if (pc >= 5000 && pc <= 5999) return "SA";
      if (pc >= 6000 && pc <= 6797) return "WA";
      if (pc >= 7000 && pc <= 7999) return "TAS";
      return null;
    };
    var checkGroup = function (pc, st, group) {
      if (!group) return false;
      var entry = group[st];
      if (entry === "ALL") return true;
      if (Object.prototype.toString.call(entry) === "[object Array]") return inList(pc, entry);
      // 官方表有跨州號段照原表歸屬的情況——保險起見掃全部清單
      for (var k in group) {
        if (k.charAt(0) === "_" || k === "notes") continue;
        var v = group[k];
        if (v !== "ALL" && Object.prototype.toString.call(v) === "[object Array]" && inList(pc, v)) return true;
      }
      return false;
    };
    var run = function () {
      var raw = document.getElementById("pc-input").value.trim();
      var cat = document.getElementById("pc-cat").value;
      var out = document.getElementById("pc-result");
      out.style.display = "block";
      if (!/^\d{4}$/.test(raw)) {
        out.innerHTML = '<p class="result-verdict">請輸入 4 位數郵遞區號（北領地含前導零，如 0870）</p>';
        return;
      }
      var pc = parseInt(raw, 10);
      var st = stateOf(pc);
      if (!st) {
        out.innerHTML = '<p class="result-verdict result-no">' + icon("x") + ' 這不像是澳洲的郵遞區號，再確認一下？</p>';
        return;
      }
      var ok = false, extraNote = "";
      if (cat === "plant") {
        ok = checkGroup(pc, st, D.regional);
      } else if (cat === "tourism") {
        var t = D.northern_remote_tourism;
        ok = checkGroup(pc, st, t.remote_very_remote) || checkGroup(pc, st, t.northern_australia)
          || inList(pc, (t.extra_postcodes.QLD || []).concat(t.extra_postcodes.TAS || []));
        extraNote = "觀光餐旅類：工作須於 2021-06-22 之後進行。";
      } else if (cat === "bushfire") {
        ok = checkGroup(pc, st, D.bushfire.postcodes);
        extraNote = "火災復原：限 2019-07-31 之後、於宣告火災區進行的工作（含志工）。宣告區清單官方會更新。";
      } else {
        ok = checkGroup(pc, st, D.disaster.postcodes);
        extraNote = "天災復原：限 2021-12-31 之後的工作（含志工）；申請表 Employment type 須選 flood recovery。宣告區清單官方會更新。";
      }
      var catName = document.getElementById("pc-cat").selectedOptions[0].textContent;
      if (ok) {
        out.innerHTML = '<p class="result-verdict result-ok">' + icon("check") + ' 郵遞區號 ' + raw + '（' + st + '）做「' + catName + '」——<strong>在官方合格清單內</strong></p>'
          + '<p style="font-size:.9rem">' + (extraNote ? extraNote + " " : "") + '別忘了三個前提：工作內容要真的屬於該產業、必須合法支薪（黑工不算）、payslip 從第一天就要存。</p>';
      } else {
        out.innerHTML = '<p class="result-verdict result-no">' + icon("x") + ' 郵遞區號 ' + raw + '（' + st + '）做「' + catName + '」——<strong>不在官方合格清單內</strong></p>'
          + '<p style="font-size:.9rem">' + (extraNote ? extraNote + " " : "") + '提示：大城市都會區幾乎都不合格；動植物栽培等要在 regional（SA／TAS／NT 全境皆可），觀光餐旅只限北澳與偏遠地區。換個郵遞區號試試，或改查其他工作類型。</p>';
      }
      out.innerHTML += '<p class="fact-meta">依 2026-08-29 抓取的官方清單判定，申請前請以 <a href="https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-417/specified-work" rel="noopener">官方頁面現行清單</a>為準。</p>';
    };
    document.getElementById("pc-check").addEventListener("click", run);
    document.getElementById("pc-input").addEventListener("keydown", function (e) { if (e.key === "Enter") run(); });
    pcTool.querySelectorAll(".chip[data-pc]").forEach(function (c) {
      c.addEventListener("click", function () {
        document.getElementById("pc-input").value = c.getAttribute("data-pc");
        run();
      });
    });
  }

  /* ================= 採收季節月曆（work.html） ================= */
  var seasonTool = document.getElementById("season-calendar");
  if (seasonTool) {
    var seasonData = window.WHV_SEASONS;
    var seasonOut = document.getElementById("season-results");

    var seasonSourceLink = function (source) {
      return '<a href="' + source.url + '" rel="noopener">官方表</a>';
    };

    var renderSeason = function (month) {
      if (!seasonData || !seasonOut) {
        if (seasonOut) seasonOut.innerHTML = '<p class="warn">採收資料沒有載入，請重新整理後再試。</p>';
        return;
      }

      seasonTool.querySelectorAll("[data-season-month]").forEach(function (button) {
        button.setAttribute("aria-pressed", Number(button.dataset.seasonMonth) === month ? "true" : "false");
      });

      var verifiedCount = 0;
      var cards = seasonData.states.map(function (state) {
        var source = seasonData.sources[state.code];
        if (!source) {
          return '<article class="season-state season-state-missing">'
            + '<h4><span>' + state.code + '</span>' + state.name + '</h4>'
            + '<p>本次查核未找到可直接轉成採收月份的州政府表格。</p>'
            + '</article>';
        }

        var matches = state.entries.filter(function (entry) { return entry.months.indexOf(month) !== -1; });
        if (matches.length) verifiedCount++;
        var items = matches.length
          ? '<ul>' + matches.map(function (entry) {
              return '<li><strong>' + entry.crop + '</strong><span>' + entry.region + '</span></li>';
            }).join("") + '</ul>'
          : '<p>官方表在這個月沒有列出項目。</p>';

        return '<article class="season-state' + (matches.length ? ' is-active' : '') + '">'
          + '<h4><span>' + state.code + '</span>' + state.name + '</h4>'
          + items
          + '<p class="fact-meta">' + seasonSourceLink(source) + '・頁面日期 ' + source.pageDate + '</p>'
          + '</article>';
      }).join("");

      seasonOut.innerHTML = '<p class="season-summary"><strong>' + month + ' 月：</strong>有 ' + verifiedCount + ' 個州／領地在官方表中列出項目</p>'
        + '<div class="season-grid">' + cards + '</div>'
        + '<p class="season-caveat">這是政府公布的採收／供應月份，不是職缺保證。天候、品種與產區會讓日期前後移動，出發前仍要向雇主確認班次。</p>';
    };

    seasonTool.querySelectorAll("[data-season-month]").forEach(function (button) {
      button.addEventListener("click", function () { renderSeason(Number(button.dataset.seasonMonth)); });
    });
    renderSeason(new Date().getMonth() + 1);
  }

  /* ================= 存錢試算器（cost.html） ================= */
  var calc = document.getElementById("save-calc");
  if (calc) {
    var rate = document.getElementById("calc-rate");
    var hours = document.getElementById("calc-hours");
    var city = document.getElementById("calc-city");
    var life = document.getElementById("calc-life");
    var update = function () {
      var r = parseFloat(rate.value), h = parseFloat(hours.value);
      document.getElementById("calc-rate-out").textContent = "$" + r.toFixed(2);
      document.getElementById("calc-hours-out").textContent = h + " 小時";
      var gross = r * h;
      var net = gross * 0.85; // WHM 15%（$45,000 以下級距）
      var sup = gross * 0.12;
      var rent = parseFloat(city.value);
      var living = parseFloat(life.value);
      var save = net - rent - living;
      var yearly = save * 46; // 保守估 46 週有班（扣找工空窗與旅行）
      document.getElementById("calc-gross").textContent = fmt(gross);
      document.getElementById("calc-net").textContent = fmt(net);
      document.getElementById("calc-exp").textContent = fmt(rent + living);
      document.getElementById("calc-save").textContent = fmt(save);
      document.getElementById("calc-super").textContent = fmt(sup);
      document.getElementById("calc-year").textContent = fmt(yearly);
      document.getElementById("calc-twd").textContent = "約 NT$" + Math.round(yearly * 22.8 / 10000).toLocaleString() + " 萬";
      var v = document.getElementById("calc-verdict");
      if (save <= 0) { v.textContent = "入不敷出——換城市、加班或砍支出，先讀「找工作」和「住宿租屋」。"; v.className = "result-verdict result-no"; }
      else if (save < 250) { v.textContent = "存得到但很慢——這是體驗優先的過法，錢別指望太多。"; v.className = "result-verdict"; }
      else if (save < 550) { v.textContent = "穩健路線——一年下來是一筆有感的錢。"; v.className = "result-verdict result-ok"; }
      else { v.textContent = "存錢機器模式——記得留一點預算給體驗，別把一年過成只有班表。"; v.className = "result-verdict result-ok"; }
    };
    [rate, hours, city, life].forEach(function (el) { el.addEventListener("input", update); });
    update();
  }

  /* ================= 行前互動清單（prep.html） ================= */
  var checklist = document.getElementById("prep-checklist");
  if (checklist) {
    var ITEMS = [
      { g: icon("idcard") + " 下簽之後", items: [
        "保險買好（確認打工/體力勞動有保）",
        "機票訂了（核准信到手才訂）",
        "國際駕照＋駕照譯本辦了",
        "牙齒全檢查、該補的補完",
        "英文履歷改好、內容背熟",
        "學經歷／證照英譯備妥（有專業技能者）",
        "查好目標銀行現行開戶方式",
        "Wise 或同類帳戶開好"
      ]},
      { g: icon("luggage") + " 出發前一週", items: [
        "第一晚用品放隨身包（換洗衣物、行動電源、轉接頭）",
        "緩衝住宿訂好 1–2 週",
        "現金換好 A$200–300",
        "藥品附英文處方箋、放原包裝",
        "重要文件掃描存雲端（護照、核准信、保單）",
        "跟家人講好聯絡節奏與緊急聯絡方式"
      ]},
      { g: icon("plane") + " 落地第一週", items: [
        "SIM 卡辦好（跑偏遠選 Telstra 網路系）",
        "交通卡辦好",
        "TFN 線上申請送出（一有地址就辦）",
        "銀行帳戶開好（拿到 BSB／帳號）",
        "myGov 註冊並連結 ATO",
        "super 帳戶自選一個、記下資料",
        "把「防詐騙」頁的救濟包電話存進手機"
      ]}
    ];
    var KEY = "whv-prep-check-v1";
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
    var total = 0, html = "";
    ITEMS.forEach(function (grp, gi) {
      html += "<h3>" + grp.g + "</h3><ul class='icheck'>";
      grp.items.forEach(function (item, ii) {
        var id = "pc2-" + gi + "-" + ii;
        total++;
        html += "<li><label><input type='checkbox' id='" + id + "'" + (saved[id] ? " checked" : "") + "><span>" + item + "</span></label></li>";
      });
      html += "</ul>";
    });
    checklist.innerHTML = html;
    var bar = document.getElementById("prep-progress-bar");
    var label = document.getElementById("prep-progress-label");
    var refresh = function () {
      var done = checklist.querySelectorAll("input:checked").length;
      var pct = Math.round(done / total * 100);
      bar.style.width = pct + "%";
      label.textContent = done + " / " + total + " 完成（" + pct + "%）" + (pct === 100 ? " —— 出發吧！" : "");
      try {
        var data = {};
        checklist.querySelectorAll("input").forEach(function (c) { data[c.id] = c.checked; });
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch (e) {}
    };
    checklist.addEventListener("change", refresh);
    refresh();
    var resetBtn = document.getElementById("prep-reset");
    if (resetBtn) resetBtn.addEventListener("click", function () {
      if (!confirm("清空所有勾選？")) return;
      checklist.querySelectorAll("input").forEach(function (c) { c.checked = false; });
      refresh();
    });
  }

  /* ================= 防詐測驗（scam.html） ================= */
  var quiz = document.getElementById("scam-quiz");
  if (quiz) {
    var Q = [
      { s: "臉書社團有人私訊你：「農場缺工，秒錄取！先轉 $300 保證金，明天就能上工。」", run: true,
        why: "「先付錢才有工作」是頭號紅旗——合法雇主不會向求職者收錢。錢轉出去，工作和人都會消失。" },
      { s: "咖啡店店長請你現場拉花 1 小時給他看，全程站在旁邊看你操作，沒有付錢。", run: false,
        why: "這在合法範圍：無薪試工只限「監督下的短時技能展示」。但如果變成排你整天班還不給錢，就違法了。" },
      { s: "Working hostel：「先繳四週房租排隊等工作，搬走的話 88 天文件就不簽了。」", run: true,
        why: "工作綁住宿＋拿集簽要挾＝經典陷阱。二簽的依據是你的薪資單，不是老闆的簽名恩惠。" },
      { s: "群組裡有人換匯，匯率比銀行好 3%，對方先傳了轉帳成功的截圖給你看。", run: true,
        why: "截圖可以造假，入帳才算數——而且私下換匯在台澳兩邊都可能觸法。只用銀行或持牌業者。" },
      { s: "新工作給你書面 offer、要你填 TFN declaration，說第一週發薪就會給 payslip。", run: false,
        why: "到職三件套齊全（書面約定、TFN 表、payslip）——這正是合法工作該有的樣子。" },
      { s: "接到中文來電自稱移民局：「你的簽證有問題，今天內繳 $1,000 重審費，否則遣返。」", run: true,
        why: "政府機關不會在電話上收錢。要求轉帳、保密、給證件號＝直接掛斷，零例外。" },
      { s: "租屋廣告便宜到不可思議，房東說人在海外、房子很搶手，「可以視訊帶看」，先匯押金保留。", run: true,
        why: "沒進室內看過的房，一毛不匯。低於行情＋不能實地看房＋催付款，三面紅旗全插了。" },
      { s: "老闆說：「你去辦個 ABN 開發票給我，不然不能上工。」但你是被排班、領時薪的。", run: true,
        why: "假承攬（sham contracting）：被排班＋時薪制＝員工。辦 ABN 等於自己扛掉最低工資、super 和工傷保險。" }
    ];
    var qi = 0, score = 0;
    var sEl = document.getElementById("quiz-scenario");
    var fEl = document.getElementById("quiz-feedback");
    var pEl = document.getElementById("quiz-progress");
    var btnOk = document.getElementById("quiz-accept");
    var btnRun = document.getElementById("quiz-run");
    var btnNext = document.getElementById("quiz-next");
    var show = function () {
      sEl.textContent = "情境 " + (qi + 1) + "：" + Q[qi].s;
      fEl.className = "quiz-feedback";
      fEl.textContent = "";
      pEl.textContent = "第 " + (qi + 1) + " / " + Q.length + " 題";
      btnOk.style.display = btnRun.style.display = "";
      btnNext.style.display = "none";
    };
    var answer = function (saidRun) {
      var correct = (saidRun === Q[qi].run);
      if (correct) score++;
      fEl.className = "quiz-feedback " + (correct ? "good" : "bad");
      fEl.innerHTML = icon(correct ? "check" : "alert") + " <strong>" + (correct ? "答對了！" : "危險！") + "</strong> " + Q[qi].why;
      btnOk.style.display = btnRun.style.display = "none";
      btnNext.style.display = "";
      btnNext.textContent = (qi === Q.length - 1) ? "看結果" : "下一題";
    };
    var finish = function () {
      var title = score >= 7 ? "【防詐大師】可以出師帶學弟妹了。"
        : score >= 5 ? "【有 sense】再把紅旗句字典掃一次就穩了。"
        : "【肥羊體質】出發前把這頁認真讀三遍，會替你省下好幾千。";
      sEl.innerHTML = "測驗結束！你答對 <strong>" + score + " / " + Q.length + "</strong> 題。<br>" + title;
      fEl.className = "quiz-feedback";
      pEl.textContent = "";
      btnNext.textContent = "再玩一次";
      btnNext.onclick = function () { qi = 0; score = 0; btnNext.onclick = nextHandler; show(); };
    };
    var nextHandler = function () { if (qi === Q.length - 1) { finish(); } else { qi++; show(); } };
    btnOk.addEventListener("click", function () { answer(false); });
    btnRun.addEventListener("click", function () { answer(true); });
    btnNext.onclick = nextHandler;
    show();
  }

  /* ================= DASP 速算（leave.html） ================= */
  var dasp = document.getElementById("dasp-calc");
  if (dasp) {
    var bal = document.getElementById("dasp-balance");
    var calcDasp = function () {
      var b = parseFloat(bal.value) || 0;
      var take = b * 0.35, tax = b * 0.65;
      document.getElementById("dasp-take").textContent = fmt(take);
      document.getElementById("dasp-tax").textContent = fmt(tax);
      document.getElementById("dasp-verdict").textContent =
        b <= 0 ? "" : "換算約 NT$" + Math.round(take * 22.8).toLocaleString() + "——當作離澳的驚喜獎金，心情會好很多。";
    };
    bal.addEventListener("input", calcDasp);
    calcDasp();
    dasp.querySelectorAll(".chip[data-amt]").forEach(function (c) {
      c.addEventListener("click", function () { bal.value = c.getAttribute("data-amt"); calcDasp(); });
    });
  }
})();
