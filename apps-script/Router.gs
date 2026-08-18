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

function respondJson_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
