/**
 * Приёмник ответов опросника. Вставить в Apps Script Google-таблицы (Расширения → Apps Script)
 * и развернуть как веб-приложение: выполнять от имени владельца таблицы, доступ — все (anyone).
 *
 * Страница отправляет POST с телом text/plain, внутри JSON:
 * { v: 1, columns: [["Заголовок", "ключ"], ...], values: { ключ: значение, ... } }
 * Первый ответ создаёт строку заголовков. Дальше столбцы сопоставляются по заголовкам,
 * поэтому порядок вопросов на странице можно менять, не ломая таблицу.
 * Повторная отправка с тем же «ID отправки» перезаписывает строку, а не добавляет новую.
 */

var SHEET_NAME = "Ответы";
// Если скрипт не привязан к таблице (создан отдельно), укажите её ID из адресной строки:
// https://docs.google.com/spreadsheets/d/<ID>/edit
var SPREADSHEET_ID = "";

var LIMITS = { columns: 40, header: 120, key: 60, value: 5000 };
var ID_HEADER = "ID отправки";
var TIME_HEADER = "Отправлено";

function doGet() {
  try {
    var sheet = getSheet_();
    return json_({ ok: true, service: "survey", sheet: sheet.getName(), rows: Math.max(sheet.getLastRow() - 1, 0) });
  } catch (err) {
    return json_({ ok: false, error: "Нет доступа к таблице: " + String(err && err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var payload = parsePayload_(e);
    var sheet = getSheet_();

    var headers;
    if (sheet.getLastRow() === 0) {
      headers = payload.columns.map(function (c) { return c[0]; });
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    } else {
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
      payload.columns.forEach(function (c) {
        if (headers.indexOf(c[0]) === -1) {
          headers.push(c[0]);
          sheet.getRange(1, headers.length).setValue(c[0]).setFontWeight("bold");
        }
      });
    }

    var keyByHeader = {};
    payload.columns.forEach(function (c) { keyByHeader[c[0]] = c[1]; });

    var row = headers.map(function (h) {
      var key = keyByHeader[h];
      var v = key ? payload.values[key] : "";
      if (v == null) return "";
      if (h === TIME_HEADER) {
        var d = new Date(v);
        return isNaN(d.getTime()) ? safeText_(v) : d;
      }
      return safeText_(v);
    });

    // Повтор той же отправки — перезаписать строку.
    var idCol = headers.indexOf(ID_HEADER);
    var existingRow = idCol === -1 ? -1 : findRowById_(sheet, idCol + 1, payload.values.submissionId);
    if (existingRow > 0) {
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
      return json_({ ok: true, row: existingRow, updated: true });
    }

    sheet.appendRow(row);
    return json_({ ok: true, row: sheet.getLastRow() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error("Пустой запрос");
  var payload;
  try { payload = JSON.parse(e.postData.contents); } catch (err) { throw new Error("Тело запроса не JSON"); }
  if (!payload || payload.v !== 1) throw new Error("Неподдерживаемая версия формы");
  if (!Array.isArray(payload.columns) || payload.columns.length === 0 || payload.columns.length > LIMITS.columns) {
    throw new Error("Некорректный список колонок");
  }
  if (!payload.values || typeof payload.values !== "object" || Array.isArray(payload.values)) {
    throw new Error("Некорректные значения");
  }
  var seenHeaders = {};
  var seenKeys = {};
  payload.columns.forEach(function (c) {
    if (!Array.isArray(c) || c.length !== 2 || typeof c[0] !== "string" || typeof c[1] !== "string") throw new Error("Некорректная колонка");
    if (!c[0].trim() || c[0].length > LIMITS.header || !/^[\w.]{1,60}$/.test(c[1])) throw new Error("Некорректное имя колонки");
    if (seenHeaders[c[0]] || seenKeys[c[1]]) throw new Error("Повторяющаяся колонка: " + c[0]);
    seenHeaders[c[0]] = true;
    seenKeys[c[1]] = true;
  });
  if (!seenHeaders[ID_HEADER] || typeof payload.values.submissionId !== "string" || !/^[0-9a-f-]{36}$/.test(payload.values.submissionId)) {
    throw new Error("Нет идентификатора отправки");
  }
  Object.keys(payload.values).forEach(function (k) {
    var v = payload.values[k];
    if (v != null && typeof v !== "string") payload.values[k] = String(v);
    if (typeof payload.values[k] === "string" && payload.values[k].length > LIMITS.value) {
      payload.values[k] = payload.values[k].slice(0, LIMITS.value);
    }
  });
  return payload;
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss && SPREADSHEET_ID) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!ss) throw new Error("скрипт не привязан к таблице и SPREADSHEET_ID не задан");
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function findRowById_(sheet, colIndex, id) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, colIndex, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) return i + 2;
  }
  return -1;
}

// Значения, начинающиеся с = + - @, Sheets трактует как формулы. Апостроф впереди оставляет их текстом.
function safeText_(v) {
  var s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
