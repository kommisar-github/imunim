// routing.gs — אימוני ירי v5.0.12

var DENY_HTML = '<html dir="rtl"><body style="background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:Segoe UI,Tahoma,Arial,sans-serif"><div style="text-align:center;padding:40px;color:#f87171;font-size:18px">אין הרשאה — גישה למורשים בלבד</div></body></html>';

function doGet(e) {
  var action = (e.parameter && e.parameter.action) ? e.parameter.action : null;
  var sessionId = (e.parameter && e.parameter.session) ? e.parameter.session : null;
  var userEmail = '';
  if (REQUIRE_LOGIN) { try { userEmail = Session.getActiveUser().getEmail() || ''; } catch(ex) {} }

  // Default: landing page
  if (!action) {
    return HtmlService.createHtmlOutput(getLandingHtml())
      .setTitle('הכשרת ירי')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (action === 'landing') {
    return HtmlService.createHtmlOutput(getLandingHtml())
      .setTitle('הכשרת ירי')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (action === 'register') {
    var prefillTz = e.parameter.tz || '';
    var adminMode = e.parameter.admin === '1';
    return HtmlService.createHtmlOutput(getLookupHtml(prefillTz, adminMode))
      .setTitle('רישום מתאמנים')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (action === 'poll') {
    return HtmlService.createHtmlOutput(getPollHtml(sessionId))
      .setTitle('סקר נוכחות')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (action === 'instructor') {
    // Auth gate moved to client-side OTP flow (supports Execute-as-Me deployment)
    return HtmlService.createHtmlOutput(getInstructorDashboardHtml())
      .setTitle('לוח מדריך')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (action === 'admin') {
    // Admin login handled client-side via OTP (v5.0.0)
    return HtmlService.createHtmlOutput(getAdminDashboardHtml())
      .setTitle('לוח בקרה - מנהל')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (action === 'print' && sessionId) {
    if (REQUIRE_LOGIN) {
      // If Google session available and authorized — show print directly
      if (userEmail && isSessionAuthorized(userEmail, sessionId)) {
        return HtmlService.createHtmlOutput(getPrintHtml(sessionId))
          .setTitle('יומן רישום מתאמנים')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      }
      // Otherwise — show OTP gate page
      return HtmlService.createHtmlOutput(getPrintOtpGateHtml(sessionId))
        .setTitle('אימות — הדפסה')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    return HtmlService.createHtmlOutput(getPrintHtml(sessionId))
      .setTitle('יומן רישום מתאמנים')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (action === 'printVerified' && sessionId) {
    var token = (e.parameter && e.parameter.token) ? e.parameter.token : '';
    if (token) {
      var cache = CacheService.getScriptCache();
      var cachedTz = cache.get('print-token-' + token);
      if (cachedTz) {
        cache.remove('print-token-' + token);
        if (isSessionAuthorizedByTz(cachedTz, sessionId) || isOwnerEmail(userEmail)) {
          return HtmlService.createHtmlOutput(getPrintHtml(sessionId))
            .setTitle('יומן רישום מתאמנים')
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        }
      }
    }
    return HtmlService.createHtmlOutput(DENY_HTML)
      .setTitle('אין הרשאה')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (action === 'status' && sessionId) {
    // Status is called from authenticated instructor dashboard (post-OTP);
    // doGetStatus returns read-only aggregate counts — safe without email gate
    var result = doGetStatus(sessionId);
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'debug') {
    var debugEmail = '';
    try { debugEmail = Session.getActiveUser().getEmail(); } catch(err) { debugEmail = 'ERROR: ' + err.message; }
    // Gate: owner only (v5.0.12)
    if (!isOwnerEmail(debugEmail)) {
      return HtmlService.createHtmlOutput(DENY_HTML)
        .setTitle('אין הרשאה')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    var authResult = isAuthorizedEmail(debugEmail);
    var ownerResult = isOwnerEmail(debugEmail);
    var adminByEmailResult = isAdminByEmail(debugEmail);
    var html = '<html dir="rtl"><body style="background:#0f172a;color:#e2e8f0;font-family:monospace;padding:40px">'
      + '<h2 style="color:#38bdf8">Debug Info — v' + SCRIPT_VERSION + '</h2>'
      + '<p><b>Session.getActiveUser().getEmail():</b> [' + debugEmail + ']</p>'
      + '<p><b>isAuthorizedEmail:</b> ' + authResult + '</p>'
      + '<p><b>isOwnerEmail:</b> ' + ownerResult + '</p>'
      + '<p><b>isAdminByEmail:</b> ' + adminByEmailResult + '</p>'
      + '<p><b>REQUIRE_LOGIN:</b> ' + REQUIRE_LOGIN + '</p>'
      + '<p><b>OWNER_EMAILS:</b> ' + JSON.stringify(OWNER_EMAILS) + '</p>'
      + '</body></html>';
    return HtmlService.createHtmlOutput(html)
      .setTitle('Debug')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Unknown action
  return HtmlService.createHtmlOutput('פעולה לא מוכרת')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
