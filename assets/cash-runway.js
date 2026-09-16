/* No-income runway scenario. Pure arithmetic in cents; no storage or network. */
(function (root) {
  'use strict';
  var labels = {cash:'可動用現金',oneoff:'尚未支付的一次性支出',bond:'尚未支付的押金',reserve:'不動用的保留金',weekly:'每週必要開支'};
  function cents(value, name) {
    var raw = typeof value === 'number' ? String(value) : (typeof value === 'string' ? value.trim() : '');
    if (!/^\d+(?:\.\d{1,2})?$/.test(raw) || !Number.isFinite(Number(raw)) || Number(raw) > 100000000) {
      throw new RangeError(labels[name] + '請填 0 至 100,000,000 的金額，最多兩位小數。');
    }
    return Math.round(Number(raw) * 100);
  }
  function calculate(input) {
    if (!input || typeof input !== 'object') throw new TypeError('請填寫試算欄位。');
    var x = {};
    Object.keys(labels).forEach(function (key) { x[key] = cents(input[key],key); });
    if (x.weekly <= 0) throw new RangeError('每週必要開支須大於 0，否則無法估算週數。');
    var target = Number(input.target);
    if (!Number.isInteger(target) || target < 1 || target > 52) throw new RangeError('緩衝目標須為 1 至 52 週。');
    var held = x.oneoff + x.bond + x.reserve;
    var available = x.cash - held;
    return {cashCents:x.cash,heldCents:held,availableCents:available,
      initialGapCents:Math.max(0,-available),fullWeeks:Math.floor(Math.max(0,available)/x.weekly),
      tenthsOfWeek:Math.floor(Math.max(0,available)*10/x.weekly),targetWeeks:target,
      targetGapCents:Math.max(0,held + x.weekly*target - x.cash)};
  }
  var api = Object.freeze({calculate:calculate});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document) return;
  var d = root.document, form = d.getElementById('runway-form');
  if (!form) return;
  var result = d.getElementById('runway-result'), status = d.getElementById('runway-status');
  function money(n) { return 'A$' + (n/100).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function clear() { result.hidden=true; result.textContent=''; status.textContent='資料已修改，請重新試算。'; }
  form.addEventListener('input',clear); form.addEventListener('change',clear);
  form.addEventListener('submit',function (event) {
    event.preventDefault(); clear();
    try {
      var input={}; Object.keys(labels).concat(['target']).forEach(function (key) { input[key]=d.getElementById('runway-'+key).value; });
      var x=calculate(input), p=d.createElement('p'), next=d.createElement('p');
      var weeks=(x.tenthsOfWeek/10).toFixed(1);
      p.textContent=x.initialGapCents ? '先保留列出的費用就還差 '+money(x.initialGapCents)+'，目前沒有可支應生活的緩衝金。' : '扣除列出的費用後，可用於生活的金額為 '+money(x.availableCents)+'；約可支應 '+weeks+' 週（完整週數：'+x.fullWeeks+'）。';
      next.textContent=x.targetGapCents ? '要預留 '+x.targetWeeks+' 週無收入期間，依這組假設還差 '+money(x.targetGapCents)+'。' : '依這組假設，可覆蓋選定的 '+x.targetWeeks+' 週無收入期間；這不是找到工作的保證。';
      result.appendChild(p); result.appendChild(next); result.hidden=false;
      status.textContent='試算完成；只在此頁計算，沒有儲存或送出金額。';
      result.focus();
    } catch (err) { status.textContent=err.message || '資料不完整，請重新核對。'; }
  });
  d.getElementById('runway-example').addEventListener('click',function () {
    var sample={cash:'8000',oneoff:'1000',bond:'1000',reserve:'2000',weekly:'500',target:'8'};
    Object.keys(sample).forEach(function(key){d.getElementById('runway-'+key).value=sample[key];});
    clear(); status.textContent='已填入示範：8,000／1,000／1,000／2,000／500。不是建議金額，請依自己情況修改後試算。';
  });
  d.getElementById('runway-reset').addEventListener('click',function () { form.reset();clear();status.textContent='欄位已清空。'; });
  form.hidden=false;
})(typeof window==='undefined'?null:window);
