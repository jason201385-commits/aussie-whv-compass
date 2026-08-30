(function () {
  "use strict";

  var form = document.getElementById("simulator-profile-form");
  if (!form) return;

  var profileSection = document.getElementById("profile");
  var stage = document.getElementById("simulator-stage");
  var finish = document.getElementById("simulator-finish");
  var dayLabel = document.getElementById("simulator-day");
  var progressLabel = document.getElementById("simulator-progress-label");
  var progress = document.getElementById("simulator-progress");
  var progressBar = document.getElementById("simulator-progress-bar");
  var profileNote = document.getElementById("simulator-profile-note");
  var eventTag = document.getElementById("event-tag");
  var eventTitle = document.getElementById("event-title");
  var eventStory = document.getElementById("event-story");
  var eventQuestion = document.getElementById("event-question");
  var choicesWrap = document.getElementById("simulator-choices");
  var feedback = document.getElementById("simulator-feedback");
  var feedbackTitle = document.getElementById("feedback-title");
  var feedbackCopy = document.getElementById("feedback-copy");
  var feedbackDelta = document.getElementById("feedback-delta");
  var feedbackGuide = document.getElementById("feedback-guide");
  var feedbackSource = document.getElementById("feedback-source");
  var nextButton = document.getElementById("simulator-next");
  var finishSummary = document.getElementById("finish-summary");
  var finishDashboard = document.getElementById("finish-dashboard");
  var finishActions = document.getElementById("finish-actions");
  var state = null;

  var EVENTS = [
    {
      day: "DAY 01",
      tag: "晚班抵達",
      title: "你在晚上抵達 Perth，手機只剩 18%",
      story: "機場有人主動說可以免費載你去『朋友的便宜房間』；另一邊是你自己查到的短住地址。你很累，只想趕快洗澡睡覺。",
      question: "你要怎麼保留第一晚的安全退路？",
      guide: "housing.html#book",
      official: "https://www.consumerprotection.wa.gov.au/publications/looking-rental-home-tenants-guide-1",
      choices: [
        {
          label: "直接前往已核對地址與取消條款的短住",
          hint: "多花一點交通費，先讓第一晚可控",
          tone: "safer",
          delta: { cash: -55, housing: 8, wellbeing: 4, evidence: 2 },
          title: "你先買到了『不必今晚做大決定』的時間",
          copy: "較安全的住宿不保證零風險，但地址、訂單與取消條款能留下可回查的紀錄。第一晚先落腳，比在疲勞狀態下接受陌生人的住宿安排更有退路。"
        },
        {
          label: "接受陌生人的免費接送與房間",
          hint: "省下眼前費用，但身分、地址與條件都沒核對",
          tone: "danger",
          delta: { housing: -18, wellbeing: -12, evidence: -10 },
          title: "免費不等於可查證，急迫感讓你失去退場選項",
          copy: "這段模擬不判定對方一定有問題；真正的風險是你不知道對方身分、目的地、住宿條件，也沒有獨立訂單或聯絡紀錄。先把行程告訴可信任的人，並改走可核對的住宿與交通入口。"
        },
        {
          label: "先核對地址、評價與條款，再安排合法車程",
          hint: "花幾分鐘查證，仍保留自己的選擇",
          tone: "safer",
          delta: { cash: -45, housing: 6, wellbeing: -2, evidence: 6 },
          title: "你把『有人說可以』改成了『我自己查得到』",
          copy: "疲勞時不必追求完美研究；至少確認住宿名稱、地址、付款與取消條款，並把行程留給可信任的人。這些小紀錄能增加出問題時的求助線索。"
        }
      ]
    },
    {
      day: "DAY 04",
      tag: "租屋催款",
      title: "有人說每週 A$180，但今晚要先付 bond",
      story: "對方只傳了房間照片，說很多人排隊；不方便看房，也不想提供書面 agreement，但承諾你明天就能入住。",
      question: "便宜房間與短住費用正在拉扯，你怎麼選？",
      guide: "housing.html#bond",
      official: "https://www.consumerprotection.wa.gov.au/publications/looking-rental-home-tenants-guide-1",
      choices: [
        {
          label: "立即轉兩週房租加 bond，先搶到再說",
          hint: "短期看似省房租，但付款與出租者都沒核對",
          tone: "danger",
          delta: { cash: -360, housing: -15, wellbeing: -8, evidence: -18 },
          title: "你付出了錢，卻沒有換到可證明的住宿權利",
          copy: "社群刊登、低價與多人排隊都不能證明房源真實。WA 官方租屋指南建議實地看房、核對出租者與文件，並保存 agreement、bond、收據與往來紀錄。"
        },
        {
          label: "要求看房、核對出租者、agreement 與 bond 流程",
          hint: "先確認你付的錢會換到什麼",
          tone: "safer",
          delta: { housing: 10, wellbeing: 2, evidence: 14 },
          title: "你把『相信對方』改成一組可以逐項核對的問題",
          copy: "要求查證不代表房間一定適合，也不保證對方一定接受；它能幫你看見誰在出租、你租的是什麼、付款如何留下紀錄，以及房屋所在地適用哪些規則。"
        },
        {
          label: "續住三晚可取消短住，另外安排實地看房",
          hint: "眼前成本較高，但避免被今晚的期限綁架",
          tone: "safer",
          delta: { cash: -210, housing: 14, wellbeing: 6, evidence: 5 },
          title: "你用短住費換回了查證時間",
          copy: "緩衝住宿不是永遠最便宜，但能避免因為今晚沒地方住而接受無法查核的付款條件。看房時仍要核對出租者、agreement、bond 與入住狀況。"
        }
      ]
    },
    {
      day: "DAY 08",
      tag: "高薪職缺",
      title: "招募者說：免面試、明天上工，但先付 A$300",
      story: "對方從通訊軟體主動聯絡，聲稱是農場職缺，薪水很好、住宿全包；費用名稱是『保留名額與交通押金』，要求用 PayID 立刻付款。",
      question: "你很需要收入，下一步怎麼做？",
      guide: "scam.html#job",
      official: "https://www.scamwatch.gov.au/types-of-scams/jobs-and-employment-scams",
      choices: [
        {
          label: "先付 A$300，至少明天就有工作",
          hint: "把急著有收入變成先付自己的錢",
          tone: "danger",
          delta: { cash: -300, work: -15, wellbeing: -8, evidence: -12 },
          title: "『付錢才能賺錢』是必須停下查證的重大紅旗",
          copy: "Scamwatch 提醒，求職詐騙常以高薪、快速錄取與預付款催促行動。不要用對方提供的電話驗證對方；應從自己找到的公司或仲介官方聯絡方式獨立查核。"
        },
        {
          label: "停止付款，從自己找到的官方聯絡方式查公司",
          hint: "不使用招募者傳來的驗證管道",
          tone: "safer",
          delta: { work: 10, wellbeing: 3, evidence: 12 },
          title: "你沒有急著判定真假，而是先切斷可能的損失",
          copy: "停止付款、保存訊息，再獨立核對公司、職缺、ABN、薪資與聯絡人。就算職缺最後不存在，你也保留了資金與身分資料。"
        },
        {
          label: "要求書面職缺、ABN、薪資與付款依據，不先付費",
          hint: "把模糊承諾拆成可核對資料",
          tone: "safer",
          delta: { work: 8, wellbeing: 2, evidence: 10 },
          title: "你把職缺從話術拉回可驗證資訊",
          copy: "書面資料本身仍可能偽造，所以還要從獨立來源查公司與聯絡方式。任何要求你先用轉帳、PayID 或加密貨幣付款才能開始工作的安排，都應停止。"
        }
      ]
    },
    {
      day: "DAY 12",
      tag: "第一週薪資",
      title: "你做完第一週，雇主說 payslip 之後再補",
      story: "排班、工時與薪資都只在口頭講過。雇主說會付現金，叫你不用把每天幾點上下班記得那麼細。",
      question: "在還沒發生欠薪前，你要留下什麼？",
      guide: "work.html#checklist",
      official: "https://www.fairwork.gov.au/pay-and-wages/paying-wages/pay-slips",
      choices: [
        {
          label: "先不要問，免得剛上工就得罪人",
          hint: "維持表面和平，但之後很難重建工時紀錄",
          tone: "danger",
          delta: { work: 2, wellbeing: -5, evidence: -20 },
          title: "沒有紀錄不會讓問題消失，只會讓之後更難說清楚",
          copy: "現金支付不代表你沒有權利，但缺少 payslip、工時與付款紀錄會增加查核難度。Fair Work 說明雇主應在付款後的一個工作日內提供 payslip。"
        },
        {
          label: "每天自己記工時，書面詢問 pay rate 與 payslip",
          hint: "先用中性方式把口頭條件留下來",
          tone: "safer",
          delta: { work: 8, wellbeing: 1, evidence: 18 },
          title: "你在問題變大以前，先建立自己的時間線",
          copy: "保存 roster、工時、訊息、銀行或現金收款紀錄，並書面詢問 pay rate 與 payslip。這些資料不能保證爭議結果，但能讓後續查核更具體。"
        },
        {
          label: "先查適用薪資與 ABN，再向 Fair Work 問方向",
          hint: "把職稱、實際工作與付款方式分開核對",
          tone: "safer",
          delta: { work: 12, wellbeing: 2, evidence: 20 },
          title: "你沒有只問『現金可不可以』，而是查整組工作條件",
          copy: "薪資、payslip、super、雇傭或承包關係要分開看。Fair Work 的官方工具與語言協助能提供一般方向；個案爭議仍以正式資料與主管機關處理為準。"
        }
      ]
    },
    {
      day: "DAY 18",
      tag: "安全中斷",
      title: "室友突然胸痛、呼吸困難，而且快失去意識",
      story: "有人說可能只是太累，想先上社群問；另一個人擔心叫救護車很貴。現在狀況正在惡化。",
      question: "這不是需要比較分數的時候。你先做什麼？",
      guide: "health.html#emergency",
      official: "https://www.healthdirect.gov.au/calling-triple-zero",
      critical: true,
      choices: [
        {
          label: "立即撥 000，清楚說明位置與狀況",
          hint: "嚴重且緊急時，先取得即時醫療協助",
          tone: "safer",
          delta: { wellbeing: 15, evidence: 3 },
          title: "正確的安全出口是立即撥 000",
          copy: "healthdirect 將胸痛、呼吸困難與失去意識列為需要緊急處理的例子。不要因為費用、不確定或想先問社群而延誤。"
        },
        {
          label: "先等半小時，看休息後會不會好",
          hint: "把正在惡化的緊急狀況留在原地等待",
          tone: "danger",
          delta: { wellbeing: -25 },
          title: "現實中請改做：立即撥 000",
          copy: "嚴重且緊急、呼吸困難、胸痛或快失去意識時，不要用等待測試狀況。這一關的目的不是責備，而是記住：安全指示優先於費用與遊戲進度。"
        },
        {
          label: "先拍影片丟到群組，等大家判斷",
          hint: "社群無法從訊息提供現場緊急處置",
          tone: "danger",
          delta: { wellbeing: -20, evidence: -2 },
          title: "現實中請改做：立即撥 000",
          copy: "社群不是緊急醫療服務，也不該先傳播室友的醫療影像。立即撥 000；能安全進行時再通知室友指定的聯絡人。"
        }
      ]
    },
    {
      day: "DAY 24",
      tag: "工時減少",
      title: "這週只排到兩個班，短住也快到期",
      story: "雇主沒有保證下週工時。你在社群看到另一個『保證開工』的仲介，也開始擔心每天的住宿與餐費。",
      question: "資金焦慮升高時，你怎麼避免把希望押在單一承諾？",
      guide: "cost.html#math",
      official: "https://moneysmart.gov.au/budgeting/budget-planner",
      choices: [
        {
          label: "算出 14 天必要支出，同時申請多個可查證職缺",
          hint: "先看現金跑道，再分散工作來源",
          tone: "safer",
          delta: { work: 10, wellbeing: 5, evidence: 4 },
          title: "你把『很慌』拆成時間、金額與下一批行動",
          copy: "預算不能保證找到工作，但能讓你知道還有多少決策時間。把必要支出、可延後支出與工作申請分開，避免因單一承諾耗盡退路。"
        },
        {
          label: "付 A$250 給保證開工的仲介",
          hint: "再次把收入焦慮轉成預付款",
          tone: "danger",
          delta: { cash: -250, work: -15, wellbeing: -8, evidence: -12 },
          title: "『保證』沒有增加可驗證的工時，卻先減少了現金",
          copy: "回到求職詐騙的同一條安全線：不要為了開始工作而先付錢。若對方聲稱是合法費用，也要用獨立來源核對公司、服務內容、退款條款與主管機關規則。"
        },
        {
          label: "先延長可取消住宿，再縮減非必要支出",
          hint: "用短期成本換取不必今晚亂選房或工作的空間",
          tone: "safer",
          delta: { cash: -180, housing: 8, wellbeing: 6, evidence: 2 },
          title: "你讓住宿與工作兩個風險不要同時爆開",
          copy: "這不一定是最省錢的選項，但能避免因住宿倒數而接受無法查證的房源或工作。接著仍要計算現金跑道，設定下一個止損點。"
        }
      ]
    }
  ];

  var clamp = function (value) { return Math.max(0, Math.min(100, value)); };
  var formatCash = function (value) { return "A$" + Math.max(0, Math.round(value)).toLocaleString("en-AU"); };
  var labelMap = { cash: "資金", housing: "住宿", work: "工作", wellbeing: "身心", evidence: "證據" };

  var updateStats = function () {
    document.getElementById("stat-cash").textContent = formatCash(state.cash);
    document.getElementById("stat-housing").textContent = state.housing + " / 100";
    document.getElementById("stat-work").textContent = state.work + " / 100";
    document.getElementById("stat-wellbeing").textContent = state.wellbeing + " / 100";
    document.getElementById("stat-evidence").textContent = state.evidence + " / 100";
  };

  var applyDelta = function (delta) {
    Object.keys(delta).forEach(function (key) {
      if (key === "cash") state.cash = Math.max(0, state.cash + delta[key]);
      else state[key] = clamp(state[key] + delta[key]);
    });
  };

  var renderDelta = function (delta) {
    feedbackDelta.textContent = "";
    Object.keys(delta).forEach(function (key) {
      var value = delta[key];
      var item = document.createElement("span");
      item.className = value < 0 ? "delta-down" : "delta-up";
      var prefix = value > 0 ? "+" : value < 0 ? "-" : "";
      item.textContent = labelMap[key] + " " + prefix + (key === "cash" ? formatCash(Math.abs(value)) : Math.abs(value));
      feedbackDelta.appendChild(item);
    });
  };

  var choose = function (event, choice) {
    Array.prototype.forEach.call(choicesWrap.querySelectorAll("button"), function (button) { button.disabled = true; });
    applyDelta(choice.delta);
    if (choice.tone === "danger") state.riskChoices += 1;
    updateStats();
    renderDelta(choice.delta);
    feedback.className = "simulator-feedback " + (choice.tone === "danger" ? "is-caution" : "is-safer");
    feedbackTitle.textContent = choice.title;
    feedbackCopy.textContent = choice.copy;
    feedbackGuide.href = event.guide;
    feedbackSource.href = event.official;
    feedback.hidden = false;
    progress.setAttribute("aria-valuenow", String(state.index + 1));
    progressBar.style.width = (((state.index + 1) / EVENTS.length) * 100) + "%";
    nextButton.textContent = event.critical ? "我已記住 000，繼續模擬" : state.index === EVENTS.length - 1 ? "查看第 30 天行動地圖" : "前往下一個情境";
    feedbackTitle.setAttribute("tabindex", "-1");
    feedbackTitle.focus();
  };

  var renderEvent = function () {
    var event = EVENTS[state.index];
    dayLabel.textContent = event.day;
    progressLabel.textContent = "情境 " + (state.index + 1) + " / " + EVENTS.length;
    eventTag.textContent = event.tag;
    eventTitle.textContent = event.title;
    eventStory.textContent = event.story;
    eventQuestion.textContent = event.question;
    choicesWrap.textContent = "";
    feedback.hidden = true;
    event.choices.forEach(function (choice, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "simulator-choice";
      var marker = document.createElement("span");
      marker.className = "simulator-choice-marker";
      marker.textContent = String.fromCharCode(65 + index);
      var copy = document.createElement("span");
      var strong = document.createElement("strong");
      strong.textContent = choice.label;
      var small = document.createElement("small");
      small.textContent = choice.hint;
      copy.appendChild(strong);
      copy.appendChild(small);
      button.appendChild(marker);
      button.appendChild(copy);
      button.addEventListener("click", function () { choose(event, choice); });
      choicesWrap.appendChild(button);
    });
    eventTitle.setAttribute("tabindex", "-1");
    eventTitle.focus();
  };

  var actionCatalog = {
    cash: { label: "算出自己的 14 天必要支出與止損線", href: "cost.html#math", score: function () { return state.cash >= 5000 ? 80 : state.cash >= 2500 ? 55 : 25; } },
    housing: { label: "先保留可取消短住，再做出租者、agreement 與 bond 查核", href: "housing.html#housing-first-action", score: function () { return state.housing; } },
    work: { label: "用 ABN、薪資、工作內容與付款方式做接工作前查核", href: "work.html#work-first-action", score: function () { return state.work; } },
    wellbeing: { label: "存下 000、healthdirect 與至少一位可信任聯絡人", href: "health.html#emergency", score: function () { return state.wellbeing; } },
    evidence: { label: "從第一天保存 roster、工時、payslip、付款與往來紀錄", href: "work.html#checklist", score: function () { return state.evidence; } }
  };
  var goalKeys = {
    safety: ["housing", "wellbeing"],
    income: ["cash", "work"],
    experience: ["wellbeing", "housing"],
    evidence: ["evidence"]
  };

  var renderFinishStat = function (icon, label, value) {
    var item = document.createElement("div");
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-" + icon);
    svg.appendChild(use);
    var span = document.createElement("span");
    span.textContent = label;
    var strong = document.createElement("strong");
    strong.textContent = value;
    item.appendChild(svg);
    item.appendChild(span);
    item.appendChild(strong);
    finishDashboard.appendChild(item);
  };

  var finishSimulation = function () {
    stage.hidden = true;
    finish.hidden = false;
    var riskText = state.riskChoices === 0
      ? "你在這輪保留了很多查證與退場空間。"
      : "你在這輪有 " + state.riskChoices + " 次被急迫感推向高風險選項；這正是重玩的價值。";
    finishSummary.textContent = riskText + " 遊戲不判定你適不適合澳洲；請把下面最脆弱的三項，改成現實中的查核與備援。";
    finishDashboard.textContent = "";
    renderFinishStat("dollar", "可用資金", formatCash(state.cash));
    renderFinishStat("home", "住宿退路", state.housing + " / 100");
    renderFinishStat("briefcase", "工作準備", state.work + " / 100");
    renderFinishStat("heart", "身心餘裕", state.wellbeing + " / 100");
    renderFinishStat("file", "證據完整", state.evidence + " / 100");

    var actions = Object.keys(actionCatalog).map(function (key) {
      var goalAdjustment = goalKeys[state.goal].indexOf(key) >= 0 ? 5 : 0;
      return { key: key, label: actionCatalog[key].label, href: actionCatalog[key].href, score: actionCatalog[key].score() - goalAdjustment };
    }).sort(function (a, b) { return a.score - b.score; }).slice(0, 3);
    finishActions.textContent = "";
    actions.forEach(function (action) {
      var li = document.createElement("li");
      var link = document.createElement("a");
      link.href = action.href;
      link.textContent = action.label;
      li.appendChild(link);
      finishActions.appendChild(li);
    });
    finish.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("finish-title").setAttribute("tabindex", "-1");
    document.getElementById("finish-title").focus();
  };

  var resetSimulation = function () {
    state = null;
    form.reset();
    stage.hidden = true;
    finish.hidden = true;
    profileSection.hidden = false;
    progress.setAttribute("aria-valuenow", "0");
    progressBar.style.width = "0%";
    profileSection.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("profile-title").setAttribute("tabindex", "-1");
    document.getElementById("profile-title").focus();
  };

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    var data = new FormData(form);
    var stay = data.get("stay");
    var readiness = data.get("readiness");
    var support = data.get("support");
    state = {
      cash: Number(data.get("cash")),
      housing: { none: 20, three: 35, week: 55, fortnight: 75 }[stay],
      work: { start: 25, basic: 45, ready: 70 }[readiness],
      wellbeing: { solo: 48, contact: 63, network: 78 }[support],
      evidence: { start: 20, basic: 40, ready: 68 }[readiness],
      goal: String(data.get("goal")),
      index: 0,
      riskChoices: 0
    };
    var notes = [];
    if (state.cash <= 3000) notes.push("先算 14 天必要支出");
    if (state.housing <= 35) notes.push("先確保第一晚與可取消短住");
    if (state.work <= 25) notes.push("先整理官方手續與工作查核清單");
    if (state.wellbeing <= 48) notes.push("先設定報平安與緊急聯絡人");
    if (state.evidence <= 40) notes.push("先建立工時、付款與文件的保存方式");
    var goalNotes = {
      safety: "把安全與退路寫成明確止損線",
      income: "先確認現金跑道與可查證工作來源",
      experience: "替生活體驗保留不被住宿與收入追著跑的空間",
      evidence: "把工作證據從第一天就納入流程"
    };
    if (notes.length < 2) notes.push(goalNotes[state.goal]);
    profileNote.textContent = "角色快照：你目前最值得先守住的是「" + notes.slice(0, 2).join("」與「") + "」。接下來的分數只代表模擬資源，不是適合度。";
    profileSection.hidden = true;
    finish.hidden = true;
    stage.hidden = false;
    updateStats();
    renderEvent();
    stage.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  nextButton.addEventListener("click", function () {
    if (state.index >= EVENTS.length - 1) {
      finishSimulation();
      return;
    }
    state.index += 1;
    renderEvent();
    document.getElementById("simulator-event").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("simulator-restart").addEventListener("click", resetSimulation);
  document.getElementById("simulator-restart-top").addEventListener("click", resetSimulation);
})();
