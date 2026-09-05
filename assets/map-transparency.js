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
  var channelData = null;
  var hubLayer = null;
  var selectedHubId = null;
  var CACHE_V = "20260905-04";

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


  function kindLabelZh(kind) {
    if (kind === "government") return "政府入口";
    if (kind === "rights") return "權益／官方";
    if (kind === "official_info") return "官方說明";
    if (kind === "commercial") return "第三方";
    if (kind === "site") return "本站";
    return "公開管道";
  }

  function linkItemHtml(link) {
    var external = /^(https?:)?\/\//.test(link.url || link.href || "");
    var href = link.url || link.href || "#";
    var title = link.label_zh || link.title || href;
    var note = link.note_zh || link.note || "";
    var kind = link.kind || "";
    var rel = ' rel="noopener noreferrer' + (kind === "commercial" ? " nofollow" : "") + '"';
    var target = external ? ' target="_blank"' : "";
    var html = "<li class=\"tm-channel-item\">";
    html += '<p class="jr-meta"><span class="jr-badge">' + escapeHtml(kindLabelZh(kind)) + "</span>";
    if (kind === "commercial") html += ' <span class="jr-disclaimer">第三方、非本站職缺庫</span>';
    html += "</p>";
    html += "<p><a class=\"btn" + (kind === "commercial" ? " secondary" : "") + "\" href=\"" +
      escapeHtml(href) + "\"" + target + rel + ">" + escapeHtml(title);
    if (external) html += '<span class="sr-only">（另開新頁）</span>';
    html += "</a></p>";
    if (note) html += '<p class="jr-note">' + escapeHtml(note) + "</p>";
    html += "</li>";
    return html;
  }

  function deepLinksForPlace(stateCode, place, keywords) {
    var links = [];
    var kw = keywords || "fruit picker";
    var whereSeek = place ? (place + " " + stateCode) : null;
    var jr = window.WHV_JOB_ROUTER;
    var stMeta = jr && jr.STATES && jr.STATES[stateCode];
    var seekWhere = place
      ? (place + " " + stateCode)
      : (stMeta ? stMeta.name : stateCode);
    var indeedWhere = seekWhere;
    if (jr && typeof jr.seekUrl === "function") {
      links.push({
        kind: "commercial",
        label_zh: "Seek 公開搜尋（" + kw + " · " + seekWhere + "）",
        url: jr.seekUrl(kw, seekWhere),
        note_zh: "這是 Seek 自己的公開搜尋網址深連結。本站不爬職缺、沒有雇主庫。"
      });
    } else {
      links.push({
        kind: "commercial",
        label_zh: "Seek 公開搜尋",
        url: "https://www.seek.com.au/jobs?keywords=" + encodeURIComponent(kw) +
          "&where=" + encodeURIComponent(seekWhere),
        note_zh: "Seek 公開搜尋深連結。本站不爬職缺。"
      });
    }
    var indeedFn = jr && jr.indeedUrl;
    var indeedHref = typeof indeedFn === "function"
      ? indeedFn(kw, indeedWhere)
      : ("https://au.indeed.com/jobs?q=" + encodeURIComponent(kw) + "&l=" + encodeURIComponent(indeedWhere));
    links.push({
      kind: "commercial",
      label_zh: "Indeed 公開搜尋（" + kw + " · " + indeedWhere + "）",
      url: indeedHref,
      note_zh: "Indeed 公開搜尋深連結。本站不鏡像職缺。"
    });
    var joraFn = jr && jr.joraUrl;
    var joraHref = typeof joraFn === "function"
      ? joraFn(kw, indeedWhere)
      : ("https://au.jora.com/j?q=" + encodeURIComponent(kw) + "&l=" + encodeURIComponent(indeedWhere));
    links.push({
      kind: "commercial",
      label_zh: "Jora 公開搜尋（" + kw + " · " + indeedWhere + "）",
      url: joraHref,
      note_zh: "Jora 公開搜尋深連結。本站不鏡像職缺。"
    });
    return links;
  }

  function renderChannelsBlock(opts) {
    opts = opts || {};
    if (!channelData) {
      return '<p class="fact-meta">公開求職管道資料載入中或失敗；下方「公開求職篩選導流」仍可產生搜尋連結。</p>';
    }
    var stateCode = opts.stateCode;
    var hub = opts.hub;
    var html = "";
    html += '<div class="tm-channels">';
    html += '<p class="section-eyebrow">公開求職管道</p>';
    if (hub) {
      html += "<h3>" + escapeHtml(hub.name_zh || hub.name) + " · 策展樞紐</h3>";
      html += "<p>" + escapeHtml(hub.note_zh || "") + "</p>";
    } else if (stateCode && stateCode !== "ALL") {
      var st = channelData.states && channelData.states[stateCode];
      var title = st ? ((st.name_zh || "") + " " + stateCode) : stateCode;
      html += "<h3>" + escapeHtml(title) + " 可查管道</h3>";
      if (st && st.hub_hint_zh) html += "<p>" + escapeHtml(st.hub_hint_zh) + "</p>";
    } else {
      html += "<h3>點州／領地或橘色樞紐，看該地公開管道</h3>";
      html += "<p>" + escapeHtml(channelData.note_zh || "") + "</p>";
    }
    html += '<p class="note">只列<strong>公開／官方／開放搜尋入口</strong>，不是雇主名單；也不爬 SEEK／Indeed 職缺進資料庫。</p>';

    var items = [];
    if (hub && hub.channels) items = items.concat(hub.channels);
    if (stateCode && stateCode !== "ALL" && channelData.states && channelData.states[stateCode]) {
      items = items.concat(channelData.states[stateCode].channels || []);
    }
    if (channelData.national) items = items.concat(channelData.national);

    // de-dupe by id/url
    var seen = Object.create(null);
    var uniq = [];
    items.forEach(function (it) {
      var key = it.id || it.url;
      if (!key || seen[key]) return;
      seen[key] = true;
      uniq.push(it);
    });

    html += '<ul class="jr-links tm-channel-list">';
    uniq.forEach(function (it) { html += linkItemHtml(it); });

    var place = hub ? hub.name : "";
    var kw = (hub && hub.default_keywords) || "fruit picker";
    if (stateCode && stateCode !== "ALL") {
      deepLinksForPlace(stateCode, place, kw).forEach(function (dl) {
        html += linkItemHtml(dl);
      });
    }
    html += "</ul>";

    html += '<p class="fact-meta">管道資料抓取：' + escapeHtml(channelData.retrieved || "") +
      ' · 橘色圓點＝策展 WHV 樞紐（非完整清單）</p>';
    html += '<p><a class="btn secondary" href="#open-job-portals">用表單自訂關鍵字產生更多搜尋連結</a></p>';
    html += "</div>";
    return html;
  }

  function syncJobRouterState(code) {
    var sel = document.getElementById("jr-state");
    if (!sel || !code || code === "ALL") return;
    sel.value = code;
  }

  function selectHub(hubId) {
    selectedHubId = hubId || null;
    if (hubLayer) {
      hubLayer.eachLayer(function (m) {
        var id = m.options && m.options.hubId;
        var on = id && id === selectedHubId;
        m.setStyle({
          radius: on ? 9 : 7,
          weight: on ? 2.5 : 2,
          fillColor: on ? "#c05621" : "#f6ad55",
          color: on ? "#27342e" : "#9c4221"
        });
      });
    }
  }

  function currentGroup() {
    var layerKey = layerSelect ? layerSelect.value : "regional";
    var layer = LAYERS[layerKey] || LAYERS.regional;
    return { layer: layer, group: layer.getGroup() || {}, key: layerKey };
  }

  function setActiveState(code, opts) {
    opts = opts || {};
    selectedState = code || "ALL";
    if (!opts.keepHub) selectHub(null);
    stateButtons.forEach(function (btn) {
      var on = btn.getAttribute("data-tm-state") === selectedState;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (stateSelect) stateSelect.value = selectedState;
    if (geoLayer) geoLayer.setStyle(styleFeature);
    syncJobRouterState(selectedState);
    render();
  }

  function featureCode(feature) {
    var p = (feature && feature.properties) || {};
    return p.STATE_CODE || p.STATE_ABBR || "";
  }

  function styleFeature(feature) {
    var code = featureCode(feature);
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
    var code = featureCode(feature);
    var name = (feature.properties && feature.properties.STATE_NAME) || code;
    layer.bindTooltip(name + (code ? " (" + code + ")" : ""), { sticky: true });
    layer.on({
      click: function () { setActiveState(code); },
      mouseover: function (e) { e.target.setStyle({ weight: 2.5, fillOpacity: 0.75 }); },
      mouseout: function (e) { geoLayer.resetStyle(e.target); }
    });
  }

  function initMap(data) {
    if (!mapEl || typeof L === "undefined") return;
    map = L.map(mapEl, {
      scrollWheelZoom: true,
      minZoom: 3,
      maxZoom: 12,
      maxBounds: [[-48, 108], [-8, 158]],
      maxBoundsViscosity: 0.5
    }).setView([-25.5, 134.5], 4);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 12,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a>'
    }).addTo(map);
    geoLayer = L.geoJSON(data, { style: styleFeature, onEachFeature: onEachFeature }).addTo(map);
    try { map.fitBounds(geoLayer.getBounds(), { padding: [12, 12], maxZoom: 5 }); } catch (e) {}
    [
      { name: "Perth", lat: -31.95, lng: 115.86 },
      { name: "Darwin", lat: -12.46, lng: 130.84 },
      { name: "Brisbane", lat: -27.47, lng: 153.03 },
      { name: "Adelaide", lat: -34.93, lng: 138.6 },
      { name: "Sydney", lat: -33.87, lng: 151.21 },
      { name: "Canberra", lat: -35.28, lng: 149.13 },
      { name: "Melbourne", lat: -37.81, lng: 144.96 },
      { name: "Hobart", lat: -42.88, lng: 147.33 }
    ].forEach(function (c) {
      L.circleMarker([c.lat, c.lng], {
        radius: c.name === "Canberra" ? 7 : 4,
        color: "#27342e",
        fillColor: "#fffdf5",
        fillOpacity: 1,
        weight: 1.5,
        interactive: false
      }).bindTooltip(c.name, {
        permanent: true,
        direction: "right",
        className: "tm-capital-label",
        offset: [8, 0]
      }).addTo(map);
    });
    addHubMarkers();
    setTimeout(function () { if (map) map.invalidateSize(); }, 80);
  }

  function addHubMarkers() {
    if (!map || typeof L === "undefined") return;
    if (hubLayer) {
      map.removeLayer(hubLayer);
      hubLayer = null;
    }
    if (!channelData || !channelData.hubs || !channelData.hubs.length) return;
    hubLayer = L.layerGroup().addTo(map);
    channelData.hubs.forEach(function (hub) {
      var marker = L.circleMarker([hub.lat, hub.lng], {
        radius: 7,
        color: "#9c4221",
        fillColor: "#f6ad55",
        fillOpacity: 0.95,
        weight: 2,
        hubId: hub.id,
        className: "tm-hub-marker"
      });
      marker.bindTooltip((hub.name_zh || hub.name) + " · 策展樞紐", {
        sticky: true,
        className: "tm-state-tooltip"
      });
      marker.on("click", function (e) {
        if (e && e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
        setActiveState(hub.state, { keepHub: true });
        selectHub(hub.id);
        var placeEl = document.getElementById("jr-place");
        if (placeEl) placeEl.value = hub.name;
        render();
        if (detail) detail.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
      hubLayer.addLayer(marker);
    });
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
      html += "<p><strong>全澳總覽：</strong>點地圖上的州／領地看指定工作範圍與<strong>公開求職管道</strong>；金色＝此圖層有列出範圍；橘色點＝策展樞紐。</p><ul>";
      ["NSW","VIC","QLD","WA","SA","TAS","NT","ACT"].forEach(function (code) {
        var mark = stateHasCoverage(group, code) ? "有" : "無";
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

    var hub = null;
    if (selectedHubId && channelData && channelData.hubs) {
      for (var hi = 0; hi < channelData.hubs.length; hi++) {
        if (channelData.hubs[hi].id === selectedHubId) { hub = channelData.hubs[hi]; break; }
      }
    }
    html += renderChannelsBlock({
      stateCode: selectedState,
      hub: hub
    });

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

  render();

  var channelsPromise = fetch("assets/region-job-channels.json?v=" + CACHE_V)
    .then(function (r) { if (!r.ok) throw new Error("channels " + r.status); return r.json(); })
    .then(function (data) {
      channelData = data;
      if (map) addHubMarkers();
      render();
    })
    .catch(function (err) {
      if (typeof console !== "undefined" && console.warn) console.warn("tm channels", err);
      channelData = null;
      render();
    });

  fetch("assets/au-states.geojson?v=" + CACHE_V)
    .then(function (r) { if (!r.ok) throw new Error("geojson " + r.status); return r.json(); })
    .then(function (data) {
      geojsonData = data;
      initMap(data);
      return channelsPromise;
    })
    .then(function () { render(); })
    .catch(function (err) {
      if (typeof console !== "undefined" && console.warn) console.warn("tm map", err);
      if (mapEl && !mapEl.querySelector(".leaflet-container")) {
        mapEl.innerHTML = '<p class="note" style="padding:16px">州界地圖資料載入失敗。仍可用下方州別選單與郵遞區號工具。</p>';
      }
      render();
    });
})();
