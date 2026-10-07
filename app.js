(function () {
  "use strict";

  var CONFIG = window.SURVEY_CONFIG || {};
  var DRAFT_KEY = "survey-draft-v1";
  var SENT_KEY = "survey-sent-v1";
  var ID_KEY = "survey-id-v1";
  var SEND_TIMEOUT_MS = 20000;
  // Согласовано с LIMITS.value в apps-script/Code.gs (5000): сервер отклоняет более длинные значения.
  var MAX_TEXT = 200;
  var MAX_TEXTAREA = 3000;

  var BLOCKS = [
    { id: "A", title: "Кто вы", note: "Три вопроса, чтобы собрать группы по направлениям." },
    { id: "B", title: "Как сейчас пользуетесь ИИ", note: "Честные ответы важнее правильных. Здесь нет оценок." },
    { id: "C", title: "Что хотите от обучения", note: "Ваши задачи станут материалом для практики на втором и третьем занятии." },
    { id: "D", title: "Организация", note: "Чтобы выбрать формат и время, удобные большинству." }
  ];

  var QUESTIONS = [
    { id: "name", block: "A", type: "text", label: "Имя и фамилия", required: true, placeholder: "Иван Петров", column: "Имя и фамилия" },
    { id: "direction", block: "A", type: "single", label: "Направление", required: true, column: "Направление",
      options: ["Рестораны", "Земля и девелопмент", "Недвижимость в Дубае", "Общие функции: финансы, маркетинг, HR, юристы", "Руководство холдинга"] },
    { id: "role", block: "A", type: "text", label: "Должность или чем занимаетесь, одной строкой", required: true, placeholder: "Управляющий ресторана", column: "Должность" },

    { id: "tools", block: "B", type: "multi", label: "Какими ИИ пользуетесь", required: true, column: "Инструменты",
      options: ["ChatGPT", "Claude", "GigaChat", "YandexGPT", "DeepSeek", "Gemini", "Другое"], exclusive: "Не пользуюсь" },
    { id: "frequency", block: "B", type: "single", label: "Как часто", required: true, column: "Частота",
      options: ["Ежедневно", "Несколько раз в неделю", "Несколько раз в месяц", "Не пользуюсь"] },
    { id: "account", block: "B", type: "single", label: "Какой у вас аккаунт", column: "Аккаунт",
      options: ["Бесплатный", "Платный личный", "Корпоративный", "Нет аккаунта"] },
    { id: "uses", block: "B", type: "multi", label: "Для чего уже используете", column: "Для чего используют",
      options: ["Тексты и письма", "Переводы", "Поиск и сводки", "Таблицы и расчёты", "Идеи и планы", "Документы и договоры", "Картинки и презентации", "Другое"] },
    { id: "barriers", block: "B", type: "multi", label: "Что мешает пользоваться больше", column: "Что мешает",
      options: ["Не доверяю результату", "Не знаю, как сформулировать", "Долго проверять", "Опасаюсь за данные", "Нет времени разбираться", "Нет доступа к инструменту"], exclusive: "Ничего не мешает" },
    { id: "sensitive", block: "B", type: "single", label: "Вставляли ли в ИИ рабочие документы с данными клиентов или договоры", column: "Вставляли данные клиентов",
      hint: "Это не проверка. Ответ нужен, чтобы правильно рассказать о границах данных.",
      options: ["Да", "Нет", "Не уверен"] },
    { id: "features", block: "B", type: "matrix", label: "Что из этого знаете или используете", column: "Функции",
      cols: ["Пользуюсь", "Слышал", "Не знаю"],
      rows: [
        { id: "instructions", label: "Постоянные инструкции ассистенту", column: "Функции: постоянные инструкции" },
        { id: "projects", label: "Проекты с загруженными файлами", column: "Функции: проекты с файлами" },
        { id: "memory", label: "Память ассистента", column: "Функции: память" },
        { id: "custom", label: "Свои GPT или скиллы", column: "Функции: свои GPT / скиллы" },
        { id: "research", label: "Глубокое исследование (Deep Research)", column: "Функции: Deep Research" },
        { id: "agents", label: "Агентный режим, агенты", column: "Функции: агенты" }
      ] },

    { id: "tasks", block: "C", type: "textarea", label: "Три рабочие задачи, которые хотели бы отдать ИИ", required: true, column: "Три задачи",
      hint: "По одной на строку, хотя бы одну. Чем конкретнее, тем точнее практика: не «письма», а «ответы на отзывы гостей на Яндекс Картах».",
      placeholder: "1. \n2. \n3. " },
    { id: "agentDef", block: "C", type: "textarea", short: true, label: "Что для вас «ИИ-агент», одним предложением", column: "Что такое агент",
      hint: "Любой ответ подходит, в том числе «не знаю»." },
    { id: "success", block: "C", type: "multi", label: "Что будет для вас успехом курса", column: "Успех курса",
      options: ["Экономия времени на конкретной задаче", "Меньше ошибок в документах", "Новые идеи для продаж или контента", "Понимание, что заказывать у подрядчиков", "Другое"] },

    { id: "device", block: "D", type: "single", label: "Чем будете работать на занятии", required: true, column: "Устройство",
      options: ["Ноутбук", "Планшет", "Только телефон"] },
    { id: "format", block: "D", type: "single", label: "Какой формат удобнее", required: true, column: "Формат",
      options: ["Очно", "Онлайн", "Без разницы"] },
    { id: "time", block: "D", type: "multi", label: "Удобное время", column: "Удобное время",
      options: ["Будни, утро", "Будни, день", "Будни, вечер", "Выходные"] },
    { id: "language", block: "D", type: "single", label: "Язык материалов", column: "Язык материалов",
      options: ["Русский", "Английский", "Оба"] },
    { id: "homework", block: "D", type: "single", label: "Сколько времени готовы тратить на домашнее задание между занятиями", column: "Время на домашнее задание",
      options: ["Не готов", "30 минут", "1 час", "Больше часа"] }
  ];

  var form = document.getElementById("form");
  var blocksEl = document.getElementById("blocks");
  var counterEl = document.getElementById("counter");
  var noticeEl = document.getElementById("notice");
  var errorEl = document.getElementById("error");
  var successEl = document.getElementById("success");
  var submitBtn = document.getElementById("submit");
  var submitHint = form.querySelector(".submit-hint");

  var answers = {};
  var total = QUESTIONS.length;
  var sending = false;

  // ---------- утилиты ----------

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (attrs[k] === true) node.setAttribute(k, "");
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  var memoryStore = {};
  var storageOk = (function () {
    try {
      var k = "survey-probe";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  // Чтение и запись разделены: при исчерпанной квоте запись падает, а ранее
  // сохранённый черновик по-прежнему читается. Всё записанное дублируется в память,
  // чтобы при сбое записи не потерять идентификатор отправки.
  function storage(action, key, value) {
    if (action === "get") {
      if (memoryStore[key] != null) return memoryStore[key];
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    }
    if (action === "set") memoryStore[key] = value;
    if (action === "remove") delete memoryStore[key];
    if (!storageOk) return null;
    try {
      if (action === "set") window.localStorage.setItem(key, value);
      if (action === "remove") window.localStorage.removeItem(key);
    } catch (e) {
      storageOk = false;
      updateStorageHint();
    }
    return null;
  }

  function updateStorageHint() {
    if (!submitHint) return;
    submitHint.textContent = storageOk
      ? "Черновик сохраняется на этом устройстве, пока вы не отправите ответы."
      : "Черновик на этом устройстве не сохраняется: заполните и отправьте за один раз.";
  }

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    var bytes = new Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      var buf = new Uint8Array(16);
      window.crypto.getRandomValues(buf);
      for (var i = 0; i < 16; i++) bytes[i] = buf[i];
    } else {
      for (var j = 0; j < 16; j++) bytes[j] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = bytes.map(function (b) { return (b + 256).toString(16).slice(1); }).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }

  function submissionId() {
    var id = storage("get", ID_KEY);
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      id = uuid();
      storage("set", ID_KEY, id);
    }
    return id;
  }

  function cssEscape(s) {
    return String(s).replace(/["\\]/g, "\\$&");
  }

  function findQuestion(id) {
    return QUESTIONS.filter(function (x) { return x.id === id; })[0];
  }

  function inputsOf(q) {
    return form.querySelectorAll('#q-' + q.id + ' input, #q-' + q.id + ' textarea');
  }

  // ---------- построение формы ----------

  function buildOption(q, value, kind) {
    var input = el("input", { type: kind, name: q.id, value: value });
    return el("label", { class: "opt" }, [input, el("span", { text: value })]);
  }

  function buildQuestion(q, index) {
    var wrap = el("fieldset", { class: "q" + (q.required ? " q-required" : ""), id: "q-" + q.id, "data-id": q.id });
    var legend = el("legend", { class: "q-label" }, [
      el("span", { class: "q-num", text: String(index + 1) }),
      el("span", { text: q.label })
    ]);
    if (q.required) legend.appendChild(el("span", { class: "visually-hidden", text: ", обязательный вопрос" }));
    wrap.appendChild(legend);
    if (q.hint) wrap.appendChild(el("p", { class: "q-hint", id: "hint-" + q.id, text: q.hint }));

    var body = el("div", { class: "q-body" });
    var describedBy = q.hint ? "hint-" + q.id : null;

    if (q.type === "text") {
      body.appendChild(el("input", {
        type: "text", name: q.id, placeholder: q.placeholder || "", maxlength: String(MAX_TEXT),
        autocomplete: q.id === "name" ? "name" : "off", "aria-label": q.label,
        "aria-required": q.required ? "true" : null, "aria-describedby": describedBy
      }));
    } else if (q.type === "textarea") {
      var ta = el("textarea", {
        name: q.id, placeholder: q.placeholder || "", rows: q.short ? 2 : 4, maxlength: String(MAX_TEXTAREA),
        "aria-label": q.label, "aria-required": q.required ? "true" : null, "aria-describedby": describedBy
      });
      if (q.short) ta.style.minHeight = "64px";
      body.appendChild(ta);
    } else if (q.type === "single" || q.type === "multi") {
      var kind = q.type === "single" ? "radio" : "checkbox";
      var opts = el("div", { class: "opts", role: q.type === "single" ? "radiogroup" : "group", "aria-label": q.label, "aria-required": q.required ? "true" : null, "aria-describedby": describedBy });
      q.options.forEach(function (o) { opts.appendChild(buildOption(q, o, kind)); });
      if (q.exclusive) {
        var ex = buildOption(q, q.exclusive, kind);
        ex.querySelector("input").setAttribute("data-exclusive", "1");
        opts.appendChild(ex);
      }
      body.appendChild(opts);
    } else if (q.type === "matrix") {
      var m = el("div", { class: "matrix", role: "group", "aria-label": q.label });
      var head = el("div", { class: "matrix-head", "aria-hidden": "true" }, [el("span")]);
      q.cols.forEach(function (c) { head.appendChild(el("span", { text: c })); });
      m.appendChild(head);
      q.rows.forEach(function (r) {
        var row = el("div", { class: "matrix-row", role: "radiogroup", "aria-label": r.label });
        row.appendChild(el("span", { class: "row-label", text: r.label }));
        var cells = el("div", { class: "cells" });
        q.cols.forEach(function (c) {
          var input = el("input", { type: "radio", name: q.id + "." + r.id, value: c, "aria-label": r.label + ": " + c });
          cells.appendChild(el("label", { class: "cell" }, [input, el("span", { text: c })]));
        });
        row.appendChild(cells);
        m.appendChild(row);
      });
      body.appendChild(m);
    }

    wrap.appendChild(body);
    wrap.appendChild(el("p", { class: "q-error", id: "err-" + q.id }));
    return wrap;
  }

  function build() {
    var submitRow = form.querySelector(".submit-row");
    var qIndex = 0;
    BLOCKS.forEach(function (b) {
      var sec = el("section", { class: "block", id: "block-" + b.id, "aria-labelledby": "bt-" + b.id });
      sec.appendChild(el("h2", { class: "block-title", id: "bt-" + b.id, text: b.title }));
      sec.appendChild(el("p", { class: "block-note", text: b.note }));
      var list = QUESTIONS.filter(function (q) { return q.block === b.id; });
      list.forEach(function (q) { sec.appendChild(buildQuestion(q, qIndex++)); });
      form.insertBefore(sec, submitRow);

      var li = el("li", { "data-block": b.id }, [
        el("a", { href: "#block-" + b.id, text: b.title }),
        el("small", { text: "0 из " + list.length })
      ]);
      blocksEl.appendChild(li);
    });

    if (!CONFIG.endpoint) {
      noticeEl.textContent = "Приём ответов ещё не подключён. Заполнить можно уже сейчас: после отправки предложим скопировать ответы и переслать " + (CONFIG.contact || "организатору") + ".";
      noticeEl.hidden = false;
    }
    updateStorageHint();
  }

  // ---------- чтение, черновик, прогресс ----------

  function readAnswers() {
    var result = {};
    QUESTIONS.forEach(function (q) {
      if (q.type === "text" || q.type === "textarea") {
        result[q.id] = (form.elements[q.id].value || "").trim();
      } else if (q.type === "single") {
        var r = form.querySelector('input[name="' + q.id + '"]:checked');
        result[q.id] = r ? r.value : "";
      } else if (q.type === "multi") {
        result[q.id] = Array.prototype.map.call(form.querySelectorAll('input[name="' + q.id + '"]:checked'), function (i) { return i.value; });
      } else if (q.type === "matrix") {
        var m = {};
        q.rows.forEach(function (row) {
          var c = form.querySelector('input[name="' + q.id + "." + row.id + '"]:checked');
          m[row.id] = c ? c.value : "";
        });
        result[q.id] = m;
      }
    });
    return result;
  }

  function isAnswered(q, v) {
    if (v == null) return false;
    if (q.type === "multi") return Array.isArray(v) && v.length > 0;
    if (q.type === "matrix") return typeof v === "object" && Object.keys(v).some(function (k) { return v[k]; });
    return !!v;
  }

  function setChecked(name, value) {
    var c = form.querySelector('input[name="' + name + '"][value="' + cssEscape(value) + '"]');
    if (c) c.checked = true;
  }

  function applyDraft(draft) {
    if (!draft || typeof draft !== "object") return;
    QUESTIONS.forEach(function (q) {
      var v = draft[q.id];
      if (v == null) return;
      try {
        if (q.type === "text" || q.type === "textarea") {
          if (typeof v === "string") form.elements[q.id].value = v;
        } else if (q.type === "single") {
          if (typeof v === "string") setChecked(q.id, v);
        } else if (q.type === "multi") {
          if (!Array.isArray(v)) return;
          var list = v.filter(function (x) { return typeof x === "string"; });
          // Исключающий вариант не сочетается с остальными: он побеждает.
          if (q.exclusive && list.indexOf(q.exclusive) !== -1) list = [q.exclusive];
          list.forEach(function (val) { setChecked(q.id, val); });
        } else if (q.type === "matrix") {
          if (typeof v !== "object") return;
          q.rows.forEach(function (row) {
            if (typeof v[row.id] === "string" && v[row.id]) setChecked(q.id + "." + row.id, v[row.id]);
          });
        }
      } catch (e) { /* одно испорченное поле не должно ломать остальные */ }
    });
  }

  function updateProgress() {
    answers = readAnswers();
    var answered = 0;
    var blockDone = {};
    var blockTotal = {};
    QUESTIONS.forEach(function (q) {
      blockTotal[q.block] = (blockTotal[q.block] || 0) + 1;
      if (isAnswered(q, answers[q.id])) {
        answered++;
        blockDone[q.block] = (blockDone[q.block] || 0) + 1;
      }
    });
    counterEl.textContent = "Отвечено " + answered + " из " + total;

    var currentSet = false;
    Array.prototype.forEach.call(blocksEl.children, function (li) {
      var b = li.getAttribute("data-block");
      var done = (blockDone[b] || 0) === blockTotal[b];
      li.classList.toggle("done", done);
      var isCurrent = !done && !currentSet;
      if (isCurrent) currentSet = true;
      li.classList.toggle("current", isCurrent);
      li.querySelector("small").textContent = (blockDone[b] || 0) + " из " + blockTotal[b];
    });

    storage("set", DRAFT_KEY, JSON.stringify(answers));
  }

  // ---------- проверка ----------

  function taskLines(text) {
    return String(text || "").split("\n")
      .map(function (l) { return l.replace(/^\s*\d+[.)]\s*/, "").trim(); })
      .filter(Boolean);
  }

  function markInvalid(q, message) {
    var wrap = document.getElementById("q-" + q.id);
    var err = document.getElementById("err-" + q.id);
    var invalid = !!message;
    wrap.classList.toggle("invalid", invalid);
    err.textContent = message || "";
    Array.prototype.forEach.call(inputsOf(q), function (input) {
      if (invalid) {
        input.setAttribute("aria-invalid", "true");
        var ids = ["err-" + q.id];
        if (q.hint) ids.push("hint-" + q.id);
        input.setAttribute("aria-describedby", ids.join(" "));
      } else {
        input.removeAttribute("aria-invalid");
        if (q.hint) input.setAttribute("aria-describedby", "hint-" + q.id);
        else input.removeAttribute("aria-describedby");
      }
    });
    return invalid ? wrap : null;
  }

  function validate() {
    var firstInvalid = null;
    QUESTIONS.forEach(function (q) {
      var message = "";
      if (q.required && !isAnswered(q, answers[q.id])) {
        message = q.type === "multi" ? "Отметьте хотя бы один вариант."
          : q.type === "single" ? "Выберите один вариант."
          : q.id === "tasks" ? "Напишите хотя бы одну задачу."
          : "Заполните это поле.";
      } else if (q.id === "tasks" && taskLines(answers.tasks).length < 1) {
        message = "Напишите хотя бы одну задачу.";
      }
      var wrap = markInvalid(q, message);
      if (wrap && !firstInvalid) firstInvalid = wrap;
    });
    return firstInvalid;
  }

  function clearInvalid(target) {
    var wrap = target.closest(".q");
    if (!wrap || !wrap.classList.contains("invalid")) return;
    var q = findQuestion(wrap.getAttribute("data-id"));
    if (!q) return;
    var ok = isAnswered(q, answers[q.id]) && (q.id !== "tasks" || taskLines(answers.tasks).length >= 1);
    if (ok) markInvalid(q, "");
  }

  // ---------- отправка ----------

  function flatten() {
    var columns = [["Отправлено", "submittedAt"], ["ID отправки", "submissionId"]];
    var values = { submittedAt: new Date().toISOString(), submissionId: submissionId() };
    QUESTIONS.forEach(function (q) {
      if (q.type === "matrix") {
        q.rows.forEach(function (r) {
          columns.push([r.column, q.id + "." + r.id]);
          values[q.id + "." + r.id] = answers[q.id][r.id] || "";
        });
      } else {
        columns.push([q.column, q.id]);
        values[q.id] = Array.isArray(answers[q.id]) ? answers[q.id].join("; ") : answers[q.id];
      }
    });
    return { v: 1, columns: columns, values: values };
  }

  function asText() {
    var lines = ["Опросник перед обучением"];
    QUESTIONS.forEach(function (q, i) {
      var v = answers[q.id];
      var text;
      if (q.type === "matrix") {
        text = q.rows.map(function (r) { return v[r.id] ? r.label + " — " + v[r.id] : null; }).filter(Boolean).join("; ");
      } else if (Array.isArray(v)) {
        text = v.join("; ");
      } else {
        text = v;
      }
      lines.push((i + 1) + ". " + q.label + ": " + (text || "—"));
    });
    return lines.join("\n");
  }

  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy") === true; } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function showManualCopy(panel, text) {
    var existing = panel.querySelector(".manual-copy");
    if (existing) {
      var old = existing.querySelector("textarea");
      old.value = text;
      old.focus();
      old.select();
      return;
    }
    var box = el("div", { class: "manual-copy" }, [
      el("p", { text: "Скопировать автоматически не получилось. Выделите текст ниже и скопируйте вручную." }),
      el("textarea", { readonly: true, rows: 8, "aria-label": "Ваши ответы текстом" })
    ]);
    box.querySelector("textarea").value = text;
    panel.appendChild(box);
    var ta = box.querySelector("textarea");
    ta.focus();
    ta.select();
  }

  function copyAnswers(button, panel) {
    var text = asText();
    var original = "Скопировать ответы";
    var done = function () {
      button.textContent = "Скопировано";
      setTimeout(function () { button.textContent = original; }, 2500);
    };
    var fallback = function () {
      if (legacyCopy(text)) done();
      else showManualCopy(panel, text);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  function showError(title, text, withRetry) {
    errorEl.innerHTML = "";
    errorEl.appendChild(el("h2", { class: "panel-title", text: title }));
    errorEl.appendChild(el("p", { text: text }));
    var actions = el("div", { class: "actions" });
    if (withRetry) {
      var retry = el("button", { type: "button", class: "btn secondary", text: "Повторить" });
      retry.addEventListener("click", function () { errorEl.hidden = true; submit(); });
      actions.appendChild(retry);
    }
    var copy = el("button", { type: "button", class: "btn secondary", text: "Скопировать ответы" });
    copy.addEventListener("click", function () { copyAnswers(copy, errorEl); });
    actions.appendChild(copy);
    errorEl.appendChild(actions);
    errorEl.hidden = false;
    errorEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function showSuccess() {
    form.hidden = true;
    noticeEl.hidden = true;
    successEl.hidden = false;
    successEl.focus();
    storage("remove", DRAFT_KEY);
    storage("remove", ID_KEY);
    storage("set", SENT_KEY, new Date().toISOString());
  }

  function setSending(on) {
    sending = on;
    submitBtn.disabled = on;
    submitBtn.textContent = on ? "Отправляем…" : "Отправить ответы";
    Array.prototype.forEach.call(form.querySelectorAll("fieldset.q"), function (f) { f.disabled = on; });
    form.classList.toggle("sending", on);
  }

  function send(payload) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, SEND_TIMEOUT_MS) : null;
    return fetch(CONFIG.endpoint, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (!res.ok) throw new Error("Сервер ответил " + res.status);
      return res.text().then(function (t) {
        var data;
        try { data = JSON.parse(t); } catch (e) { throw new Error("Неожиданный ответ сервера"); }
        if (!data.ok) throw new Error(data.error || "Сервер не подтвердил запись");
        return data;
      });
    }).catch(function (err) {
      if (err && err.name === "AbortError") throw new Error("Сервер не ответил за " + (SEND_TIMEOUT_MS / 1000) + " секунд");
      if (err instanceof TypeError) throw new Error("Нет связи с сервером");
      throw err;
    }).then(function (data) {
      if (timer) clearTimeout(timer);
      return data;
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  function submit() {
    if (sending) return;
    updateProgress();
    errorEl.hidden = true;
    var firstInvalid = validate();
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      var focusable = firstInvalid.querySelector("input, textarea");
      if (focusable) focusable.focus({ preventScroll: true });
      return;
    }

    if (!CONFIG.endpoint) {
      showError("Приём ответов ещё не подключён", "Скопируйте ответы и отправьте " + (CONFIG.contact || "организатору") + ". Черновик останется на этом устройстве.", false);
      return;
    }

    setSending(true);
    var payload = flatten();
    send(payload).then(function () {
      setSending(false);
      showSuccess();
    }, function (err) {
      setSending(false);
      showError("Не удалось отправить", (err && err.message ? err.message + ". " : "") + "Попробуйте ещё раз или скопируйте ответы и отправьте " + (CONFIG.contact || "организатору") + ".", true);
    });
  }

  // ---------- события ----------

  form.addEventListener("change", function (e) {
    var t = e.target;
    if (t.type === "checkbox") {
      var group = form.querySelectorAll('input[name="' + t.name + '"]');
      if (t.hasAttribute("data-exclusive") && t.checked) {
        Array.prototype.forEach.call(group, function (i) { if (i !== t) i.checked = false; });
      } else if (t.checked) {
        Array.prototype.forEach.call(group, function (i) { if (i.hasAttribute("data-exclusive")) i.checked = false; });
      }
    }
    updateProgress();
    clearInvalid(t);
  });
  // Для текстовых полей ошибка снимается уже при вводе, а не при потере фокуса:
  // иначе сообщение исчезает в момент клика по следующему варианту, верстка
  // сдвигается между нажатием и отпусканием, и клик теряется.
  form.addEventListener("input", function (e) {
    if (e.target.matches("input[type=text], textarea")) {
      updateProgress();
      clearInvalid(e.target);
    }
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });

  // ---------- старт ----------

  build();
  var draft = storage("get", DRAFT_KEY);
  if (draft) {
    try { applyDraft(JSON.parse(draft)); } catch (e) { /* испорченный черновик игнорируем */ }
  }
  updateProgress();
})();
