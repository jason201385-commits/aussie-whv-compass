/* 澳打指南針 — 互動工具（純前端，無後端、不收集任何資料） */
(function () {
  "use strict";

  var fmt = function (n) { return "$" + Math.round(n).toLocaleString("en-AU"); };
  var icon = function (name) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; };

  /* ================= 集簽郵遞區號初篩（visa.html） ================= */
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
          ? '<p class="result-verdict result-ok">' + icon("check") + ' Postcode ' + raw + ' (' + st + ') for “' + catName + '” <strong>matches the archived subclass 417 postcode table retrieved on 29 August 2026</strong>.</p>'
            + '<p style="font-size:.9rem">' + (extraNote ? extraNote + " " : "") + 'A postcode match is only one requirement: your actual duties must fit the category, the work must be lawfully paid unless an official volunteer exception applies, and you should keep payslips from day one.</p>'
          : '<p class="result-verdict result-ok">' + icon("check") + ' 郵遞區號 ' + raw + '（' + st + '）做「' + catName + '」——<strong>符合本站 2026-08-29 留存清單的郵遞區號</strong></p>'
            + '<p style="font-size:.9rem">' + (extraNote ? extraNote + " " : "") + '這只完成郵遞區號比對：工作內容仍須符合類別，除官方志工例外外須合法支薪，並從第一天保存 payslip 等證據。</p>';
      } else {
        out.innerHTML = pcEnglish
          ? '<p class="result-verdict result-no">' + icon("x") + ' No match was found for postcode ' + raw + ' (' + st + ') and “' + catName + '” <strong>in the archived table retrieved on 29 August 2026</strong>.</p>'
            + '<p style="font-size:.9rem">' + (extraNote ? extraNote + " " : "") + 'This is not a visa decision. Recheck the exact work postcode, category and current Home Affairs page. This result does not apply to subclass 462.</p>'
          : '<p class="result-verdict result-no">' + icon("x") + ' 郵遞區號 ' + raw + '（' + st + '）與「' + catName + '」——<strong>在本站 2026-08-29 留存清單中沒有找到相符項目</strong></p>'
            + '<p style="font-size:.9rem">' + (extraNote ? extraNote + " " : "") + '這不是簽證資格判定。請重新核對實際工作郵遞區號、工作類型與 Home Affairs 現行頁面；本工具也不適用 subclass 462。</p>';
      }
      out.innerHTML += pcEnglish
        ? '<p class="fact-meta">This comparison uses a local copy of the official subclass 417 tables retrieved on 2026-08-29. Before applying, check the <a href="https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-417/specified-work" rel="noopener">current Home Affairs page</a>.</p>'
        : '<p class="fact-meta">本站比對使用 2026-08-29 留存的官方清單；申請前請以 <a href="https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-417/specified-work" rel="noopener">Home Affairs 現行頁面</a>為準。</p>';
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
    var seasonChallengesZh = {
      1: { work: "假期季節職缺常在前一年 11 月前後就開始招募；櫻桃等短產季也可能幾週內結束。", place: "南部正值夏季火災天氣高風險期；北部則在雨季與熱帶氣旋季，戶外班次、道路與交通可能受影響。" },
      2: { work: "雪季職缺已進入主要投遞窗口；只等到冬天才投可能錯過。部分櫻桃季接近尾聲，不能只看『夏季有採收』。", place: "南部仍須留意高溫與火災天氣；北部仍在雨季／熱帶氣旋季。" },
      3: { work: "VIC／TAS 有多種秋收訊號，但實際工時與計件收入仍會受果量、品種與天候影響。", place: "北部雨季與熱帶氣旋季尚未結束；偏遠道路與住宿備案要先確認。" },
      4: { work: "部分短產季陸續收尾，若只押單一作物，可能很快出現無薪空窗；移動前要先排下一站。", place: "北部直到 4 月底仍屬官方熱帶氣旋季，不能把產季表當成道路可通行保證。" },
      5: { work: "農產工作進入換季，不同地區落差變大；雪季招募多半已比 5 月更早開始。", place: "南部轉冷，偏遠與戶外工作需把保暖、日照和交通納入；北部進入較乾燥季節但不代表一定有職缺。" },
      6: { work: "雪季開始不等於還在大量招人；沒有 offer 與住宿才到雪鎮，選擇和預算壓力都較大。", place: "南部寒冷、戶外工時受天候影響；北部進入火災天氣較高風險季節。" },
      7: { work: "雪場進入熱門時段，臨時找住宿與交通更難；農務則集中在特定修剪、加工與棚內工作。", place: "高山天候與道路可能變動；北部乾季燃料變乾，須看當地火災危險評級。" },
      8: { work: "雪季已到後段，需先規劃合約結束後的工作與住宿；春季產業訊號尚不等於已有職缺。", place: "北部仍處火災天氣高風險期；南部戶外工作仍可能受寒冷與降雨影響。" },
      9: { work: "雪季尾聲與春季農務交接，兩份工作之間可能有空窗；剪羊毛或穀物職類也可能要求經驗或體力。", place: "北部火災天氣風險持續；跨州移動前要查即時預警與道路狀況。" },
      10: { work: "初夏採收與節慶前招募開始出現，但職缺開放日不一致；看到產季開始不代表可直接上工。", place: "北部雨季通常從 10 月開始，強降雨可能影響道路與戶外班次；部分地區火災風險仍高。" },
      11: { work: "購物／假期季節招募較活躍，同時競爭與快速到職需求也可能增加；短產季工作要確認實際結束日。", place: "官方熱帶氣旋季開始；南部植被在晚春轉乾，火災天氣風險逐步上升。" },
      12: { work: "節慶職缺可能早已完成招募；櫻桃、莓果等作物進入產季，也不代表每個農場仍缺人。", place: "南部進入火災天氣高風險期，北部同時處於雨季與熱帶氣旋季；交通、住宿與撤離資訊要能獨立取得。" }
    };
    var seasonChallengesEn = {
      1: { work: "Holiday-season roles often began recruiting around the previous November, and short crops such as cherries may finish within weeks.", place: "Southern Australia is in a higher-risk summer fire-weather period, while northern Australia is in the wet and tropical-cyclone seasons; outdoor shifts and roads can be disrupted." },
      2: { work: "Major alpine application windows are open; waiting until winter can be too late. Some cherry seasons are ending, so 'summer harvest' is not specific enough.", place: "Heat and fire weather can still affect the south, while the north remains in the wet and tropical-cyclone seasons." },
      3: { work: "VIC/TAS tables show several autumn activities, but hours and piece-rate earnings still depend on crop volume, variety and weather.", place: "The northern wet and tropical-cyclone seasons continue; confirm remote-road and accommodation fallbacks." },
      4: { work: "Some short harvests are ending. Relying on one crop can create an unpaid gap, so confirm the next role before moving.", place: "The official northern tropical-cyclone season runs through the end of April; a crop calendar does not guarantee road access." },
      5: { work: "Agriculture is changing seasons and regional differences widen; many alpine roles began recruiting earlier than May.", place: "The south is cooling, so plan for cold, daylight and transport; the northern dry season does not itself guarantee work." },
      6: { work: "The snow season starting does not mean large-scale hiring is still open. Arriving without an offer and housing creates higher budget risk.", place: "Cold and weather affect southern outdoor work, while northern fire-weather risk is increasing." },
      7: { work: "Alpine areas are busy, making last-minute housing and transport harder; farm work is concentrated in particular pruning, processing or shed roles.", place: "Alpine roads and conditions can change, while dry northern fuels require checking local fire-danger ratings." },
      8: { work: "The snow season is moving into its later stage, so plan the next job and housing. Spring production signals are not yet live vacancies.", place: "Northern fire-weather risk continues, while cold and rain can still disrupt southern outdoor work." },
      9: { work: "The snow-season tail and spring agriculture can leave a gap between roles; shearing or grain work may also require experience or physical capacity.", place: "Northern fire-weather risk continues; check current warnings and road conditions before interstate travel." },
      10: { work: "Early-summer harvest and pre-holiday recruitment begin at different times. A season opening does not mean you can start immediately.", place: "The northern wet season generally begins in October, with heavy rain affecting roads and outdoor shifts; fire risk can remain elevated elsewhere." },
      11: { work: "Shopping and holiday recruitment is more active, but competition and rapid-start expectations may also rise. Confirm the end date for short harvests.", place: "The official tropical-cyclone season begins, while late-spring drying increases fire-weather risk in southern Australia." },
      12: { work: "Holiday employers may already have staffed their rosters. Cherries and berries being in season does not mean every farm is still hiring.", place: "Southern fire-weather risk is higher, while the north is in both wet and tropical-cyclone seasons; keep independent transport, accommodation and evacuation information." }
    };

    var seasonSourceLink = function (source) {
      var label = source.evidenceType === "produce-availability"
        ? (seasonEnglish ? "Government produce-availability table" : "政府果品供應表")
        : (seasonEnglish ? "Government harvest-jobs table" : "政府採收工作表");
      return '<a href="' + source.url + '" rel="noopener">' + label + '</a>';
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
      var challenge = (seasonEnglish ? seasonChallengesEn : seasonChallengesZh)[month];
      var challengeCard = challenge
        ? '<aside class="season-challenge">'
          + '<h4>' + (seasonEnglish ? 'Possible difficulties in month ' + month : month + ' 月可能遇到的困境') + '</h4>'
          + '<p><strong>' + (seasonEnglish ? 'Recruitment and hours: ' : '招募與工時：') + '</strong>' + challenge.work + '</p>'
          + '<p><strong>' + (seasonEnglish ? 'Place and weather: ' : '地點與氣候：') + '</strong>' + challenge.place + '</p>'
          + '</aside>'
        : '';

      seasonSummary.innerHTML = seasonEnglish
        ? '<strong>Month ' + month + ':</strong> ' + verifiedCount + ' government source(s) list a harvest or produce-availability item'
        : '<strong>' + month + ' 月：</strong>有 ' + verifiedCount + ' 個政府來源列出採收或果品供應項目';
      seasonDetails.innerHTML = seasonEnglish
        ? '<div class="season-grid">' + cards + '</div>'
          + challengeCard
          + '<p class="season-caveat">Victoria and Tasmania publish harvest-work planning tables. The Northern Territory source is a produce-availability table only. None of them promises a vacancy. Confirm a live role, start date, hours, transport and accommodation before travelling.</p>'
        : '<div class="season-grid">' + cards + '</div>'
          + challengeCard
          + '<p class="season-caveat">VIC、TAS 是採收工作規劃表；NT 來源只是果品供應月份。三者都不是職缺保證。移動前請先確認仍在招募、開工日、工時、交通與住宿。</p>';
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
    var calcEnglish = (document.documentElement.lang || "").toLowerCase().indexOf("en") === 0;
    var incomeWeeks = 46;
    var expenseWeeks = 52;
    var CALC_KEY = "whv-save-calc-v1";
    try {
      var savedCalc = JSON.parse(localStorage.getItem(CALC_KEY) || "null");
      if (savedCalc) {
        if (Number(savedCalc.rate) >= Number(rate.min) && Number(savedCalc.rate) <= Number(rate.max)) rate.value = savedCalc.rate;
        if (Number(savedCalc.hours) >= Number(hours.min) && Number(savedCalc.hours) <= Number(hours.max)) hours.value = savedCalc.hours;
        if (Array.prototype.some.call(city.options, function (o) { return o.value === String(savedCalc.city); })) city.value = savedCalc.city;
        if (Array.prototype.some.call(life.options, function (o) { return o.value === String(savedCalc.life); })) life.value = savedCalc.life;
      }
    } catch (e) { /* 私密視窗或封鎖儲存時略過 */ }
    var whmAnnualTax = function (income) {
      if (income <= 45000) return income * 0.15;
      if (income <= 135000) return 6750 + (income - 45000) * 0.30;
      if (income <= 190000) return 33750 + (income - 135000) * 0.37;
      return 54100 + (income - 190000) * 0.45;
    };
    var update = function () {
      var r = parseFloat(rate.value), h = parseFloat(hours.value);
      document.getElementById("calc-rate-out").textContent = "$" + r.toFixed(2);
      document.getElementById("calc-hours-out").textContent = h + (calcEnglish ? " hours" : " 小時");
      var gross = r * h;
      var annualGross = gross * incomeWeeks;
      var annualTax = whmAnnualTax(annualGross);
      var annualAfterTax = annualGross - annualTax;
      var net = annualAfterTax / incomeWeeks;
      var sup = gross * 0.12;
      var rent = parseFloat(city.value);
      var living = parseFloat(life.value);
      var save = net - rent - living;
      var yearly = annualAfterTax - (rent + living) * expenseWeeks;
      document.getElementById("calc-gross").textContent = fmt(gross);
      document.getElementById("calc-net").textContent = fmt(net);
      document.getElementById("calc-exp").textContent = fmt(rent + living);
      document.getElementById("calc-save").textContent = fmt(save);
      document.getElementById("calc-super").textContent = fmt(sup);
      document.getElementById("calc-year").textContent = fmt(yearly);
      document.getElementById("calc-tax").textContent = fmt(annualTax);
      document.getElementById("calc-twd").textContent = calcEnglish
        ? (rent + living > 0 ? Math.max(0, annualAfterTax / (rent + living)).toFixed(1) + " weeks" : "Not applicable")
        : "約 NT$" + (yearly * 22.8 / 10000).toFixed(1) + " 萬";
      var v = document.getElementById("calc-verdict");
      if (yearly <= 0) {
        v.textContent = calcEnglish
          ? "This plan runs short over a full 52 weeks. Lower the weekly assumptions, increase verified paid hours, or arrive with a larger buffer."
          : "全年估算會入不敷出——降低每週支出假設、增加已確認的有薪工時，或準備更大的落地緩衝金。";
        v.className = "result-verdict result-no";
      } else if (yearly < 10000) {
        v.textContent = calcEnglish
          ? "A narrow annual buffer. Test a bad month, moving costs and a return flight before treating this as spare money."
          : "全年緩衝偏薄——先把淡季、搬家與回程機票壓力測試算進去，再把餘額當可花的錢。";
        v.className = "result-verdict";
      } else if (yearly < 25000) {
        v.textContent = calcEnglish
          ? "A workable planning range, provided the paid hours and weekly costs actually hold. Keep an emergency buffer separate."
          : "規劃上可行——前提是有薪工時與每週支出真的維持住；緊急預備金仍要獨立保留。";
        v.className = "result-verdict result-ok";
      } else {
        v.textContent = calcEnglish
          ? "A strong modelled surplus, not a promise. Stress-test unpaid gaps, travel, tax differences and one large repair or move."
          : "模型顯示餘裕充足，但不是保證——再壓力測試無薪空窗、旅行、稅務差異與一次大型維修或搬家。";
        v.className = "result-verdict result-ok";
      }
      try {
        localStorage.setItem(CALC_KEY, JSON.stringify({
          rate: r,
          hours: h,
          city: city.value,
          cityLabel: city.selectedOptions[0].textContent,
          life: life.value,
          lifeLabel: life.selectedOptions[0].textContent,
          gross: gross,
          annualGross: annualGross,
          annualTax: annualTax,
          net: net,
          expenses: rent + living,
          weeklySave: save,
          yearlySave: yearly,
          incomeWeeks: incomeWeeks,
          expenseWeeks: expenseWeeks,
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
    var prepEnglish = (document.documentElement.lang || "").toLowerCase().indexOf("en") === 0;
    var ITEMS = prepEnglish ? [
      { g: icon("idcard") + " After the visa grant", items: [
        "Insurance ready and the PDS covers my planned work and activities",
        "Travel booked only after receiving the written visa grant",
        "Overseas licence, approved translation or IDP requirements checked",
        "Dental and medical needs reviewed before departure",
        "English resume is ready and every claim is accurate",
        "Qualifications and references translated where useful",
        "Official account-opening requirements checked with my chosen bank",
        "Transfer fees checked and a backup payment method tested"
      ]},
      { g: icon("luggage") + " One week before departure", items: [
        "First-night essentials packed in carry-on luggage",
        "Temporary accommodation booked for 7–14 nights",
        "A modest cash amount and at least two payment paths are ready",
        "Exact medicine and permit requirements checked; original labelled packaging, supporting prescription or doctor's letter, and quantity within the official limit are ready",
        "Passport, grant notice, current VEVO record and policy copies stored in a secure backup",
        "Contact schedule and emergency plan shared with someone I trust"
      ]},
      { g: icon("plane") + " First week in Australia", items: [
        "Phone service activated and I know 000 is for emergencies only",
        "Official local transport route and payment method checked",
        "Free TFN application lodged through the ATO once eligible",
        "Bank account opened and BSB/account details recorded securely",
        "If useful, myGov created through the official site and ATO linking started",
        "Super choice or stapled-fund details checked before onboarding",
        "Scam, insurer and official help routes saved offline"
      ]}
    ] : [
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
    var KEY = prepEnglish ? "whv-prep-check-en-v1" : "whv-prep-check-v1";
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
    var total = 0, html = "";
    ITEMS.forEach(function (grp, gi) {
      html += "<section class='prep-check-group' role='group' aria-labelledby='prep-group-" + gi + "'><h3 id='prep-group-" + gi + "'>" + grp.g + "</h3><ul class='icheck'>";
      grp.items.forEach(function (item, ii) {
        var id = "pc2-" + gi + "-" + ii;
        total++;
        html += "<li><label><input type='checkbox' id='" + id + "'" + (saved[id] ? " checked" : "") + "><span>" + item + "</span></label></li>";
      });
      html += "</ul></section>";
    });
    checklist.innerHTML = html;
    var bar = document.getElementById("prep-progress-bar");
    var label = document.getElementById("prep-progress-label");
    var progress = bar ? bar.parentElement : null;
    var refresh = function () {
      var done = checklist.querySelectorAll("input:checked").length;
      var pct = Math.round(done / total * 100);
      bar.style.width = pct + "%";
      label.textContent = prepEnglish
        ? done + " of " + total + " complete (" + pct + "%)" + (pct === 100 ? " — ready for a final document check" : "")
        : done + " / " + total + " 完成（" + pct + "%）" + (pct === 100 ? " —— 出發吧！" : "");
      if (progress) progress.setAttribute("aria-valuenow", String(done));
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
      if (!confirm(prepEnglish ? "Clear every checklist tick?" : "清空所有勾選？")) return;
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
      { s: "咖啡店店長在開始前說明：請你現場拉花 1 小時展示技能，全程直接監督，也沒有讓你代替正常班次。你同意進行。", run: false, both: true,
        why: "保持警覺沒有錯，你也可以拒絕。這可能符合無薪技能展示，但只能維持合理必要的最短時間並受直接監督；若變成生產性工作或完整無薪班次，判斷就不同。" },
      { s: "Working hostel：「先繳四週房租排隊等工作，搬走的話 88 天文件就不簽了。」", run: true,
        why: "工作綁住宿＋拿集簽要挾＝經典陷阱。二簽的依據是你的薪資單，不是老闆的簽名恩惠。" },
      { s: "群組裡有人換匯，匯率比銀行好 3%，對方先傳了轉帳成功的截圖給你看。", run: true,
        why: "截圖與 pending 狀態可能造假。使用可獨立查驗的受監管服務，並只相信自己從帳戶確認的款項狀態。" },
      { s: "新工作給你書面 offer、合法的 onboarding 與 TFN declaration，並清楚告知第一次發薪與 payslip 日期。", run: false,
        why: "這些是合理的就業訊號，但單一文件不能證明整份工作安全；仍要核對公司、薪率、工作條件與第一次付款。" },
      { s: "接到中文來電自稱移民局：「你的簽證有問題，今天內轉帳 $1,000 重審費，否則遣返。」", run: true,
        why: "先掛斷，不付款也不提供帳號或證件資料；自己開啟 ImmiAccount，再用獨立找到的官方聯絡方式查證。" },
      { s: "租屋廣告便宜到不可思議，房東說人在海外、房子很搶手，「可以視訊帶看」，先匯押金保留。", run: true,
        why: "沒進室內看過的房，一毛不匯。低於行情＋不能實地看房＋催付款，三面紅旗全插了。" },
      { s: "老闆說：「你去辦個 ABN 開發票給我，不然不能上工。」但你會被排班、領時薪並使用公司的設備。", run: true,
        why: "ABN 不會自動決定你是承包商。排班、時薪與公司設備是 employee-like 指標，仍須依契約和實際工作方式整體判斷；這可能是假承攬。" }
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
        + (quizEnglish ? (correct ? "This matches the safer response." : "Recheck this one.") : (correct ? "符合這題的安全判斷。" : "請重看這題的判斷重點。"))
        + "</strong> " + Q[qi].why;
      btnOk.style.display = btnRun.style.display = "none";
      btnNext.style.display = "";
      btnNext.textContent = quizEnglish
        ? ((qi === Q.length - 1) ? "See result" : "Next situation")
        : ((qi === Q.length - 1) ? "看結果" : "下一題");
      btnNext.focus();
    };
    var finish = function () {
      var reviewCount = Q.length - score;
      var title = quizEnglish
        ? (reviewCount === 0
          ? "You reviewed every scenario. Keep verifying real offers independently."
          : "Review " + reviewCount + " explanation" + (reviewCount === 1 ? "" : "s") + " before sending money or identity documents.")
        : (reviewCount === 0
          ? "八個情境都已看完；真實交易仍要逐項獨立查證。"
          : "建議重看 " + reviewCount + " 個判斷重點，再處理匯款、證件或簽約。");
      sEl.innerHTML = quizEnglish
        ? "All " + Q.length + " situations reviewed.<br>" + title + " This exercise does not certify that a person or offer is safe."
        : Q.length + " 個情境已看完。<br>" + title + " 本練習不會認證任何人或交易安全。";
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

  /* ================= DASP 扣繳粗估（leave.html） ================= */
  var dasp = document.getElementById("dasp-calc");
  if (dasp) {
    var bal = document.getElementById("dasp-balance");
    var taxFreeInput = document.getElementById("dasp-tax-free");
    var calcDasp = function () {
      var b = parseFloat(bal.value) || 0;
      var requestedTaxFree = parseFloat(taxFreeInput.value) || 0;
      var taxFree = Math.min(Math.max(requestedTaxFree, 0), b);
      var taxable = Math.max(0, b - taxFree);
      var tax = taxable * 0.65;
      var take = b - tax;
      document.getElementById("dasp-take").textContent = fmt(take);
      document.getElementById("dasp-tax").textContent = fmt(tax);
      document.getElementById("dasp-verdict").textContent =
        b <= 0 ? "" : requestedTaxFree > b
          ? "tax-free component 不能高於總額；本次先按總額上限估算。請用 fund 的 component 資料再核對。"
          : "這只是 component-based 粗估；實際款項由每個 fund 依資料與適用規則計算。";
    };
    bal.addEventListener("input", calcDasp);
    taxFreeInput.addEventListener("input", calcDasp);
    calcDasp();
    dasp.querySelectorAll(".chip[data-amt]").forEach(function (c) {
      c.addEventListener("click", function () { bal.value = c.getAttribute("data-amt"); calcDasp(); });
    });
  }
})();
