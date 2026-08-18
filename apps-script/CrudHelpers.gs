function createRow_(sheet, config, body) {
  var now = new Date().toISOString();
  var record = {};
  config.headers.forEach(function (header) {
    record[header] = body[header];
  });
  if (config.headers.indexOf('id') !== -1 && !record.id) {
    record.id = Utilities.getUuid();
  }
  if (config.headers.indexOf('createdAt') !== -1 && !record.createdAt) {
    record.createdAt = now;
  }
  if (config.headers.indexOf('updatedAt') !== -1 && !record.updatedAt) {
    record.updatedAt = now;
  }
  sheet.appendRow(objectToRow_(config, record));
  return record;
}

function updateRow_(sheet, config, body) {
  if (!body.id) throw new Error('update requires an id');
  var rowIndex = findRowIndexById_(sheet, config.headers, body.id);
  if (rowIndex === -1) throw new Error('No ' + config.sheet + ' row with id ' + body.id);

  var range = sheet.getRange(rowIndex + 1, 1, 1, config.headers.length);
  var existing = rowToObject_(config, range.getValues()[0]);
  var merged = Object.assign({}, existing, body);
  if (config.headers.indexOf('updatedAt') !== -1) {
    merged.updatedAt = new Date().toISOString();
  }
  range.setValues([objectToRow_(config, merged)]);
  return merged;
}

function deleteRow_(sheet, config, body) {
  if (!body.id) throw new Error('delete requires an id');
  var rowIndex = findRowIndexById_(sheet, config.headers, body.id);
  if (rowIndex === -1) throw new Error('No ' + config.sheet + ' row with id ' + body.id);
  sheet.deleteRow(rowIndex + 1);
  return { success: true };
}
