/**
 * Pleak API — a small JSON API in front of a Google Sheet, replacing the
 * old Express backend for a GitHub Pages static deploy.
 *
 * One sheet tab per resource, one row per record. Column order is defined
 * in RESOURCES below and is the single source of truth for both reading
 * and writing rows. See ../docs/apps-script-setup.md for deployment steps.
 *
 * Endpoints (all through this one Web App URL):
 *   GET  ?resource=<name>&action=list[&<field>=<value> ...]
 *   GET  ?resource=<name>&action=get&id=<id>
 *   POST ?resource=<name>&action=create   body: JSON record (text/plain)
 *   POST ?resource=<name>&action=update   body: JSON { id, ...patch }
 *   POST ?resource=<name>&action=delete   body: JSON { id }
 */

var RESOURCES = {
  users: {
    sheet: 'Users',
    headers: ['id', 'googleId', 'email', 'displayName', 'dateOfBirth', 'sex', 'height', 'weight', 'age', 'streak', 'createdAt'],
    json: [],
    bool: [],
  },
  exercises: {
    sheet: 'Exercises',
    headers: ['id', 'name', 'category', 'exerciseType', 'muscleGroups', 'instructions', 'equipment', 'userId', 'createdAt'],
    json: ['muscleGroups'],
    bool: [],
  },
  workoutPlans: {
    sheet: 'WorkoutPlans',
    headers: ['id', 'name', 'description', 'category', 'exercises', 'estimatedDuration', 'difficulty', 'createdAt'],
    json: ['exercises'],
    bool: [],
  },
  workoutSessions: {
    sheet: 'WorkoutSessions',
    headers: ['id', 'userId', 'username', 'planId', 'name', 'startTime', 'endTime', 'totalDuration', 'durationMins', 'exercises', 'isActive'],
    json: ['exercises'],
    bool: ['isActive'],
  },
  scheduledWorkouts: {
    sheet: 'ScheduledWorkouts',
    headers: ['id', 'userId', 'name', 'category', 'scheduledDate', 'scheduledDay', 'exercises', 'createdAt'],
    json: ['exercises'],
    bool: [],
  },
  goals: {
    sheet: 'Goals',
    headers: ['id', 'userId', 'title', 'description', 'type', 'category', 'targetValue', 'currentValue', 'startingValue', 'unit', 'deadline', 'status', 'priority', 'exerciseId', 'targetExerciseWeight', 'targetTime', 'targetDistance', 'createdAt', 'updatedAt'],
    json: [],
    bool: [],
  },
  personalRecords: {
    sheet: 'PersonalRecords',
    headers: ['id', 'userId', 'exerciseName', 'exerciseType', 'weight', 'reps', 'duration', 'distance', 'achievedAt', 'workoutSessionId', 'createdAt'],
    json: [],
    bool: [],
  },
  weeklyWorkoutPlans: {
    sheet: 'WeeklyWorkoutPlans',
    headers: ['id', 'userId', 'name', 'isActive', 'createdAt', 'updatedAt'],
    json: [],
    bool: ['isActive'],
  },
  weeklyPlanDays: {
    sheet: 'WeeklyPlanDays',
    headers: ['id', 'weeklyPlanId', 'weekStartDate', 'dayOfWeek', 'title', 'isRestDay', 'exercises', 'createdAt'],
    json: ['exercises'],
    bool: ['isRestDay'],
  },
  weeklyPlanCompletions: {
    sheet: 'WeeklyPlanCompletions',
    headers: ['id', 'weeklyPlanId', 'userId', 'weekStartDate', 'dayOfWeek', 'sessionId', 'completedAt', 'createdAt'],
    json: [],
    bool: [],
  },
};

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

function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  try {
    var params = (e && e.parameter) || {};
    var resourceName = params.resource;
    var action = params.action || (method === 'GET' ? 'list' : null);
    var config = RESOURCES[resourceName];

    if (!config) {
      return respondJson_({ error: 'Unknown resource: ' + resourceName });
    }
    if (!action) {
      return respondJson_({ error: 'Missing action' });
    }

    var sheet = getSheet_(config.sheet, config.headers);

    if (method === 'GET' && action === 'list') {
      return respondJson_(listRows_(sheet, config, params));
    }
    if (method === 'GET' && action === 'get') {
      var row = findRowById_(sheet, config.headers, params.id);
      return respondJson_(row ? rowToObject_(config, row) : null);
    }

    var body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    if (method === 'POST' && action === 'create') {
      return respondJson_(createRow_(sheet, config, body));
    }
    if (method === 'POST' && action === 'update') {
      return respondJson_(updateRow_(sheet, config, body));
    }
    if (method === 'POST' && action === 'delete') {
      return respondJson_(deleteRow_(sheet, config, body));
    }

    return respondJson_({ error: 'Unsupported action "' + action + '" for ' + method });
  } catch (err) {
    return respondJson_({ error: err && err.message ? err.message : String(err) });
  }
}

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
    var obj = rowToObject_(config, rows[i]);
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
    } else if (value === '' ) {
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

function respondJson_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
