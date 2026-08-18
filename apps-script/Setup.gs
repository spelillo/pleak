/**
 * Run this once from the Apps Script editor (select `setup`, click Run) to
 * create every sheet tab with its header row. Safe to re-run; it only fills
 * in what's missing.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(RESOURCES).forEach(function (key) {
    var config = RESOURCES[key];
    var sheet = ss.getSheetByName(config.sheet);
    if (!sheet) {
      sheet = ss.insertSheet(config.sheet);
    }
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
      sheet.setFrozenRows(1);
    }
  });
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
}
