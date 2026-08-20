function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  try {
    var params = (e && e.parameter) || {};

    if (!isAuthorizedRequest_(params)) {
      return respondJson_({ error: 'Unauthorized' });
    }

    var resourceName = params.resource;
    var action = params.action || (method === 'GET' ? 'list' : null);

    if (resourceName === 'auth') {
      if (method !== 'POST' || action !== 'login') {
        return respondJson_({ error: 'Unsupported auth action' });
      }
      var authBody = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
      return respondJson_(handleAuthLogin_(authBody));
    }

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

// The Web App has to be deployed with "Anyone" access to be reachable from
// the browser at all — Apps Script has no per-request auth of its own, and
// Google Sign-In only gates the UI, not this endpoint. This shared-secret
// check is a deliberately modest bar: it keeps the endpoint from being
// wide open to anyone who finds the URL (scanners, accidental discovery,
// stale links), not a substitute for real per-user authorization. The key
// is baked into the frontend bundle, so a determined reader of the built
// JS can still recover it — that's an inherent limit of a static SPA with
// no server of its own, not something this check can close.
function isAuthorizedRequest_(params) {
  var expected = PropertiesService.getScriptProperties().getProperty('API_KEY');
  return !!expected && params.apiKey === expected;
}

function respondJson_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
