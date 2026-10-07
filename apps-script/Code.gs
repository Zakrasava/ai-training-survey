/**
 * Приёмник ответов опросника. Вставить в Apps Script Google-таблицы и развернуть как веб-приложение:
 * Выполнять от имени — владелец таблицы; доступ — все (anyone).
 *
 * Страница отправляет POST с телом text/plain, внутри JSON:
 * { v: 1, columns: [["Заголовок", "ключ"], ...], values: { ключ: значение, ... } }
 * Первый ответ создаёт строку заголовков. Дальше столбцы сопоставляются по заголовкам,
 * поэтому порядок вопросов на странице можно менять, не ломая таблицу.
 */

var SHEET_NAME = "Ответы";

function doGet() {
  return json_({ ok: true, service: "survey", sheet: SHEET_NAME });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var payload = JSON.parse(e.postData.contents);
    if (!payload || !payload.columns || !payload.values) {
      return json_({ ok: false, error: "Нет columns или values" });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    var headers;
    if (sheet.getLastRow() === 0) {
      headers = payload.columns.map(function (c) { return c[0]; });
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    } else {
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      // Новые столбцы со страницы — добавить справа.
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
      if (h === "Отправлено") {
        var d = new Date(v);
        return isNaN(d.getTime()) ? v : d;
      }
      return String(v);
    });

    sheet.appendRow(row);
    return json_({ ok: true, row: sheet.getLastRow() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
