function getSheet_(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function listRows_(sheet, config, params) {
  var data = sheet.getDataRange().getValues();
  var rows = data.slice(1);
  var filterKeys = Object.keys(params).filter(function (k) {
    return k !== 'resource' && k !== 'action' && config.headers.indexOf(k) !== -1;
  });

  var results = [];
  for (var i = 0; i < rows.length; i++) {
    if (isBlankRow_(rows[i])) continue;
    var obj;
    try {
      obj = rowToObject_(config, rows[i]);
    } catch (err) {
      // A single malformed row (e.g. bad JSON in a json column) shouldn't
      // take down the whole list — skip it and keep going.
      continue;
    }
    var matches = filterKeys.every(function (key) {
      return String(obj[key]) === String(params[key]);
    });
    if (matches) results.push(obj);
  }
  return results;
}

function findRowById_(sheet, headers, id) {
  if (!id) return null;
  var idCol = headers.indexOf('id');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) return data[i];
  }
  return null;
}

function findRowIndexById_(sheet, headers, id) {
  var idCol = headers.indexOf('id');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) return i; // 0-based, includes header offset already
  }
  return -1;
}

function isBlankRow_(row) {
  return row.every(function (cell) {
    return cell === '' || cell === null || cell === undefined;
  });
}

function rowToObject_(config, row) {
  var obj = {};
  config.headers.forEach(function (header, i) {
    var value = row[i];
    if (config.json.indexOf(header) !== -1) {
      obj[header] = value ? JSON.parse(value) : [];
    } else if (config.bool.indexOf(header) !== -1) {
      obj[header] = value === true || value === 'TRUE';
    } else if (value === '') {
      obj[header] = null;
    } else if (value instanceof Date) {
      obj[header] = value.toISOString();
    } else {
      obj[header] = value;
    }
  });
  return obj;
}

function objectToRow_(config, obj) {
  return config.headers.map(function (header) {
    var value = obj[header];
    if (config.json.indexOf(header) !== -1) {
      return JSON.stringify(value || []);
    }
    if (value === undefined || value === null) return '';
    return value;
  });
}
