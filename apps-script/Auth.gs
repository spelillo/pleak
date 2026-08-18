/**
 * Google Sign-In verification. The frontend gets an ID token from Google
 * Identity Services and POSTs it here; we verify it against Google's
 * tokeninfo endpoint (which checks the signature and expiry for us),
 * confirm it was issued for our client ID, check the email against the
 * allowlist, then find or create the matching Users row.
 */
function handleAuthLogin_(body) {
  if (!body.idToken) throw new Error('login requires an idToken');

  var info = verifyGoogleIdToken_(body.idToken);
  var email = String(info.email || '').toLowerCase();
  if (!info.email_verified || info.email_verified === 'false') {
    throw new Error('Google account email is not verified');
  }
  if (ALLOWED_EMAILS.indexOf(email) === -1) {
    throw new Error('This Google account is not allowed to sign in');
  }

  var config = RESOURCES.users;
  var sheet = getSheet_(config.sheet, config.headers);
  var existingRow = findUserByGoogleId_(sheet, config, info.sub);
  if (existingRow) {
    return existingRow;
  }
  return createRow_(sheet, config, {
    googleId: info.sub,
    email: email,
    displayName: info.name || email,
  });
}

function verifyGoogleIdToken_(idToken) {
  var res = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true },
  );
  var info = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200 || !info.sub) {
    throw new Error('Invalid Google ID token');
  }
  if (info.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('ID token was not issued for this app');
  }
  return info;
}

function findUserByGoogleId_(sheet, config, googleId) {
  var data = sheet.getDataRange().getValues();
  var col = config.headers.indexOf('googleId');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][col]) === String(googleId)) {
      return rowToObject_(config, data[i]);
    }
  }
  return null;
}
