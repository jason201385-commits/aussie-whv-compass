(function () {
  "use strict";
  var choices = [{"code":"zh-Hant","label":"繁體中文","url":"/"},{"code":"en","label":"English","url":"/lang/en/"},{"code":"zh-Hans","label":"简体中文","url":"/lang/zh-Hans/"},{"code":"es","label":"Español","url":"/lang/es/"},{"code":"pt","label":"Português","url":"/lang/pt/"},{"code":"fr","label":"Français","url":"/lang/fr/"},{"code":"de","label":"Deutsch","url":"/lang/de/"},{"code":"ja","label":"日本語","url":"/lang/ja/"},{"code":"ko","label":"한국어","url":"/lang/ko/"},{"code":"id","label":"Bahasa Indonesia","url":"/lang/id/"},{"code":"ms","label":"Bahasa Melayu","url":"/lang/ms/"},{"code":"cy","label":"Cymraeg","url":"/lang/cy/"},{"code":"da","label":"Dansk","url":"/lang/da/"},{"code":"et","label":"Eesti","url":"/lang/et/"},{"code":"ga","label":"Gaeilge","url":"/lang/ga/"},{"code":"it","label":"Italiano","url":"/lang/it/"},{"code":"lb","label":"Lëtzebuergesch","url":"/lang/lb/"},{"code":"hu","label":"Magyar","url":"/lang/hu/"},{"code":"mt","label":"Malti","url":"/lang/mt/"},{"code":"nl","label":"Nederlands","url":"/lang/nl/"},{"code":"no","label":"Norsk","url":"/lang/no/"},{"code":"pl","label":"Polski","url":"/lang/pl/"},{"code":"rm","label":"Rumantsch","url":"/lang/rm/"},{"code":"sk","label":"Slovenčina","url":"/lang/sk/"},{"code":"sl","label":"Slovenščina","url":"/lang/sl/"},{"code":"fi","label":"Suomi","url":"/lang/fi/"},{"code":"sv","label":"Svenska","url":"/lang/sv/"},{"code":"vi","label":"Tiếng Việt","url":"/lang/vi/"},{"code":"tpi","label":"Tok Pisin","url":"/lang/tpi/"},{"code":"tr","label":"Türkçe","url":"/lang/tr/"},{"code":"cs","label":"Čeština","url":"/lang/cs/"},{"code":"el","label":"Ελληνικά","url":"/lang/el/"},{"code":"mn","label":"Монгол","url":"/lang/mn/"},{"code":"he","label":"עברית","url":"/lang/he/"},{"code":"ar","label":"العربية","url":"/lang/ar/"},{"code":"hi","label":"हिन्दी","url":"/lang/hi/"},{"code":"ta","label":"தமிழ்","url":"/lang/ta/"},{"code":"th","label":"ไทย","url":"/lang/th/"}];
  var nav = document.querySelector(".nav-inner");
  if (!nav || nav.querySelector(".language-picker")) return;
  var label = document.createElement("label");
  label.className = "language-picker";
  var text = document.createElement("span");
  text.className = "sr-only";
  text.textContent = "Language";
  var select = document.createElement("select");
  select.setAttribute("aria-label", "Language");
  var current = document.documentElement.lang || "zh-Hant";
  choices.forEach(function (choice) {
    var option = document.createElement("option");
    option.value = choice.url;
    option.textContent = choice.label;
    option.lang = choice.code;
    option.selected = choice.code === current;
    select.appendChild(option);
  });
  select.addEventListener("change", function () {
    if (select.value) window.location.assign(select.value);
  });
  label.appendChild(text);
  label.appendChild(select);
  var navLinks = nav.querySelector(".nav-links");
  nav.insertBefore(label, navLinks || null);
})();
