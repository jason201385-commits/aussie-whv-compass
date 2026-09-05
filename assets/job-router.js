/* 澳打指南針 — 公開求職篩選導流
 * 只組公開搜尋／權益入口，不蒐集雇主名單、不爬職缺、不上傳輸入。
 */
(function (root) {
  "use strict";

  var STATES = {
    NSW: { code: "NSW", name: "New South Wales", zh: "新南威爾斯" },
    VIC: { code: "VIC", name: "Victoria", zh: "維多利亞" },
    QLD: { code: "QLD", name: "Queensland", zh: "昆士蘭" },
    WA: { code: "WA", name: "Western Australia", zh: "西澳" },
    SA: { code: "SA", name: "South Australia", zh: "南澳" },
    TAS: { code: "TAS", name: "Tasmania", zh: "塔斯馬尼亞" },
    NT: { code: "NT", name: "Northern Territory", zh: "北領地" },
    ACT: { code: "ACT", name: "Australian Capital Territory", zh: "首都領地" }
  };

  var INDUSTRIES = {
    agriculture: {
      zh: "農業／採收",
      keywords: "harvest fruit picker farm",
      seekKeywords: "fruit picker",
      workforceHint: "harvest"
    },
    hospitality: {
      zh: "餐旅／服務",
      keywords: "hospitality kitchen hand",
      seekKeywords: "hospitality",
      workforceHint: "hospitality"
    },
    construction: {
      zh: "營建／施工",
      keywords: "construction labourer",
      seekKeywords: "construction labourer",
      workforceHint: "construction"
    },
    other: {
      zh: "其他／未指定",
      keywords: "casual",
      seekKeywords: "casual",
      workforceHint: "casual"
    }
  };

  var PORTALS = {
    workforce: "https://www.workforceaustralia.gov.au/individuals/jobs/search",
    fairWorkHome: "https://www.fairwork.gov.au/",
    fairWorkPay: "https://www.fairwork.gov.au/pay-and-wages/minimum-wages",
    fairWorkVisa: "https://www.fairwork.gov.au/find-help-for/visa-holders-migrants",
    fairWorkHarvest: "https://horticulture.fairwork.gov.au/working-the-harvest-trail",
    fairWorkHospitality: "https://www.fairwork.gov.au/employment-conditions/awards/awards-summary/ma000009-summary",
    fairWorkConstruction: "https://www.fairwork.gov.au/find-help-for/building-and-construction-sector",
    specifiedWork: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-417/specified-work",
    workPage: "work.html",
    scamPage: "scam.html",
    visaPostcode: "visa.html#postcode-tool"
  };

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function cleanPlace(raw) {
    var text = String(raw || "").replace(/\s+/g, " ").trim();
    if (text.length > 80) text = text.slice(0, 80);
    text = text.replace(/[<>"']/g, "");
    return text;
  }

  function isPostcode(place) {
    return /^\d{4}$/.test(place);
  }

  function locationLabel(state, place) {
    var st = STATES[state];
    if (!st) return "";
    if (!place) return st.name + " (" + st.code + ")";
    if (isPostcode(place)) return place + " " + st.code;
    return place + " " + st.code;
  }

  function seekWhere(state, place) {
    var st = STATES[state];
    if (!st) return "";
    if (!place) return st.name;
    if (isPostcode(place)) return place + " " + st.code + " Australia";
    return place + " " + st.code;
  }

  function seekUrl(keywords, where) {
    return "https://www.seek.com.au/jobs?keywords=" + encodeURIComponent(keywords) +
      "&where=" + encodeURIComponent(where);
  }

  function indeedUrl(keywords, where) {
    return "https://au.indeed.com/jobs?q=" + encodeURIComponent(keywords) +
      "&l=" + encodeURIComponent(where);
  }

  function joraUrl(keywords, where) {
    return "https://au.jora.com/j?q=" + encodeURIComponent(keywords) +
      "&l=" + encodeURIComponent(where);
  }

  function fairWorkForIndustry(industry) {
    if (industry === "agriculture") {
      return {
        href: PORTALS.fairWorkHarvest,
        title: "Fair Work：Working the Harvest Trail（權益，不是職缺板）",
        note: "採收／園藝工作的最低條件、計件與自保提醒。不是職缺名單。"
      };
    }
    if (industry === "hospitality") {
      return {
        href: PORTALS.fairWorkHospitality,
        title: "Fair Work：Hospitality Award 摘要（權益）",
        note: "餐旅 Award 覆蓋誰、怎麼查薪資。實際費率請再用 P.A.C.T. 試算。"
      };
    }
    if (industry === "construction") {
      return {
        href: PORTALS.fairWorkConstruction,
        title: "Fair Work：營建業職場權益",
        note: "營建業 Award 與現場權益入口。不是職缺名單。"
      };
    }
    return {
      href: PORTALS.fairWorkVisa,
      title: "Fair Work：簽證持有人與移工權益",
      note: "打工度假簽證持有人適用同一套最低條件。先看權益，再去投履歷。"
    };
  }

  function buildLinks(input) {
    var state = String((input && input.state) || "").toUpperCase();
    var place = cleanPlace(input && input.place);
    var industry = (input && input.industry) || "other";
    var preferSpecified = !!(input && input.preferSpecified);
    var st = STATES[state];
    var ind = INDUSTRIES[industry] || INDUSTRIES.other;

    if (!st) {
      return {
        ok: false,
        error: "請先選一個州或領地。",
        links: []
      };
    }

    var where = locationLabel(state, place);
    var links = [];

    links.push({
      id: "workforce",
      kind: "government",
      href: PORTALS.workforce,
      title: "Workforce Australia JobSearch（政府職缺板）",
      note: "官方職缺板。進站後用關鍵字「" + ind.workforceHint +
        "」、地點「" + where + "」再搜一次。本站不鏡像、不代登職缺。政府 Harvest Trail 職缺服務已結束，不在這裡導流。",
      hint: ind.workforceHint
    });

    var fw = fairWorkForIndustry(industry);
    links.push({
      id: "fairwork-industry",
      kind: "rights",
      href: fw.href,
      title: fw.title,
      note: fw.note
    });

    links.push({
      id: "fairwork-pay",
      kind: "rights",
      href: PORTALS.fairWorkPay,
      title: "Fair Work：最低薪資官方頁",
      note: "全國最低時薪不是每一份工作的精確費率；Award、職級與時段都可能不同。"
    });

    links.push({
      id: "seek",
      kind: "commercial",
      href: seekUrl(ind.seekKeywords, seekWhere(state, place)),
      title: "Seek 搜尋（第三方、非本站職缺庫）",
      note: "這是 Seek 自己的公開搜尋網址，帶入關鍵字「" + ind.seekKeywords +
        "」與地點「" + seekWhere(state, place) + "」。本站沒有 Seek 職缺庫、沒有付費點數、也不替你排名。",
      disclaimer: "第三方、非本站職缺庫"
    });

    links.push({
      id: "work-guide",
      kind: "site",
      href: PORTALS.workPage,
      title: "本站「找工作」：管道、查核與證照",
      note: "先查 ABN 與薪資，再投履歷。線上平台不是唯一管道。"
    });

    links.push({
      id: "scam-guide",
      kind: "site",
      href: PORTALS.scamPage,
      title: "本站「防詐騙」：先認手法再出門",
      note: "先付錢才有工作、賣集簽天數、扣證件，都先停。"
    });

    if (preferSpecified) {
      links.push({
        id: "specified-work",
        kind: "rights",
        href: PORTALS.specifiedWork,
        title: "內政部 specified-work 官方頁",
        note: "「想優先指定工作地區」只是提醒：郵遞區號符合 ≠ 工作符合 ≠ 簽證核准。職缺板上沒有這個篩選。"
      });
      links.push({
        id: "postcode-tool",
        kind: "site",
        href: PORTALS.visaPostcode,
        title: "本站郵遞區號初篩",
        note: place && isPostcode(place)
          ? "你填了郵遞區號 " + place + "，可拿到簽證頁用同一套官方清單初篩。"
          : "指定工作看的是郵遞區號與職務內容，不是求職網站的城市篩選。"
      });
    }

    return {
      ok: true,
      state: st,
      place: place,
      industry: ind,
      preferSpecified: preferSpecified,
      where: where,
      links: links
    };
  }

  function kindLabel(kind) {
    if (kind === "government") return "政府入口";
    if (kind === "rights") return "權益／官方";
    if (kind === "commercial") return "第三方";
    return "本站";
  }

  function render(result, out) {
    if (!out) return;
    if (!result.ok) {
      out.innerHTML = '<p class="result-verdict result-no">' + escapeHtml(result.error) + "</p>";
      return;
    }

    var html = "";
    html += '<p class="note">本站<strong>沒有職缺庫、不爬第三方、不代登</strong>。下面是依你剛選的條件組出來的公開搜尋／權益入口；點進去後請自己核對雇主、合約與薪資。</p>';
    html += '<p class="fact-meta">條件只留在這個分頁：' + escapeHtml(result.state.zh) + " " +
      escapeHtml(result.state.code);
    if (result.place) html += " · " + escapeHtml(result.place);
    html += " · " + escapeHtml(result.industry.zh);
    if (result.preferSpecified) html += " · 有勾「想優先指定工作地區」（僅說明，不會替你篩職缺）";
    html += "</p>";
    html += '<ul class="jr-links">';
    result.links.forEach(function (link) {
      var external = /^(https?:)?\/\//.test(link.href);
      var rel = ' rel="noopener noreferrer' + (link.kind === "commercial" ? " nofollow" : "") + '"';
      var target = external ? ' target="_blank"' : "";
      html += "<li>";
      html += '<p class="jr-meta"><span class="jr-badge">' + escapeHtml(kindLabel(link.kind)) + "</span>";
      if (link.disclaimer) html += ' <span class="jr-disclaimer">' + escapeHtml(link.disclaimer) + "</span>";
      html += "</p>";
      html += "<p><a class=\"btn" + (link.kind === "commercial" ? " secondary" : "") + "\" href=\"" +
        escapeHtml(link.href) + "\"" + target + rel + ">" + escapeHtml(link.title);
      if (external) html += '<span class="sr-only">（另開新頁）</span>';
      html += "</a></p>";
      html += '<p class="jr-note">' + escapeHtml(link.note) + "</p>";
      html += "</li>";
    });
    html += "</ul>";
    out.innerHTML = html;
  }

  function readForm(form) {
    var stateEl = form.querySelector("#jr-state");
    var placeEl = form.querySelector("#jr-place");
    var industryEl = form.querySelector("#jr-industry");
    var specEl = form.querySelector("#jr-specified");
    return {
      state: stateEl ? stateEl.value : "",
      place: placeEl ? placeEl.value : "",
      industry: industryEl ? industryEl.value : "other",
      preferSpecified: !!(specEl && specEl.checked)
    };
  }

  function init() {
    var form = document.getElementById("job-router-form");
    var out = document.getElementById("job-router-results");
    var status = document.getElementById("job-router-status");
    if (!form || !out) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var result = buildLinks(readForm(form));
      render(result, out);
      if (status) {
        status.textContent = result.ok
          ? "已產生 " + result.links.length + " 個公開入口，沒有上傳你的輸入。"
          : result.error;
      }
      var heading = document.getElementById("jr-results-heading");
      if (heading && typeof heading.focus === "function") heading.focus();
    });
  }

  root.WHV_JOB_ROUTER = {
    buildLinks: buildLinks,
    seekUrl: seekUrl,
    indeedUrl: indeedUrl,
    joraUrl: joraUrl,
    STATES: STATES,
    INDUSTRIES: INDUSTRIES,
    PORTALS: PORTALS
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
