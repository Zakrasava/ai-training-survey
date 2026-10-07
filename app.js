(function () {
  "use strict";

  var CONFIG = window.SURVEY_CONFIG || {};
  var DRAFT_KEY = "survey-draft-v1";
  var SENT_KEY = "survey-sent-v1";

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
      hint: "По одной на строку. Чем конкретнее, тем точнее практика: не «письма», а «ответы на отзывы гостей на Яндекс Картах».",
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

  var answers = {};
  var total = QUESTIONS.length;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (attrs[k] === true) node.setAttribute(k, "");
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function storage(action, key, value) {
    try {
      if (action === "get") return window.localStorage.getItem(key);
      if (action === "set") window.localStorage.setItem(key, value);
      if (action === "remove") window.localStorage.removeItem(key);
    } catch (e) { /* приватный режим или запрет хранения */ }
    return null;
  }

  // ---------- построение формы ----------

  function buildOption(q, value, kind, rowId) {
    var name = rowId ? q.id + "." + rowId : q.id;
    var input = el("input", { type: kind, name: name, value: value });
    return el("label", { class: "opt" }, [input, el("span", { text: value })]);
  }

  function buildQuestion(q, index) {
    var wrap = el("fieldset", { class: "q" + (q.required ? " q-required" : ""), id: "q-" + q.id, "data-id": q.id });
    var legendChildren = [el("span", { class: "q-num", text: String(index + 1) }), el("span", { text: q.label })];
    wrap.appendChild(el("legend", { class: "q-label" }, legendChildren));
    if (q.hint) wrap.appendChild(el("p", { class: "q-hint", text: q.hint }));

    var body = el("div", { class: "q-body" });

    if (q.type === "text") {
      body.appendChild(el("input", { type: "text", name: q.id, placeholder: q.placeholder || "", autocomplete: q.id === "name" ? "name" : "off", "aria-label": q.label }));
    } else if (q.type === "textarea") {
      var ta = el("textarea", { name: q.id, placeholder: q.placeholder || "", rows: q.short ? 2 : 4, "aria-label": q.label });
      if (q.short) ta.style.minHeight = "64px";
      body.appendChild(ta);
    } else if (q.type === "single" || q.type === "multi") {
      var kind = q.type === "single" ? "radio" : "checkbox";
      var opts = el("div", { class: "opts" });
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
      QUESTIONS.filter(function (q) { return q.block === b.id; }).forEach(function (q) {
        sec.appendChild(buildQuestion(q, qIndex++));
      });
      form.insertBefore(sec, submitRow);

      var count = QUESTIONS.filter(function (q) { return q.block === b.id; }).length;
      var li = el("li", { "data-block": b.id }, [
        el("a", { href: "#block-" + b.id, text: b.title }),
        el("small", { text: count + (count === 3 ? " вопроса" : " вопросов"), "data-count": count })
      ]);
      blocksEl.appendChild(li);
    });

    if (!CONFIG.endpoint) {
      noticeEl.textContent = "Приём ответов ещё не подключён. Заполнить можно уже сейчас: после отправки предложим скопировать ответы и переслать " + (CONFIG.contact || "организатору") + ".";
      noticeEl.hidden = false;
    }
  }

  // ---------- чтение и сохранение ----------

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
    if (q.type === "multi") return v.length > 0;
    if (q.type === "matrix") return Object.keys(v).some(function (k) { return v[k]; });
    return !!v;
  }

  function applyDraft(draft) {
    QUESTIONS.forEach(function (q) {
      var v = draft[q.id];
      if (v == null) return;
      if (q.type === "text" || q.type === "textarea") {
        form.elements[q.id].value = v;
      } else if (q.type === "single") {
        var r = form.querySelector('input[name="' + q.id + '"][value="' + cssEscape(v) + '"]');
        if (r) r.checked = true;
      } else if (q.type === "multi") {
        (v || []).forEach(function (val) {
          var c = form.querySelector('input[name="' + q.id + '"][value="' + cssEscape(val) + '"]');
          if (c) c.checked = true;
        });
      } else if (q.type === "matrix") {
        Object.keys(v).forEach(function (rowId) {
          if (!v[rowId]) return;
          var c = form.querySelector('input[name="' + q.id + "." + rowId + '"][value="' + cssEscape(v[rowId]) + '"]');
          if (c) c.checked = true;
        });
      }
    });
  }

  function cssEscape(s) {
    return String(s).replace(/["\\]/g, "\\$&");
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
      var small = li.querySelector("small");
      small.textContent = (blockDone[b] || 0) + " из " + blockTotal[b];
    });

    storage("set", DRAFT_KEY, JSON.stringify(answers));
  }

  // ---------- проверка ----------

  function validate() {
    var firstInvalid = null;
    QUESTIONS.forEach(function (q) {
      var wrap = document.getElementById("q-" + q.id);
      var err = document.getElementById("err-" + q.id);
      var ok = !q.required || isAnswered(q, answers[q.id]);
      if (q.id === "tasks" && ok) {
        var lines = answers.tasks.split("\n").map(function (l) { return l.replace(/^\s*\d+[.)]\s*/, "").trim(); }).filter(Boolean);
        if (lines.length < 1) ok = false;
      }
      wrap.classList.toggle("invalid", !ok);
      err.textContent = ok ? "" : (q.type === "multi" ? "Отметьте хотя бы один вариант." : q.type === "single" ? "Выберите один вариант." : "Заполните это поле.");
      if (!ok && !firstInvalid) firstInvalid = wrap;
    });
    return firstInvalid;
  }

  // ---------- отправка ----------

  function flatten() {
    var columns = [["Отправлено", "submittedAt"]];
    var values = { submittedAt: new Date().toISOString() };
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

  function copyAnswers(button) {
    var text = asText();
    var done = function () { button.textContent = "Скопировано"; setTimeout(function () { button.textContent = "Скопировать ответы"; }, 2500); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text); done(); });
    } else {
      legacyCopy(text); done();
    }
  }

  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ничего */ }
    document.body.removeChild(ta);
  }

  function showError(title, text, withRetry) {
    errorEl.innerHTML = "";
    errorEl.appendChild(el("h2", { class: "panel-title", text: title }));
    errorEl.appendChild(el("p", { text: text }));
    var actions = el("div", { class: "actions" });
    if (withRetry) {
      var retry = el("button", { type: "button", class: "btn secondary", text: "Повторить" });
      retry.addEventListener("click", function () { errorEl.hidden = true; form.requestSubmit ? form.requestSubmit() : submit(); });
      actions.appendChild(retry);
    }
    var copy = el("button", { type: "button", class: "btn secondary", text: "Скопировать ответы" });
    copy.addEventListener("click", function () { copyAnswers(copy); });
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
    storage("set", SENT_KEY, new Date().toISOString());
  }

  function send(payload) {
    return fetch(CONFIG.endpoint, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error("Сервер ответил " + res.status);
      return res.text().then(function (t) {
        var data;
        try { data = JSON.parse(t); } catch (e) { throw new Error("Неожиданный ответ сервера"); }
        if (!data.ok) throw new Error(data.error || "Сервер не подтвердил запись");
        return data;
      });
    });
  }

  function submit() {
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

    submitBtn.disabled = true;
    submitBtn.textContent = "Отправляем…";
    send(flatten()).then(function () {
      showSuccess();
    }, function (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Отправить ответы";
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
    var wrap = t.closest(".q");
    if (wrap && wrap.classList.contains("invalid")) {
      var q = QUESTIONS.filter(function (x) { return x.id === wrap.getAttribute("data-id"); })[0];
      if (q && isAnswered(q, answers[q.id])) {
        wrap.classList.remove("invalid");
        document.getElementById("err-" + q.id).textContent = "";
      }
    }
  });
  form.addEventListener("input", function (e) {
    if (e.target.matches("input[type=text], textarea")) updateProgress();
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
