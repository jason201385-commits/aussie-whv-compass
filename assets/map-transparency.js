/* 澳打指南針 — 集簽透明地圖（Leaflet 真地圖 + 官方郵遞區號圖層）
 * GeoJSON: assets/au-states.geojson（australian-states / rowanhogan，另加 STATE_ABBR）
 * 不蒐集雇主名單、不複製第三方商業資料庫。
 */
(function () {
  "use strict";

  var D = window.WHV_POSTCODES;
  var S = window.WHV_SEASONS;
  var root = document.getElementById("transparency-map");
  if (!root) return;
  if (!D) {
    root.insertAdjacentHTML("afterbegin", '<p class="note">集簽郵遞區號資料載入失敗，請重新整理，或直接查閱內政部指定工作官方頁。</p>');
    return;
  }
  if (typeof L === "undefined") {
    root.insertAdjacentHTML("afterbegin", '<p class="note">地圖函式庫載入失敗。請檢查網路後重新整理；下方仍可用郵遞區號初篩。</p>');
  }

  var layerSelect = document.getElementById("tm-layer");
  var stateSelect = document.getElementById("tm-state-select");
  var stateButtons = root.querySelectorAll("[data-tm-state]");
  var detail = document.getElementById("tm-detail");
  var pcInput = document.getElementById("tm-postcode");
  var pcCat = document.getElementById("tm-category");
  var pcBtn = document.getElementById("tm-check");
  var pcOut = document.getElementById("tm-postcode-result");
  var seasonBox = document.getElementById("tm-seasons");
  var mapEl = document.getElementById("tm-leaflet-map");
  var selectedState = "ALL";
  var geoLayer = null;
  var map = null;
  var geojsonData = null;

  var LAYERS = {
    regional: {
      label: "區域澳洲（農漁林礦建等）",
      hint: "適用 Plant and animal cultivation、Fishing and pearling、Tree farming and felling、Mining、Construction 等指定工作（官方 Table 4）。",
      getGroup: function () { return D.regional; }
    },
    tourism: {
      label: "觀光旅宿餐飲（偏遠／北澳）",
      hint: "觀光與餐旅指定工作：官方以 Remote／Very Remote、Northern Australia 與追加郵遞區號三表聯集判定。",
      getGroup: function () {
        var t = D.northern_remote_tourism || {};
        return {
          NSW: unionLists(t.remote_very_remote && t.remote_very_remote.NSW, t.northern_australia && t.northern_australia.NSW),
          VIC: unionLists(t.remote_very_remote && t.remote_very_remote.VIC, t.northern_australia && t.northern_australia.VIC),
          QLD: unionLists(t.remote_very_remote && t.remote_very_remote.QLD, t.northern_australia && t.northern_australia.QLD, t.extra_postcodes && t.extra_postcodes.QLD),
          WA: unionLists(t.remote_very_remote && t.remote_very_remote.WA, t.northern_australia && t.northern_australia.WA),
          SA: unionLists(t.remote_very_remote && t.remote_very_remote.SA, t.northern_australia && t.northern_australia.SA),
          TAS: unionLists(t.remote_very_remote && t.remote_very_remote.TAS, t.northern_australia && t.northern_australia.TAS, t.extra_postcodes && t.extra_postcodes.TAS),
          NT: "ALL",
          ACT: [],
          NORFOLK: []
        };
      }
    },
    bushfire: {
      label: "森林火災重建區",
      hint: "官方 Bushfire declared areas（Table 5）。是否仍開放、適用日期以內政部頁面為準。",
      getGroup: function () { return (D.bushfire && D.bushfire.postcodes) || {}; }
    },
    disaster: {
      label: "災害復原區",
      hint: "官方災害／復原相關指定工作郵遞區號（Table 6）。",
      getGroup: function () { return (D.disaster && D.disaster.postcodes) || {}; }
    }
  };

  function unionLists() {
    var out = [], seen = Object.create(null);
    for (var i = 0; i < arguments.length; i++) {
      var list = arguments[i];
      if (!list) continue;
      if (list === "ALL") return "ALL";
      for (var j = 0; j < list.length; j++) {
        var v = list[j];
        if (!seen[v]) { seen[v] = true; out.push(v); }
      }
    }
    return out;
  }

  function expandRanges(list) {
    if (list === "ALL") return "ALL";
    if (!list || !list.length) return [];
    var nums = [];
    list.forEach(function (token) {
      var m = String(token).match(/^(\d{4})-(\d{4})$/);
      if (m) {
        var a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        for (var n = a; n <= b; n++) nums.push(n);
      } else {
        var one = parseInt(token, 10);
        if (!isNaN(one)) nums.push(one);
      }
    });
    return nums;
  }

  function stateHasCoverage(group, code) {
    if (!group) return false;
    var v = group[code];
    if (v === "ALL") return true;
    if (Array.isArray(v) && v.length) return true;
    return false;
  }

  function summarizeList(list) {
    if (list === "ALL") return "全州／領地皆可能符合（仍須核對工作內容與日期）";
    if (!list || !list.length) return "此層在該州目前沒有列出郵遞區號";
    var sample = list.slice(0, 8).join("、");
    var more = list.length > 8 ? " 等共 " + list.length + " 段／碼" : "（共 " + list.length + " 段／碼）";
    return sample + more;
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function currentGroup() {
    var layerKey = layerSelect ? layerSelect.value : "regional";
    var layer = LAYERS[layerKey] || LAYERS.regional;
    return { layer: layer, group: layer.getGroup() || {}, key: layerKey };
  }

  function setActiveState(code) {
    selectedState = code || "ALL";
    stateButtons.forEach(function (btn) {
      var on = btn.getAttribute("data-tm-state") === selectedState;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (stateSelect) stateSelect.value = selectedState;
    if (geoLayer) geoLayer.setStyle(styleFeature);
    render();
  }

  function styleFeature(feature) {
    var code = feature.properties && feature.properties.STATE_ABBR;
    var covered = stateHasCoverage(currentGroup().group, code);
    var selected = code === selectedState;
    return {
      fillColor: selected ? "#c05621" : (covered ? "#e6b84d" : "#d7e2dc"),
      weight: selected ? 2.5 : 1,
      opacity: 1,
      color: selected ? "#27342e" : "#53645b",
      fillOpacity: selected ? 0.72 : (covered ? 0.55 : 0.25)
    };
  }

  function onEachFeature(feature, layer) {
    var code = feature.properties.STATE_ABBR;
    var name = feature.properties.STATE_NAME || code;
    layer.bindTooltip(name + (code ? " (" + code + ")" : ""), { sticky: true });
    layer.on({
      click: function () { setActiveState(code); },
      mouseover: function (e) { e.target.setStyle({ weight: 2.5, fillOpacity: 0.75 }); },
      mouseout: function (e) { geoLayer.resetStyle(e.target); }
    });
  }

  function initMap(data) {
    if (!mapEl || typeof L === "undefined") return;
    map = L.map(mapEl, { scrollWheelZoom: false }).setView([-25.5, 134.5], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 12,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    geoLayer = L.geoJSON(data, { style: styleFeature, onEachFeature: onEachFeature }).addTo(map);
    try { map.fitBounds(geoLayer.getBounds(), { padding: [12, 12] }); } catch (e) {}
    mapEl.addEventListener("focusin", function () { map.scrollWheelZoom.enable(); });
  }

  function renderSeasons(code) {
    if (!seasonBox) return;
    if (!S || !S.states) {
      seasonBox.innerHTML = "<p class=\"fact-meta\">尚無採收月份資料檔。</p>";
      return;
    }
    var st = S.states.find(function (x) { return x.code === code; });
    if (!st || !st.entries || !st.entries.length) {
      seasonBox.innerHTML = "<p class=\"fact-meta\">「" + escapeHtml(code) + "」目前沒有已追溯到州政府來源的採收月份條目。</p>";
      return;
    }
    var monthNames = ["", "1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
    var html = "<ul class=\"tm-season-list\">";
    st.entries.forEach(function (e) {
      var months = (e.months || []).map(function (m) { return monthNames[m] || m; }).join("、");
      html += "<li><strong>" + escapeHtml(e.crop) + "</strong> — " + escapeHtml(e.region || "") +
        "<br><span class=\"fact-meta\">約 " + escapeHtml(months) + "（採收／供應參考，不保證職缺）</span></li>";
    });
    html += "</ul>";
    seasonBox.innerHTML = html;
  }

  function render() {
    var cur = currentGroup();
    var group = cur.group;
    var layer = cur.layer;
    if (geoLayer) geoLayer.setStyle(styleFeature);

    var html = "";
    html += "<p class=\"section-eyebrow\">目前圖層</p>";
    html += "<h3>" + escapeHtml(layer.label) + "</h3>";
    html += "<p>" + escapeHtml(layer.hint) + "</p>";
    html += '<p class="fact-meta">郵遞區號資料抓取：' + escapeHtml(D.retrieved || "") +
      ' ・ <a href="' + escapeHtml(D.source || "#") + '" rel="noopener">內政部 specified-work 官方頁</a></p>';
    html += '<p class="fact-meta">地圖底圖：OpenStreetMap ・ 州界 GeoJSON 開源資料（見 assets 說明）</p>';

    if (selectedState === "ALL") {
      html += "<p><strong>全澳總覽：</strong>點地圖上的州／領地；金色＝此圖層有列出範圍。</p><ul>";
      ["NSW","VIC","QLD","WA","SA","TAS","NT","ACT"].forEach(function (code) {
        var mark = stateHasCoverage(group, code) ? "✓" : "—";
        html += "<li><strong>" + code + "</strong> " + mark + " " + escapeHtml(summarizeList(group[code])) + "</li>";
      });
      html += "</ul>";
      if (seasonBox) seasonBox.innerHTML = "<p class=\"fact-meta\">點選州別後，顯示該州已收錄的採收月份參考。</p>";
    } else {
      var v = group[selectedState];
      html += "<p><strong>" + selectedState + "</strong>：" + escapeHtml(summarizeList(v)) + "</p>";
      if (Array.isArray(v) && v.length) {
        html += "<details><summary>展開 " + selectedState + " 全部區段</summary><p class=\"tm-ranges\">" +
          escapeHtml(v.join("、")) + "</p></details>";
      }
      renderSeasons(selectedState);
    }
    html += '<p class="note">郵遞區號符合 ≠ 簽證核准。實際職務、支薪、天數計算與個人資格，請以內政部規則與你的證據為準。</p>';
    if (detail) detail.innerHTML = html;
  }

  function inExpanded(pc, list) {
    if (list === "ALL") return true;
    var nums = expandRanges(list);
    if (nums === "ALL") return true;
    return nums.indexOf(pc) !== -1;
  }

  function stateFromPostcode(pc) {
    if (pc >= 1000 && pc <= 1999) return "NSW";
    if (pc >= 2000 && pc <= 2599) return "NSW";
    if (pc >= 2619 && pc <= 2899) return "NSW";
    if (pc >= 2600 && pc <= 2618) return "ACT";
    if (pc >= 2900 && pc <= 2920) return "ACT";
    if (pc >= 3000 && pc <= 3999) return "VIC";
    if (pc >= 4000 && pc <= 4999) return "QLD";
    if (pc >= 5000 && pc <= 5999) return "SA";
    if (pc >= 6000 && pc <= 6999) return "WA";
    if (pc >= 7000 && pc <= 7999) return "TAS";
    if (pc >= 800 && pc <= 999) return "NT";
    return null;
  }

  function checkPostcode() {
    if (!pcOut) return;
    var raw = (pcInput && pcInput.value || "").trim();
    if (!/^\d{4}$/.test(raw)) {
      pcOut.innerHTML = '<p class="result-verdict result-no">請輸入四位數字郵遞區號（北領地請保留前導 0，例如 0870）。</p>';
      return;
    }
    var pc = parseInt(raw, 10);
    var st = stateFromPostcode(pc);
    if (!st) {
      pcOut.innerHTML = '<p class="result-verdict result-no">無法判斷州別，請確認郵遞區號。</p>';
      return;
    }
    setActiveState(st);
    var cat = (pcCat && pcCat.value) || "regional";
    var ok = false;
    var label = "";
    if (cat === "regional") {
      ok = inExpanded(pc, D.regional[st]);
      label = "區域澳洲指定工作";
    } else if (cat === "tourism") {
      var t = D.northern_remote_tourism || {};
      ok = inExpanded(pc, (t.remote_very_remote && t.remote_very_remote[st]) || []) ||
           inExpanded(pc, (t.northern_australia && t.northern_australia[st]) || []) ||
           inExpanded(pc, (t.extra_postcodes && t.extra_postcodes[st]) || []);
      if (st === "NT") ok = true;
      label = "觀光旅宿餐飲（偏遠／北澳聯集）";
    } else if (cat === "bushfire") {
      ok = inExpanded(pc, (D.bushfire && D.bushfire.postcodes && D.bushfire.postcodes[st]) || []);
      label = "森林火災重建區";
    } else if (cat === "disaster") {
      ok = inExpanded(pc, (D.disaster && D.disaster.postcodes && D.disaster.postcodes[st]) || []);
      label = "災害復原區";
    }
    if (ok) {
      pcOut.innerHTML = '<p class="result-verdict result-ok">郵遞區號 <strong>' + raw + "</strong>（" + st +
        "）在「" + label + "」清單中<strong>有對應</strong>。</p>" +
        '<p style="font-size:.9rem">這只是地區初篩。工作內容必須符合指定工作定義，並自行保存支薪與出勤證據。</p>';
    } else {
      pcOut.innerHTML = '<p class="result-verdict result-no">郵遞區號 <strong>' + raw + "</strong>（" + st +
        "）在「" + label + "」清單中<strong>未找到對應</strong>。</p>";
    }
  }

  stateButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setActiveState(btn.getAttribute("data-tm-state"));
    });
  });
  if (stateSelect) stateSelect.addEventListener("change", function () { setActiveState(stateSelect.value); });
  if (layerSelect) layerSelect.addEventListener("change", function () { if (geoLayer) geoLayer.setStyle(styleFeature); render(); });
  if (pcBtn) pcBtn.addEventListener("click", checkPostcode);
  if (pcInput) pcInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); checkPostcode(); }
  });

  fetch("assets/au-states.geojson")
    .then(function (r) { if (!r.ok) throw new Error("geojson " + r.status); return r.json(); })
    .then(function (data) { geojsonData = data; initMap(data); render(); })
    .catch(function () {
      if (mapEl) mapEl.innerHTML = '<p class="note" style="padding:16px">州界地圖資料載入失敗。仍可用下方州別選單與郵遞區號工具。</p>';
      render();
    });
})();
