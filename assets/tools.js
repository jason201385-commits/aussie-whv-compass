/* 澳打指南針 — 互動工具（純前端，無後端、不收集任何資料） */
(function () {
  "use strict";

  var fmt = function (n) { return "$" + Math.round(n).toLocaleString("en-AU"); };
  var icon = function (name) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; };

  /* ================= 集簽資格快查器（visa.html） ================= */
  var pcTool = document.getElementById("postcode-tool");
  var pcStatus = document.getElementById("pc-status");
  if (pcTool && !window.WHV_POSTCODES) {
    var pcUnavailable = (document.documentElement.lang || "").toLowerCase().indexOf("en") === 0
      ? "The postcode data could not be loaded. Refresh the page or use the linked Home Affairs postcode tables."
      : "郵遞區號資料未能載入，請重新整理，或直接查閱頁面連結的 Home Affairs 官方清單。";
    var pcUnavailableOut = document.getElementById("pc-result");
    pcUnavailableOut.style.display = "block";
    pcUnavailableOut.textContent = pcUnavailable;
    if (pcStatus) pcStatus.textContent = pcUnavailable;
    pcTool.querySelectorAll("input, select, button").forEach(function (control) { control.disabled = true; });
  }
  if (pcTool && window.WHV_POSTCODES) {
    var D = window.WHV_POSTCODES;
    var pcEnglish = (document.documentElement.lang || "").toLowerCase().indexOf("en") === 0;
    var announcePcResult = function (out) {
      if (pcStatus) pcStatus.textContent = out.textContent;
    };
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
        out.innerHTML = '<p class="result-verdict">' + (pcEnglish
          ? 'Enter a four-digit postcode. Keep the leading zero for Northern Territory postcodes such as 0870.'
          : '請輸入 4 位數郵遞區號（北領地含前導零，如 0870）') + '</p>';
        announcePcResult(out);
        return;
      }
      var pc = parseInt(raw, 10);
      var st = stateOf(pc);
      if (!st) {
        out.innerHTML = '<p class="result-verdict result-no">' + icon("x") + (pcEnglish
          ? ' This does not look like an Australian postcode. Check the four digits and try again.'
          : ' 這不像是澳洲的郵遞區號，再確認一下？') + '</p>';
        announcePcResult(out);
        return;
      }
      var ok = false, extraNote = "";
      if (cat === "plant") {
        ok = checkGroup(pc, st, D.regional);
      } else if (cat === "tourism") {
        var t = D.northern_remote_tourism;
        ok = checkGroup(pc, st, t.remote_very_remote) || checkGroup(pc, st, t.northern_australia)
          || inList(pc, (t.extra_postcodes.QLD || []).concat(t.extra_postcodes.TAS || []));
        extraNote = pcEnglish
          ? "Tourism and hospitality work must have been performed after 21 June 2021."
          : "觀光餐旅類：工作須於 2021-06-22 之後進行。";
      } else if (cat === "bushfire") {
        ok = checkGroup(pc, st, D.bushfire.postcodes);
        extraNote = pcEnglish
          ? "Bushfire recovery must have been performed after 31 July 2019 in a declared bushfire-affected area. Eligible volunteer work can count. The official declared-area list can change."
          : "火災復原：限 2019-07-31 之後、於宣告火災區進行的工作（含志工）。宣告區清單官方會更新。";
      } else {
        ok = checkGroup(pc, st, D.disaster.postcodes);
        extraNote = pcEnglish
          ? "Natural-disaster recovery must have been performed after 31 December 2021. Eligible volunteer work can count. The official declared-area list can change."
          : "天災復原：限 2021-12-31 之後的工作（含志工）；申請表 Employment type 須選 flood recovery。宣告區清單官方會更新。";
      }
      var catName = document.getElementById("pc-cat").selectedOptions[0].textContent;
      if (ok) {
        out.innerHTML = pcEnglish
          ? '<p class="result-verdict result-ok">' + icon("check") + ' Postcode ' + raw + ' (' + st + ') for “' + catName + '” is <strong>on the relevant official subclass 417 postcode list</strong>.</p>'
            + '<p style="font-size:.9rem">' + (extraNote ? extraNote + " " : "") + 'A postcode match is only one requirement: your actual duties must fit the category, the work must be lawfully paid unless an official volunteer exception applies, and you should keep payslips from day one.</p>'
          : '<p class="result-verdict result-ok">' + icon("check") + ' 郵遞區號 ' + raw + '（' + st + '）做「' + catName + '」——<strong>在官方合格清單內</strong></p>'
            + '<p style="font-size:.9rem">' + (extraNote ? extraNote + " " : "") + '別忘了三個前提：工作內容要真的屬於該產業、必須合法支薪（黑工不算）、payslip 從第一天就要存。</p>';
      } else {
        out.innerHTML = pcEnglish
          ? '<p class="result-verdict result-no">' + icon("x") + ' Postcode ' + raw + ' (' + st + ') for “' + catName + '” is <strong>not on the relevant official subclass 417 postcode list</strong>.</p>'
            + '<p style="font-size:.9rem">' + (extraNote ? extraNote + " " : "") + 'Most metropolitan areas are excluded. Try the exact work postcode or another category, then check the live official page. This result does not apply to subclass 462.</p>'
          : '<p class="result-verdict result-no">' + icon("x") + ' 郵遞區號 ' + raw + '（' + st + '）做「' + catName + '」——<strong>不在官方合格清單內</strong></p>'
            + '<p style="font-size:.9rem">' + (extraNote ? extraNote + " " : "") + '提示：大城市都會區幾乎都不合格；動植物栽培等要在 regional（SA／TAS／NT 全境皆可），觀光餐旅只限北澳與偏遠地區。換個郵遞區號試試，或改查其他工作類型。</p>';
      }
      out.innerHTML += pcEnglish
        ? '<p class="fact-meta">Based on the official subclass 417 tables retrieved on 2026-08-29. Before applying, check the <a href="https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-417/specified-work" rel="noopener">current Home Affairs page</a>.</p>'
        : '<p class="fact-meta">依 2026-08-29 抓取的官方清單判定，申請前請以 <a href="https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-417/specified-work" rel="noopener">官方頁面現行清單</a>為準。</p>';
      announcePcResult(out);
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
    var seasonSummary = document.getElementById("season-summary");
    var seasonDetails = document.getElementById("season-details");
    var seasonEnglish = (document.documentElement.lang || "").toLowerCase().indexOf("en") === 0;
    var seasonStateEn = {
      NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland", SA: "South Australia",
      WA: "Western Australia", TAS: "Tasmania", NT: "Northern Territory", ACT: "Australian Capital Territory"
    };
    var seasonCropEn = {
      "木瓜": "Papaya", "加工馬鈴薯": "Processing potatoes", "瓜類": "Melons", "白花椰菜": "Cauliflower",
      "百香果": "Passionfruit", "西瓜": "Watermelon", "杏桃": "Apricots", "芒果": "Mangoes",
      "岩瓜": "Rockmelons", "青花菜": "Broccoli", "青貯與乾草": "Silage and hay", "南瓜": "Pumpkins",
      "哈密瓜": "Muskmelons", "柑橘": "Citrus", "紅毛丹": "Rambutans", "胡蘿蔔": "Carrots",
      "香蕉": "Bananas", "夏季水果": "Summer fruit", "草莓": "Strawberries", "乾果": "Dried fruit",
      "剪羊毛旺季": "Peak shearing", "剪羊毛與修剪": "Shearing and crutching", "啤酒花採收": "Hop harvest",
      "啤酒花牽引與整枝": "Hop stringing and training", "梨": "Pears", "球芽甘藍": "Brussels sprouts",
      "甜菜根": "Beetroot", "莓果": "Berries", "棗": "Dates", "棚內剪羊毛助手": "Shearing shed hands",
      "椰子": "Coconuts", "腰果": "Cashews", "葉菜種植與採收": "Leafy vegetable planting and harvest",
      "葡萄柚": "Grapefruit", "酪梨": "Avocados", "種薯": "Seed potatoes", "蜜瓜": "Honeydew melons",
      "鳳梨": "Pineapples", "穀物": "Grain", "蔬菜": "Vegetables", "橙": "Oranges",
      "蕪菁甘藍": "Swedes", "鮮食葡萄": "Table grapes", "檸檬與萊姆": "Lemons and limes",
      "藍莓": "Blueberries", "覆盆莓": "Raspberries", "犢牛飼育": "Calf rearing", "蘋果": "Apples",
      "蘋果與梨": "Apples and pears", "櫻桃": "Cherries", "釀酒葡萄修剪": "Wine-grape pruning",
      "釀酒葡萄採收": "Wine-grape harvest"
    };
    var seasonRegionEn = {
      "北部": "North", "北部、西北部": "North and North West", "北部、西北部、南部": "North, North West and South",
      "北部、南部": "North and South", "西北部、南部": "North West and South", "南部": "South",
      "產區由北往南開始採收": "Harvest moves from northern to southern growing areas",
      "Darwin、Katherine": "Darwin and Katherine", "Darwin、Katherine、Alice Springs": "Darwin, Katherine and Alice Springs",
      "Goulburn Valley、Yarra Valley": "Goulburn Valley and Yarra Valley", "Katherine、Alice Springs": "Katherine and Alice Springs",
      "North East Victoria、Goulburn Valley、Yarra Valley、Dandenongs、Sunraysia": "North East Victoria, Goulburn Valley, Yarra Valley, Dandenongs and Sunraysia",
      "Sunraysia、Swan Hill": "Sunraysia and Swan Hill", "Sunraysia、Werribee、East and West Gippsland": "Sunraysia, Werribee, East and West Gippsland",
      "Swan Hill、Goulburn Valley": "Swan Hill and Goulburn Valley", "Warrnambool 至 Wodonga 一帶": "Warrnambool to Wodonga region",
      "Yarra Valley、Mornington Peninsula": "Yarra Valley and Mornington Peninsula"
    };

    var seasonSourceLink = function (source) {
      return '<a href="' + source.url + '" rel="noopener">' + (seasonEnglish ? "Official table" : "官方表") + '</a>';
    };

    var renderSeason = function (month) {
      if (!seasonData || !seasonOut || !seasonSummary || !seasonDetails) {
        if (seasonSummary) seasonSummary.textContent = seasonEnglish
          ? 'Harvest data could not be loaded. Refresh the page and try again.'
          : '採收資料沒有載入，請重新整理後再試。';
        if (seasonDetails) seasonDetails.innerHTML = '';
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
            + '<h4><span>' + state.code + '</span>' + (seasonEnglish ? seasonStateEn[state.code] : state.name) + '</h4>'
            + '<p>' + (seasonEnglish
              ? 'No state or territory government table suitable for month-by-month conversion was found in this review.'
              : '本次查核未找到可直接轉成採收月份的州政府表格。') + '</p>'
            + '</article>';
        }

        var matches = state.entries.filter(function (entry) { return entry.months.indexOf(month) !== -1; });
        if (matches.length) verifiedCount++;
        var items = matches.length
          ? '<ul>' + matches.map(function (entry) {
              return '<li><strong>' + (seasonEnglish ? (seasonCropEn[entry.crop] || entry.crop) : entry.crop) + '</strong><span>'
                + (seasonEnglish ? (seasonRegionEn[entry.region] || entry.region) : entry.region) + '</span></li>';
            }).join("") + '</ul>'
          : '<p>' + (seasonEnglish ? 'The official table lists no item for this month.' : '官方表在這個月沒有列出項目。') + '</p>';

        return '<article class="season-state' + (matches.length ? ' is-active' : '') + '">'
          + '<h4><span>' + state.code + '</span>' + (seasonEnglish ? seasonStateEn[state.code] : state.name) + '</h4>'
          + items
          + '<p class="fact-meta">' + seasonSourceLink(source) + (seasonEnglish ? ' · page date ' : '・頁面日期 ')
          + (seasonEnglish && source.pageDate === '未標示' ? 'not stated' : source.pageDate) + '</p>'
          + '</article>';
      }).join("");

      seasonSummary.innerHTML = seasonEnglish
        ? '<strong>Month ' + month + ':</strong> ' + verifiedCount + ' state or territory government table(s) list an item'
        : '<strong>' + month + ' 月：</strong>有 ' + verifiedCount + ' 個州／領地在官方表中列出項目';
      seasonDetails.innerHTML = seasonEnglish
        ? '<div class="season-grid">' + cards + '</div>'
          + '<p class="season-caveat">These are government-published harvest or availability months, not a promise of vacancies. Weather, varieties and local growing areas can shift dates. Confirm actual shifts with the employer before travelling.</p>'
        : '<div class="season-grid">' + cards + '</div>'
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
    var CALC_KEY = "whv-save-calc-v1";
    try {
      var savedCalc = JSON.parse(localStorage.getItem(CALC_KEY) || "null");
      if (savedCalc) {
        if (Number(savedCalc.rate) >= 24 && Number(savedCalc.rate) <= 45) rate.value = savedCalc.rate;
        if (Number(savedCalc.hours) >= 0 && Number(savedCalc.hours) <= 50) hours.value = savedCalc.hours;
        if (Array.prototype.some.call(city.options, function (o) { return o.value === String(savedCalc.city); })) city.value = savedCalc.city;
        if (Array.prototype.some.call(life.options, function (o) { return o.value === String(savedCalc.life); })) life.value = savedCalc.life;
      }
    } catch (e) { /* 私密視窗或封鎖儲存時略過 */ }
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
      try {
        localStorage.setItem(CALC_KEY, JSON.stringify({
          rate: r,
          hours: h,
          city: city.value,
          cityLabel: city.selectedOptions[0].textContent,
          life: life.value,
          lifeLabel: life.selectedOptions[0].textContent,
          gross: gross,
          net: net,
          expenses: rent + living,
          weeklySave: save,
          yearlySave: yearly,
          updated: new Date().toISOString()
        }));
      } catch (e) { /* 私密視窗或封鎖儲存時略過 */ }
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

  /* ================= 我的行前海報（prep.html） ================= */
  var posterTool = document.getElementById("prep-poster");
  if (posterTool) {
    var posterButton = document.getElementById("poster-download");
    var posterStatus = document.getElementById("poster-status");
    var posterPreviewWrap = document.getElementById("poster-preview-wrap");
    var posterPreview = document.getElementById("poster-preview");
    var posterSaveLink = document.getElementById("poster-save-link");
    var posterUrl = null;

    var readStored = function (key) {
      try { return JSON.parse(localStorage.getItem(key) || "null"); }
      catch (e) { return null; }
    };

    var roundRect = function (ctx, x, y, width, height, radius) {
      var r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r);
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    var wrapPosterText = function (ctx, value, maxWidth, maxLines) {
      var chars = Array.from(String(value || "").replace(/\s+/g, " ").trim());
      if (!chars.length) return ["尚未填寫"];
      var lines = [], line = "";
      chars.forEach(function (ch) {
        var next = line + ch;
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line);
          line = ch;
        } else {
          line = next;
        }
      });
      if (line) lines.push(line);
      if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        var last = lines[maxLines - 1];
        while (last && ctx.measureText(last + "…").width > maxWidth) last = last.slice(0, -1);
        lines[maxLines - 1] = last + "…";
      }
      return lines;
    };

    var drawWrapped = function (ctx, value, x, y, maxWidth, lineHeight, maxLines) {
      var lines = wrapPosterText(ctx, value, maxWidth, maxLines);
      lines.forEach(function (line, index) { ctx.fillText(line, x, y + index * lineHeight); });
      return y + lines.length * lineHeight;
    };

    var drawPosterPanel = function (ctx, x, y, width, height, fill) {
      ctx.save();
      ctx.fillStyle = "#221d15";
      roundRect(ctx, x + 10, y + 10, width, height, 28);
      ctx.fill();
      ctx.fillStyle = fill;
      ctx.strokeStyle = "#221d15";
      ctx.lineWidth = 5;
      roundRect(ctx, x, y, width, height, 28);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    var makePoster = function (worksheet, prepData, calcData) {
      var canvas = document.createElement("canvas");
      canvas.width = 1240;
      canvas.height = 1754;
      var ctx = canvas.getContext("2d");
      var done = Object.keys(prepData || {}).filter(function (key) { return prepData[key] === true; }).length;
      var total = 21;
      var pct = Math.round(done / total * 100);
      var pending = Array.prototype.slice.call(document.querySelectorAll("#prep-checklist input:not(:checked)"), 0, 3).map(function (box) {
        var text = box.closest("label").querySelector("span");
        return text ? text.textContent : "待完成項目";
      });

      ctx.fillStyle = "#f6f1e7";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#221d15";
      ctx.lineWidth = 8;
      ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

      ctx.fillStyle = "#e6b83f";
      ctx.beginPath();
      ctx.moveTo(930, 38);
      ctx.bezierCurveTo(1140, 25, 1240, 105, 1205, 290);
      ctx.bezierCurveTo(1100, 235, 1000, 300, 900, 215);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3f7252";
      ctx.beginPath();
      ctx.moveTo(34, 1480);
      ctx.bezierCurveTo(150, 1400, 265, 1490, 250, 1720);
      ctx.lineTo(34, 1720);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#c44d2b";
      ctx.font = '900 28px "Noto Sans TC", sans-serif';
      ctx.fillText("AUSSIE WHV COMPASS", 86, 112);
      ctx.fillStyle = "#221d15";
      ctx.font = '900 78px "Noto Serif TC", Georgia, serif';
      ctx.fillText("我的澳打行前海報", 82, 210);
      ctx.font = '500 25px "Noto Sans TC", sans-serif';
      ctx.fillStyle = "#6b6257";
      ctx.fillText("產生日期 " + new Date().toLocaleDateString("zh-TW") + " ・ 全程在你的裝置上生成", 86, 260);

      drawPosterPanel(ctx, 82, 305, 1076, 215, "#e9d79a");
      ctx.fillStyle = "#221d15";
      ctx.font = '900 31px "Noto Sans TC", sans-serif';
      ctx.fillText("行前清單進度", 120, 360);
      ctx.font = '900 78px "Noto Serif TC", Georgia, serif';
      ctx.fillText(done + " / " + total, 120, 452);
      ctx.textAlign = "right";
      ctx.font = '900 34px "Noto Sans TC", sans-serif';
      ctx.fillText(pct + "%", 1110, 420);
      ctx.textAlign = "left";
      ctx.fillStyle = "#fffdf8";
      roundRect(ctx, 580, 438, 530, 30, 15);
      ctx.fill();
      if (pct > 0) {
        ctx.fillStyle = "#c44d2b";
        roundRect(ctx, 580, 438, 530 * pct / 100, 30, 15);
        ctx.fill();
      }

      drawPosterPanel(ctx, 82, 555, 1076, 480, "#fffdf8");
      ctx.fillStyle = "#c44d2b";
      ctx.font = '900 29px "Noto Sans TC", sans-serif';
      ctx.fillText("方向與底線", 120, 612);
      var answerRows = [
        ["為什麼出發", worksheet.q1],
        ["最重要的收穫", worksheet.q4 || worksheet.q5],
        ["停留與集簽計畫", worksheet.q6],
        ["我的止損線", worksheet.q7]
      ];
      var rowY = 660;
      answerRows.forEach(function (row) {
        ctx.fillStyle = "#3f7252";
        ctx.font = '800 23px "Noto Sans TC", sans-serif';
        ctx.fillText(row[0], 120, rowY);
        ctx.fillStyle = row[1] ? "#221d15" : "#8a8175";
        ctx.font = '600 27px "Noto Sans TC", sans-serif';
        drawWrapped(ctx, row[1], 330, rowY, 775, 35, 2);
        rowY += 98;
      });

      drawPosterPanel(ctx, 82, 1070, 1076, 285, "#dfeae2");
      ctx.fillStyle = "#221d15";
      ctx.font = '900 29px "Noto Sans TC", sans-serif';
      ctx.fillText("接下來三件事", 120, 1128);
      ctx.font = '600 25px "Noto Sans TC", sans-serif';
      if (!pending.length) pending = ["行前清單已全部完成，出發前再做最後一次文件確認"];
      pending.forEach(function (item, index) {
        ctx.fillStyle = "#c44d2b";
        ctx.fillText(String(index + 1).padStart(2, "0"), 122, 1185 + index * 57);
        ctx.fillStyle = "#221d15";
        drawWrapped(ctx, item, 180, 1185 + index * 57, 900, 31, 1);
      });

      drawPosterPanel(ctx, 82, 1390, 1076, 230, "#f6c8b9");
      ctx.fillStyle = "#221d15";
      ctx.font = '900 29px "Noto Sans TC", sans-serif';
      ctx.fillText("存錢計畫", 120, 1448);
      if (calcData && Number.isFinite(Number(calcData.yearlySave))) {
        ctx.font = '900 58px "Noto Serif TC", Georgia, serif';
        ctx.fillText("A$" + Math.round(calcData.yearlySave).toLocaleString("en-AU"), 120, 1535);
        ctx.font = '600 23px "Noto Sans TC", sans-serif';
        ctx.fillStyle = "#6b3b2c";
        ctx.fillText("年存款粗估（46 週）", 120, 1580);
        ctx.fillStyle = "#221d15";
        ctx.font = '700 25px "Noto Sans TC", sans-serif';
        ctx.fillText("時薪 A$" + Number(calcData.rate).toFixed(2) + " ・ 每週 " + calcData.hours + " 小時", 650, 1502);
        ctx.font = '500 21px "Noto Sans TC", sans-serif';
        drawWrapped(ctx, calcData.cityLabel + " ・ " + calcData.lifeLabel, 650, 1548, 440, 29, 2);
      } else {
        ctx.font = '600 28px "Noto Sans TC", sans-serif';
        ctx.fillText("尚未跑過存錢試算器", 120, 1530);
      }

      ctx.fillStyle = "#221d15";
      ctx.font = '700 21px "Noto Sans TC", sans-serif';
      ctx.fillText("澳打指南針 ・ 公開攻略免費 ・ 資料只留在本機", 420, 1690);
      return canvas;
    };

    posterButton.addEventListener("click", function () {
      var worksheet = readStored("whv-worksheet-v1") || {};
      var prepData = readStored("whv-prep-check-v1") || {};
      var calcData = readStored("whv-save-calc-v1");
      var hasWorksheet = Object.keys(worksheet).some(function (key) { return String(worksheet[key] || "").trim(); });
      var hasChecklist = Object.keys(prepData).some(function (key) { return prepData[key] === true; });
      var hasCalc = calcData && Number.isFinite(Number(calcData.yearlySave));

      if (!hasWorksheet && !hasChecklist && !hasCalc) {
        posterStatus.textContent = "目前沒有可放上海報的內容。先填自我釐清、勾一項清單，或跑一次存錢試算器。";
        posterPreviewWrap.hidden = true;
        return;
      }

      posterButton.disabled = true;
      posterStatus.textContent = "正在排版 PNG…";
      var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      fontsReady.then(function () {
        var canvas = makePoster(worksheet, prepData, calcData);
        var finishDownload = function (href) {
          posterPreview.src = href;
          posterPreviewWrap.hidden = false;
          posterSaveLink.href = href;
          posterSaveLink.hidden = false;
          posterSaveLink.click();
          posterStatus.textContent = "PNG 已產生。若手機沒有自動下載，可長按預覽圖儲存。";
          posterButton.disabled = false;
        };

        if (canvas.toBlob) {
          canvas.toBlob(function (blob) {
            if (!blob) {
              finishDownload(canvas.toDataURL("image/png"));
              return;
            }
            if (posterUrl) URL.revokeObjectURL(posterUrl);
            posterUrl = URL.createObjectURL(blob);
            finishDownload(posterUrl);
          }, "image/png");
        } else {
          finishDownload(canvas.toDataURL("image/png"));
        }
      }).catch(function () {
        posterStatus.textContent = "這個瀏覽器無法產生海報，請更新瀏覽器後再試。";
        posterButton.disabled = false;
      });
    });
  }

  /* ================= 防詐測驗（scam.html） ================= */
  var quiz = document.getElementById("scam-quiz");
  if (quiz) {
    var quizButtons = quiz.querySelector(".quiz-btns");
    if (quizButtons) quizButtons.hidden = false;
    var quizEnglish = (document.documentElement.lang || "").toLowerCase().indexOf("en") === 0;
    var Q = quizEnglish ? [
      { id: "upfront_job_fee", s: "A recruiter messages you: 'Farm job, instant hire. Transfer a $300 security deposit today and start tomorrow.'", run: true,
        why: "Paying money to start a job is a major warning sign. Verify the recruiter independently and never transfer an up-front recruitment deposit." },
      { id: "short_supervised_trial", s: "Before it starts, a cafe manager explains that a one-hour coffee-making skill demonstration is unpaid. You agree, remain directly supervised and do not cover a normal shift.", run: false, both: true,
        why: "Caution is valid, and you can always decline. This may fit a lawful unpaid trial only if it is no longer than reasonably needed to show the skill and remains directly supervised. Productive work or a whole unpaid shift changes the answer." },
      { id: "hostel_leverage", s: "A working hostel requires four weeks of rent before any shifts and says it will withhold your specified-work records if you leave.", run: true,
        why: "Work tied to prepaid accommodation plus threats about genuine records creates several exploitation red flags. Get the job and accommodation terms separately in writing." },
      { id: "exchange_screenshot", s: "Someone in a group offers a better exchange rate and sends a screenshot showing that their transfer to you succeeded.", run: true,
        why: "Screenshots and pending payments can be faked. Use a regulated service and rely only on independently confirmed funds in your own account." },
      { id: "written_onboarding", s: "A new employer gives you a written offer, legitimate onboarding, a TFN declaration and a clear date for your first payslip.", run: false,
        why: "Those are reasonable employment signals. Still verify the business, rate and first payment because no single document proves the whole offer is safe." },
      { id: "visa_payment_call", s: "A caller claims to be from Home Affairs and says you must pay $1,000 today or your visa will be cancelled.", run: true,
        why: "End the call. Do not pay or reveal account details. Check your own ImmiAccount and contact Home Affairs through details you found independently." },
      { id: "rental_deposit", s: "A rental is far below the local price. The owner is overseas and offers only a video tour, but wants the bond now.", run: true,
        why: "An unusually low price, no in-person inspection, an overseas story and urgent payment are multiple rental-scam warnings." },
      { id: "sham_contracting", s: "You are rostered, paid hourly and use the business's equipment, but the boss says you need an ABN and must invoice to start.", run: true,
        why: "An ABN does not decide whether you are a contractor. This may be sham contracting designed to remove employee entitlements." }
    ] : [
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
      sEl.textContent = quizEnglish
        ? "Situation " + (qi + 1) + ": " + Q[qi].s
        : "情境 " + (qi + 1) + "：" + Q[qi].s;
      fEl.className = "quiz-feedback";
      fEl.textContent = "";
      pEl.textContent = quizEnglish
        ? "Question " + (qi + 1) + " of " + Q.length
        : "第 " + (qi + 1) + " / " + Q.length + " 題";
      btnOk.style.display = btnRun.style.display = "";
      btnNext.style.display = "none";
    };
    var answer = function (saidRun) {
      var correct = Q[qi].both === true || (saidRun === Q[qi].run);
      if (correct) score++;
      fEl.className = "quiz-feedback " + (correct ? "good" : "bad");
      fEl.innerHTML = (quizEnglish ? "" : icon(correct ? "check" : "alert")) + " <strong>"
        + (quizEnglish ? (correct ? "Correct." : "Recheck this one.") : (correct ? "答對了！" : "危險！"))
        + "</strong> " + Q[qi].why;
      btnOk.style.display = btnRun.style.display = "none";
      btnNext.style.display = "";
      btnNext.textContent = quizEnglish
        ? ((qi === Q.length - 1) ? "See result" : "Next situation")
        : ((qi === Q.length - 1) ? "看結果" : "下一題");
      btnNext.focus();
    };
    var finish = function () {
      var title = quizEnglish
        ? (score >= 7 ? "Strong scam-safety instincts. Keep checking independently."
          : score >= 5 ? "Good start. Review the explanations you missed."
          : "Review the red flags before sending money or identity documents.")
        : (score >= 7 ? "【防詐大師】可以出師帶學弟妹了。"
          : score >= 5 ? "【有 sense】再把紅旗句字典掃一次就穩了。"
          : "【肥羊體質】出發前把這頁認真讀三遍，會替你省下好幾千。");
      sEl.innerHTML = quizEnglish
        ? "Quiz complete: <strong>" + score + " of " + Q.length + "</strong> correct.<br>" + title
        : "測驗結束！你答對 <strong>" + score + " / " + Q.length + "</strong> 題。<br>" + title;
      fEl.className = "quiz-feedback";
      pEl.textContent = "";
      btnNext.textContent = quizEnglish ? "Try again" : "再玩一次";
      btnNext.onclick = function () {
        qi = 0;
        score = 0;
        btnNext.onclick = nextHandler;
        show();
        sEl.focus();
      };
      btnNext.focus();
    };
    var nextHandler = function () {
      if (qi === Q.length - 1) {
        finish();
      } else {
        qi++;
        show();
        sEl.focus();
      }
    };
    btnOk.addEventListener("click", function () { answer(false); });
    btnRun.addEventListener("click", function () { answer(true); });
    btnNext.onclick = nextHandler;
    show();
  }

  /* ================= 離澳收尾清單（leave.html） ================= */
  var leaveChecklist = document.getElementById("leave-checklist");
  if (leaveChecklist) {
    var LEAVE_KEY = "whv-leave-check-v1";
    var leaveBoxes = leaveChecklist.querySelectorAll('input[type="checkbox"]');
    var leaveSaved = {};
    try {
      var parsedLeave = JSON.parse(localStorage.getItem(LEAVE_KEY) || "{}");
      if (parsedLeave && typeof parsedLeave === "object" && !Array.isArray(parsedLeave)) leaveSaved = parsedLeave;
    } catch (e) { /* 私密視窗、封鎖儲存或無效資料時略過 */ }

    leaveBoxes.forEach(function (box) { box.checked = leaveSaved[box.id] === true; });
    var leaveBar = document.getElementById("leave-progress-bar");
    var leaveLabel = document.getElementById("leave-progress-label");
    var leaveComplete = document.getElementById("leave-checklist-complete");
    var refreshLeave = function () {
      var done = leaveChecklist.querySelectorAll("input:checked").length;
      var total = leaveBoxes.length;
      var pct = total ? Math.round(done / total * 100) : 0;
      leaveBar.style.width = pct + "%";
      leaveLabel.textContent = done + " / " + total + " 完成（" + pct + "%）";
      leaveComplete.hidden = done !== total;
      try {
        var data = {};
        leaveBoxes.forEach(function (box) { data[box.id] = box.checked; });
        localStorage.setItem(LEAVE_KEY, JSON.stringify(data));
      } catch (e) { /* 私密視窗或封鎖儲存時略過 */ }
    };

    leaveChecklist.addEventListener("change", refreshLeave);
    refreshLeave();
    var leaveReset = document.getElementById("leave-reset");
    if (leaveReset) leaveReset.addEventListener("click", function () {
      if (!confirm("清除所有離澳清單勾選？")) return;
      leaveBoxes.forEach(function (box) { box.checked = false; });
      refreshLeave();
      leaveReset.focus();
    });
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
