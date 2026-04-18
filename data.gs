// data.gs — אימוני ירי v6.1.5

// =====================================================
// v6.0.0 — Session management
// =====================================================

function _createUserSession(tz, role, name) {
  tz = normalizeId(tz);
  var token = Utilities.getUuid();
  var cache = CacheService.getScriptCache();
  var isOwner_ = isOwnerByTz(tz);
  var sessionData = JSON.stringify({
    tz: tz,
    role: role,
    isAdmin: role === 'admin',
    isOwner: isOwner_,
    name: name || ''
  });
  cache.put(SESSION_KEY_PREFIX + token, sessionData, SESSION_TTL_SECONDS);
  return token;
}

function validateUserSession(token) {
  if (!token) return {valid: false};
  try {
    var cache = CacheService.getScriptCache();
    var raw = cache.get(SESSION_KEY_PREFIX + token);
    if (!raw) return {valid: false};
    var data = JSON.parse(raw);
    return {
      valid: true,
      tz: data.tz,
      role: data.role,
      isAdmin: data.isAdmin || false,
      isOwner: data.isOwner || false,
      name: data.name || ''
    };
  } catch(e) {
    Logger.log('validateUserSession error: ' + e.message);
    return {valid: false};
  }
}

function destroyUserSession(token) {
  if (!token) return;
  try {
    CacheService.getScriptCache().remove(SESSION_KEY_PREFIX + token);
  } catch(e) {
    Logger.log('destroyUserSession error: ' + e.message);
  }
}

function requireAuth(token, allowedRoles) {
  if (!token) throw new Error('נדרשת הזדהות');
  var session = validateUserSession(token);
  if (!session.valid) throw new Error('הזדהות פגה. יש להתחבר מחדש');
  if (allowedRoles && allowedRoles.indexOf(session.role) === -1) {
    throw new Error('אין הרשאה לפעולה זו');
  }
  return session;
}

// v6.1.1 — Admin edit token for cross-tab register access
function issueAdminEditToken(token) {
  var session = requireAuth(token, ['admin']);
  var editToken = Utilities.getUuid();
  CacheService.getScriptCache().put('edit-token-' + editToken, session.tz, 120); // 2 min
  return editToken;
}

// =====================================================
// Session ID and session management
// =====================================================

function generateSessionId(dateStr, instructorTz) {
  // dateStr: "20/03/2026", returns "20260320-318253233"
  var parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  var day = parts[0];
  var month = parts[1];
  var year = parts[2];
  return year + month + day + '-' + instructorTz;
}

function parseSessionRow(data, i) {
  var dateVal = data[i][1];
  var dateStr = '';
  if (dateVal instanceof Date) {
    dateStr = Utilities.formatDate(dateVal, 'Asia/Jerusalem', 'dd/MM/yyyy');
  } else {
    dateStr = String(dateVal).trim();
  }
  return {
    sessionId: String(data[i][0] || '').trim(),
    date: dateStr,
    instructorTz: String(data[i][2] || '').trim(),
    instructorName: String(data[i][3] || '').trim(),
    status: String(data[i][4] || '').trim(),
    notes: String(data[i][5] || '').trim(),
    deputy1Tz: data[i].length > 7 ? String(data[i][7] || '').trim() : '',
    deputy2Tz: data[i].length > 8 ? String(data[i][8] || '').trim() : ''
  };
}

function getActiveSessions() {
  try {
    var ss = SpreadsheetApp.openById(SESSIONS_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) return [];
    var cols = Math.max(sheet.getLastColumn(), 9);
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
    var sessions = [];
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][4] || '').trim() === 'פעיל') {
        sessions.push(parseSessionRow(data, i));
      }
    }
    sessions.sort(function(a, b) {
      return parseDate(a.date) - parseDate(b.date);
    });
    return sessions;
  } catch(err) {
    Logger.log('getActiveSessions error: ' + err.message);
    return [];
  }
}

function getAllSessions() {
  try {
    var ss = SpreadsheetApp.openById(SESSIONS_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) return [];
    var cols = Math.max(sheet.getLastColumn(), 9);
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
    var sessions = [];
    for (var i = 0; i < data.length; i++) {
      sessions.push(parseSessionRow(data, i));
    }
    sessions.sort(function(a, b) {
      return parseDate(b.date) - parseDate(a.date);
    });
    return sessions;
  } catch(err) {
    Logger.log('getAllSessions error: ' + err.message);
    return [];
  }
}

function getInstructorSessions(instructorTz) {
  try {
    var tz = normalizeId(instructorTz);
    var ss = SpreadsheetApp.openById(SESSIONS_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) return [];
    var cols = Math.max(sheet.getLastColumn(), 9);
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
    var sessions = [];
    for (var i = 0; i < data.length; i++) {
      var mainTz = normalizeId(data[i][2]);
      var d1 = data[i].length > 7 ? normalizeId(data[i][7]) : '';
      var d2 = data[i].length > 8 ? normalizeId(data[i][8]) : '';
      if (mainTz === tz) {
        var s = parseSessionRow(data, i);
        s.role = 'main';
        sessions.push(s);
      } else if (d1 === tz || d2 === tz) {
        var s = parseSessionRow(data, i);
        s.role = 'deputy';
        sessions.push(s);
      }
    }
    sessions.sort(function(a, b) {
      return parseDate(b.date) - parseDate(a.date);
    });
    return sessions;
  } catch(err) {
    Logger.log('getInstructorSessions error: ' + err.message);
    return [];
  }
}

function createSession(dateStr, instructorTz, notes, deputy1Tz, deputy2Tz) {
  var tz = normalizeId(instructorTz);
  var instructor = getInstructorData(tz);
  if (!instructor || !instructor.name) {
    return {success: false, message: 'מדריך לא נמצא'};
  }

  var sessionId = generateSessionId(dateStr, tz);
  if (!sessionId) {
    return {success: false, message: 'תאריך לא חוקי'};
  }

  var d1 = deputy1Tz ? normalizeId(deputy1Tz) : '';
  var d2 = deputy2Tz ? normalizeId(deputy2Tz) : '';

  try {
    var ss = SpreadsheetApp.openById(SESSIONS_SHEET_ID);
    var sheet = ss.getSheets()[0];

    // Check for duplicate
    if (sheet.getLastRow() > 1) {
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]).trim() === sessionId) {
          return {success: false, message: 'אימון בתאריך זה כבר קיים'};
        }
      }
    }

    // Parse date
    var parts = dateStr.split('/');
    var dateObj = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));

    sheet.appendRow([sessionId, dateObj, tz, instructor.name, 'פעיל', notes || '', new Date(), d1, d2]);
    notifyAdminSessionEvent('opened', dateStr, instructor.name, tz, d1, d2);
    return {success: true, sessionId: sessionId};
  } catch(err) {
    Logger.log('createSession error: ' + err.message);
    return {success: false, message: 'שגיאה ביצירת אימון'};
  }
}

function closeSession(sessionId) {
  try {
    var ss = SpreadsheetApp.openById(SESSIONS_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (sheet.getLastRow() < 2) return {success: false, message: 'אין אימונים'};

    var cols = Math.max(sheet.getLastColumn(), 9);
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === sessionId) {
        sheet.getRange(i + 2, 5).setValue('סגור');
        var dateVal = data[i][1];
        var dateStr = '';
        if (dateVal instanceof Date) {
          dateStr = Utilities.formatDate(dateVal, 'Asia/Jerusalem', 'dd/MM/yyyy');
        } else {
          dateStr = String(dateVal).trim();
        }
        var instrName = String(data[i][3] || '').trim();
        var instrTz = String(data[i][2] || '').trim();
        var d1 = data[i].length > 7 ? String(data[i][7] || '').trim() : '';
        var d2 = data[i].length > 8 ? String(data[i][8] || '').trim() : '';
        notifyAdminSessionEvent('closed', dateStr, instrName, instrTz, d1, d2);
        return {success: true};
      }
    }
    return {success: false, message: 'אימון לא נמצא'};
  } catch(err) {
    Logger.log('closeSession error: ' + err.message);
    return {success: false, message: 'שגיאה בסגירת אימון'};
  }
}

function notifyAdminSessionEvent(eventType, dateStr, instructorName, instructorTz, deputy1Tz, deputy2Tz) {
  try {
    if (!OWNER_EMAILS || OWNER_EMAILS.length === 0) return;
    var isOpen = eventType === 'opened';
    var subject = (isOpen ? 'אימון נפתח' : 'אימון נסגר') + ' — ' + dateStr + ' — ' + instructorName;
    var deputyInfo = '';
    if (deputy1Tz) {
      var d1Data = getInstructorData(deputy1Tz);
      deputyInfo += '\nמ"מ 1: ' + (d1Data.name || deputy1Tz);
    }
    if (deputy2Tz) {
      var d2Data = getInstructorData(deputy2Tz);
      deputyInfo += '\nמ"מ 2: ' + (d2Data.name || deputy2Tz);
    }
    var body = (isOpen ? 'אימון חדש נפתח' : 'אימון נסגר') + '.\n\n'
      + 'תאריך: ' + dateStr + '\n'
      + 'מדריך: ' + instructorName + ' (' + instructorTz + ')'
      + deputyInfo + '\n\n'
      + 'תאריך דיווח: ' + new Date().toLocaleString('he-IL');
    for (var i = 0; i < OWNER_EMAILS.length; i++) {
      MailApp.sendEmail(OWNER_EMAILS[i], subject, body, {name: OTP_FROM_NAME});
    }
  } catch(err) {
    Logger.log('notifyAdminSessionEvent error: ' + err.message);
  }
}

function autoClosePastSessions() {
  try {
    var today = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');
    var sessions = getActiveSessions();
    var closed = 0;
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      // s.date is dd/MM/yyyy — convert to yyyy-MM-dd for comparison
      var parts = s.date.split('/');
      if (parts.length !== 3) continue;
      var isoDate = parts[2] + '-' + parts[1] + '-' + parts[0];
      if (isoDate < today) {
        var result = closeSession(s.sessionId);
        if (result.success) closed++;
      }
    }
    Logger.log('autoClosePastSessions: closed ' + closed + ' session(s) (today=' + today + ')');
    return {success: true, closed: closed};
  } catch(err) {
    Logger.log('autoClosePastSessions error: ' + err.message);
    try {
      if (OWNER_EMAILS && OWNER_EMAILS.length > 0) {
        MailApp.sendEmail(OWNER_EMAILS[0], 'שגיאה בסגירה אוטומטית - אימוני ירי',
          'הסגירה האוטומטית של אימונים נכשלה.\n\nשגיאה: ' + err.message + '\n\nתאריך: ' + new Date().toLocaleString('he-IL'));
      }
    } catch(e) { Logger.log('Could not send auto-close failure notification: ' + e.message); }
    return {success: false, error: err.message};
  }
}

// =====================================================
// Instructor attendance override
// =====================================================

function getSessionResponses(sessionId) {
  if (!sessionId) return [];
  try {
    var ss = SpreadsheetApp.openById(RESPONSE_SHEET_ID);
    var sheet = null;
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getName() === POLL_SHEET_NAME) { sheet = sheets[i]; break; }
    }
    if (!sheet || sheet.getLastRow() < 2) return [];
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    var results = [];
    for (var i = 0; i < data.length; i++) {
      var sid = String(data[i][5] || '').trim();
      if (sid !== sessionId) continue;
      var trainee = String(data[i][1] || '');
      var nameOnly = trainee.indexOf(' - ') > -1 ? trainee.split(' - ')[0].trim() : trainee.trim();
      results.push({
        name: nameOnly,
        trainee: trainee,
        attending: String(data[i][2] || '').indexOf('\u05DB\u05DF') > -1,
        bullets: String(data[i][3] || ''),
        notes: String(data[i][4] || ''),
        rowIndex: i + 2
      });
    }
    results.sort(function(a, b) { return a.name.localeCompare(b.name); });
    return results;
  } catch(err) {
    Logger.log('getSessionResponses error: ' + err.message);
    return [];
  }
}

function updateSessionResponse(sessionId, traineeName, attending, bullets) {
  if (!sessionId || !traineeName) return {success: false, message: 'חסרים נתונים'};
  try {
    var ss = SpreadsheetApp.openById(RESPONSE_SHEET_ID);
    var sheet = null;
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getName() === POLL_SHEET_NAME) { sheet = sheets[i]; break; }
    }
    if (!sheet || sheet.getLastRow() < 2) return {success: false, message: 'אין תשובות'};
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    var nameOnly = traineeName.indexOf(' - ') > -1 ? traineeName.split(' - ')[0].trim() : traineeName.trim();
    for (var i = 0; i < data.length; i++) {
      var sid = String(data[i][5] || '').trim();
      if (sid !== sessionId) continue;
      var existing = String(data[i][1] || '');
      var existingName = existing.indexOf(' - ') > -1 ? existing.split(' - ')[0].trim() : existing.trim();
      if (existingName === nameOnly) {
        var row = i + 2;
        sheet.getRange(row, 1).setValue(new Date());
        sheet.getRange(row, 3).setValue(attending ? '\u05DB\u05DF' : '\u05DC\u05D0');
        sheet.getRange(row, 4).setValue(String(bullets || ''));
        return {success: true};
      }
    }
    return {success: false, message: 'תשובה לא נמצאה'};
  } catch(err) {
    Logger.log('updateSessionResponse error: ' + err.message);
    return {success: false, message: 'שגיאה בעדכון'};
  }
}

function getSessionResponseCount(sessionId) {
  try {
    var ss = SpreadsheetApp.openById(RESPONSE_SHEET_ID);
    var sheet = null;
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getName() === POLL_SHEET_NAME) { sheet = sheets[i]; break; }
    }
    if (!sheet || sheet.getLastRow() < 2) return 0;

    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    var count = 0;
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][5] || '').trim() === sessionId) {
        count++;
      }
    }
    return count;
  } catch(err) {
    return 0;
  }
}

// =====================================================
// Trainee data functions — unchanged from original
// =====================================================
function getTraineeData(token) {
  requireAuth(token, ['admin']);
  return _getTraineeData();
}

function _getTraineeData() {
  var ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return {};

  var headers = data[0];
  function findCol(keyword) {
    for (var c = 0; c < headers.length; c++) {
      if (String(headers[c]).indexOf(keyword) > -1) return c;
    }
    return -1;
  }

  var nameCol = findCol('שם מלא');
  var tzCol = findCol('ת.ז');
  var phoneCol = findCol('טלפון');
  if (nameCol === -1) return {};

  var toolCols = [];
  for (var t = 1; t <= MAX_TOOLS; t++) {
    var suffix = 'כלי ' + t;
    var licCol = -1, expCol = -1, typeCol = -1, numCol = -1, calCol = -1;
    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c]);
      if (h.indexOf(suffix) > -1) {
        if (h.indexOf('רישיון') > -1) licCol = c;
        else if (h.indexOf('תוקף') > -1) expCol = c;
        else if (h.indexOf('סוג כלי') > -1) typeCol = c;
        else if (h.indexOf('מספר כלי') > -1) numCol = c;
        else if (h.indexOf('קוטר') > -1) calCol = c;
      }
    }
    if (licCol > -1) {
      toolCols.push({license: licCol, expiry: expCol, weaponType: typeCol, weaponNum: numCol, caliber: calCol});
    }
  }

  var trainees = {};
  for (var i = 1; i < data.length; i++) {
    var name = String(data[i][nameCol] || '').trim();
    if (!name) continue;

    var tz = tzCol > -1 ? normalizeId(data[i][tzCol]) : '';
    var phone = phoneCol > -1 ? normalizePhone(data[i][phoneCol]) : '';

    var tools = [];
    for (var t = 0; t < toolCols.length; t++) {
      var tc = toolCols[t];
      var license = tc.license > -1 ? normalizeId(data[i][tc.license]) : '';
      if (!license) continue;

      var expiryVal = tc.expiry > -1 ? data[i][tc.expiry] : '';
      var expiry = '';
      if (expiryVal instanceof Date) {
        expiry = Utilities.formatDate(expiryVal, 'Asia/Jerusalem', 'dd/MM/yyyy');
      } else if (expiryVal) {
        expiry = String(expiryVal).trim();
      }

      tools.push({
        license: license,
        expiry: expiry,
        weaponType: tc.weaponType > -1 ? String(data[i][tc.weaponType] || '').trim() : '',
        weaponNum: tc.weaponNum > -1 ? String(data[i][tc.weaponNum] || '').trim() : '',
        caliber: tc.caliber > -1 ? String(data[i][tc.caliber] || '').trim() : ''
      });
    }

    if (tools.length === 0) continue;

    trainees[name] = {
      num: i,
      name: name,
      tz: tz,
      phone: phone,
      tools: tools
    };
  }
  return trainees;
}

function getInstructorData(tokenOrTz, maybeTz) {
  // Soft gate (v6.1.1): if two params, first is token; if one param, it's TZ (backward compatible)
  var tz;
  if (maybeTz !== undefined && maybeTz !== null && maybeTz !== '') {
    // Two params: token + tz — validate if token provided
    if (tokenOrTz) {
      try { requireAuth(tokenOrTz, ['instructor', 'admin']); } catch(e) { /* soft gate: allow without during transition */ }
    }
    tz = maybeTz;
  } else {
    tz = tokenOrTz;
  }
  var tzKey = normalizeId(tz || INSTRUCTOR_TZ);
  var fallback = {name: '', tz: tzKey, license: '', phone: '', email: '', admin: false};
  try {
    var ss = SpreadsheetApp.openById(INSTRUCTOR_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) return fallback;
    var cols = Math.max(sheet.getLastColumn(), 6);
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
    for (var i = 0; i < data.length; i++) {
      if (normalizeId(data[i][0]) === tzKey) {
        return {
          tz: normalizeId(data[i][0]),
          name: String(data[i][1] || '').trim(),
          license: String(data[i][2] || '').trim(),
          phone: normalizePhone(data[i][3]),
          email: String(data[i][4] || '').trim(),
          admin: String(data[i][5] || '').trim() === 'כן'
        };
      }
    }
    return fallback;
  } catch(err) {
    Logger.log('getInstructorData error: ' + err.message);
    return fallback;
  }
}

function getAllInstructors(token) {
  // Soft gate (v6.1.1): enforce if token provided, allow without during transition
  if (token) requireAuth(token, ['instructor', 'admin']);
  try {
    var ss = SpreadsheetApp.openById(INSTRUCTOR_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) return [];
    var cols = Math.max(sheet.getLastColumn(), 6);
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
    var list = [];
    for (var i = 0; i < data.length; i++) {
      var tz = normalizeId(data[i][0]);
      var name = String(data[i][1] || '').trim();
      if (tz && name) {
        list.push({tz: tz, name: name, license: String(data[i][2] || '').trim(), phone: normalizePhone(data[i][3]), email: String(data[i][4] || '').trim(), admin: String(data[i][5] || '').trim() === 'כן'});
      }
    }
    return list;
  } catch(err) {
    Logger.log('getAllInstructors error: ' + err.message);
    return [];
  }
}

function isOwnerEmail(email) {
  if (!email) return false;
  var e = String(email).trim().toLowerCase();
  for (var i = 0; i < OWNER_EMAILS.length; i++) {
    if (String(OWNER_EMAILS[i]).trim().toLowerCase() === e) return true;
  }
  return false;
}

function isOwnerByTz(tz) {
  if (!tz) return false;
  var inst = getInstructorData(normalizeId(tz));
  return isOwnerEmail(inst.email);
}

function isAdminByEmail(email) {
  if (!email) return false;
  var e = String(email).trim().toLowerCase();
  try {
    var ss = SpreadsheetApp.openById(INSTRUCTOR_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) return false;
    var cols = Math.max(sheet.getLastColumn(), 6);
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][4] || '').trim().toLowerCase() === e && String(data[i][5] || '').trim() === 'כן') return true;
    }
  } catch(err) { Logger.log('isAdminByEmail error: ' + err.message); }
  return false;
}

function isAdminByTz(tz) {
  if (!tz) return false;
  tz = normalizeId(tz);
  try {
    var ss = SpreadsheetApp.openById(INSTRUCTOR_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) return false;
    var cols = Math.max(sheet.getLastColumn(), 6);
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
    for (var i = 0; i < data.length; i++) {
      if (normalizeId(data[i][0]) === tz && String(data[i][5] || '').trim() === 'כן') return true;
    }
  } catch(err) { Logger.log('isAdminByTz error: ' + err.message); }
  return false;
}

function isAuthorizedEmail(email) {
  if (!email) return false;
  var e = String(email).trim().toLowerCase();
  if (isOwnerEmail(e)) return true;
  if (isAdminByEmail(e)) return true;
  try {
    var ss = SpreadsheetApp.openById(INSTRUCTOR_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) return false;
    var data = sheet.getRange(2, 5, sheet.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0] || '').trim().toLowerCase() === e) return true;
    }
  } catch(err) {
    Logger.log('isAuthorizedEmail error: ' + err.message);
  }
  return false;
}

function isSessionAuthorized(email, sessionId) {
  if (!email || !sessionId) return false;
  if (isOwnerEmail(email)) return true;
  if (isAdminByEmail(email)) return true;
  try {
    var e = String(email).trim().toLowerCase();
    var instrSs = SpreadsheetApp.openById(INSTRUCTOR_SHEET_ID);
    var instrSheet = instrSs.getSheets()[0];
    if (!instrSheet || instrSheet.getLastRow() < 2) return false;
    var instrData = instrSheet.getRange(2, 1, instrSheet.getLastRow() - 1, 5).getValues();
    var emailToTz = {};
    for (var j = 0; j < instrData.length; j++) {
      var em = String(instrData[j][4] || '').trim().toLowerCase();
      if (em) emailToTz[em] = normalizeId(instrData[j][0]);
    }
    var callerTz = emailToTz[e];
    if (!callerTz) return false;
    var ss = SpreadsheetApp.openById(SESSIONS_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) return false;
    var cols = Math.max(sheet.getLastColumn(), 9);
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === sessionId) {
        var mainTz = normalizeId(data[i][2]);
        var d1 = data[i].length > 7 ? normalizeId(data[i][7]) : '';
        var d2 = data[i].length > 8 ? normalizeId(data[i][8]) : '';
        return callerTz === mainTz || callerTz === d1 || callerTz === d2;
      }
    }
  } catch(err) {
    Logger.log('isSessionAuthorized error: ' + err.message);
  }
  return false;
}

// =====================================================
// Instructor auth helpers
// =====================================================

function checkInstructorAuth(tz) {
  if (!tz) return {authenticated: false};
  tz = normalizeId(tz);
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch(e) {}
  if (!email) return {authenticated: false, needsOtp: true};
  // Google session available — check if it matches this instructor or owner
  if (isOwnerEmail(email)) return {authenticated: true};
  var inst = getInstructorData(tz);
  if (inst.email && String(inst.email).trim().toLowerCase() === email) return {authenticated: true};
  return {authenticated: false, needsOtp: false, message: 'החשבון המחובר אינו תואם למדריך זה'};
}

function requestInstructorOTP(tz) {
  if (!tz) return {success: false, message: 'יש להזין ת.ז.'};
  tz = normalizeId(tz);
  var cache = CacheService.getScriptCache();
  var blockKey = 'otp-block-inst-' + tz;
  if (cache.get(blockKey)) {
    return {success: false, message: 'יותר מדי ניסיונות. נסה שוב בעוד 15 דקות'};
  }
  var inst = getInstructorData(tz);
  if (!inst.name) return {success: false, message: 'מדריך לא נמצא'};
  if (!inst.email) return {success: false, message: 'לא נמצא אימייל למדריך זה. פנה למנהל המערכת'};
  var code = generateOTP();
  var cacheData = JSON.stringify({code: code, attempts: 0});
  cache.put('otp-inst-' + tz, cacheData, OTP_TTL_SECONDS);
  try {
    MailApp.sendEmail(inst.email, 'קוד אימות - מערכת אימוני ירי', '', {
      name: OTP_FROM_NAME,
      htmlBody: '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px">'
        + '<h2 style="color:#1e293b;text-align:center">קוד אימות — מדריך</h2>'
        + '<p style="color:#475569;text-align:center;font-size:16px">הקוד שלך למערכת אימוני ירי:</p>'
        + '<div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:20px 0">'
        + '<span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1e293b">' + code + '</span></div>'
        + '<p style="color:#94a3b8;text-align:center;font-size:13px">הקוד תקף ל-5 דקות. אם לא ביקשת קוד זה, התעלם מהודעה זו.</p></div>'
    });
  } catch(err) {
    Logger.log('requestInstructorOTP error: ' + err.message);
    return {success: false, message: 'שגיאה בשליחת אימייל: ' + err.message};
  }
  return {success: true, maskedEmail: maskEmail(inst.email)};
}

function verifyInstructorOTP(tz, code) {
  if (!tz || !code) return {success: false, message: 'יש להזין ת.ז. וקוד אימות'};
  tz = normalizeId(tz);
  code = String(code).trim();
  var cache = CacheService.getScriptCache();
  var blockKey = 'otp-block-inst-' + tz;
  if (cache.get(blockKey)) {
    return {success: false, message: 'יותר מדי ניסיונות. נסה שוב בעוד 15 דקות'};
  }
  var raw = cache.get('otp-inst-' + tz);
  if (!raw) return {success: false, message: 'קוד פג תוקף. בקש קוד חדש'};
  var otpData = JSON.parse(raw);
  if (otpData.code !== code) {
    otpData.attempts = (otpData.attempts || 0) + 1;
    if (otpData.attempts >= OTP_MAX_ATTEMPTS) {
      cache.remove('otp-inst-' + tz);
      cache.put(blockKey, 'blocked', OTP_BLOCK_SECONDS);
      return {success: false, message: 'יותר מדי ניסיונות שגויים. נסה שוב בעוד 15 דקות'};
    }
    cache.put('otp-inst-' + tz, JSON.stringify(otpData), OTP_TTL_SECONDS);
    return {success: false, message: 'קוד שגוי. נותרו ' + (OTP_MAX_ATTEMPTS - otpData.attempts) + ' ניסיונות'};
  }
  cache.remove('otp-inst-' + tz);
  // Issue a short-lived print token (60 seconds) for OTP-verified print access
  var token = Utilities.getUuid();
  cache.put('print-token-' + token, tz, 60);
  return {success: true, printToken: token};
}

function isSessionAuthorizedByTz(tz, sessionId) {
  if (!tz || !sessionId) return false;
  tz = normalizeId(tz);
  // Admin can access any session
  if (isAdminByTz(tz)) return true;
  try {
    var ss = SpreadsheetApp.openById(SESSIONS_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) return false;
    var cols = Math.max(sheet.getLastColumn(), 9);
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === sessionId) {
        var mainTz = normalizeId(data[i][2]);
        var d1 = data[i].length > 7 ? normalizeId(data[i][7]) : '';
        var d2 = data[i].length > 8 ? normalizeId(data[i][8]) : '';
        return tz === mainTz || tz === d1 || tz === d2;
      }
    }
  } catch(err) {
    Logger.log('isSessionAuthorizedByTz error: ' + err.message);
  }
  return false;
}

function issuePrintToken(tz, sessionId) {
  if (!tz || !sessionId) return {success: false};
  tz = normalizeId(tz);
  if (!isSessionAuthorizedByTz(tz, sessionId)) return {success: false};
  var cache = CacheService.getScriptCache();
  var token = Utilities.getUuid();
  cache.put('print-token-' + token, tz, 60);
  return {success: true, token: token};
}

// =====================================================
// OTP functions — email-based one-time password (trainees)
// =====================================================
function maskEmail(email) {
  if (!email) return '';
  var parts = email.split('@');
  if (parts.length !== 2) return '***';
  var local = parts[0];
  if (local.length <= 2) return local[0] + '***@' + parts[1];
  return local[0] + '***' + local[local.length - 1] + '@' + parts[1];
}

function generateOTP() {
  var code = '';
  for (var i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

function requestOTP(tz) {
  if (!tz) return {success: false, message: 'יש להזין ת.ז.'};
  tz = normalizeId(tz);
  var cache = CacheService.getScriptCache();

  // Check if blocked
  var blockKey = 'otp-block-' + tz;
  if (cache.get(blockKey)) {
    return {success: false, message: 'יותר מדי ניסיונות. נסה שוב בעוד 15 דקות'};
  }

  // Look up trainee email
  var ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return {success: false, message: 'מתאמן לא נמצא'};
  var headers = data[0];
  var tzCol = -1;
  var emailCol = -1;
  for (var c = 0; c < headers.length; c++) {
    if (String(headers[c]).indexOf('ת.ז') > -1) tzCol = c;
    if (String(headers[c]).indexOf('אימייל') > -1) emailCol = c;
  }
  if (tzCol === -1 || emailCol === -1) return {success: false, message: 'שגיאת מערכת'};

  var email = '';
  for (var i = 1; i < data.length; i++) {
    if (normalizeId(data[i][tzCol]) === tz) {
      email = String(data[i][emailCol] || '').trim();
      break;
    }
  }
  if (!email) return {success: false, message: 'לא נמצא אימייל לת.ז. זו'};

  var code = generateOTP();
  var cacheData = JSON.stringify({code: code, attempts: 0});
  cache.put('otp-' + tz, cacheData, OTP_TTL_SECONDS);

  try {
    MailApp.sendEmail(email, 'קוד אימות - מערכת אימוני ירי', '', {
      name: OTP_FROM_NAME,
      htmlBody: '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px">'
        + '<h2 style="color:#1e293b;text-align:center">קוד אימות</h2>'
        + '<p style="color:#475569;text-align:center;font-size:16px">הקוד שלך למערכת אימוני ירי:</p>'
        + '<div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:20px 0">'
        + '<span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1e293b">' + code + '</span></div>'
        + '<p style="color:#94a3b8;text-align:center;font-size:13px">הקוד תקף ל-5 דקות. אם לא ביקשת קוד זה, התעלם מהודעה זו.</p></div>'
    });
  } catch(err) {
    Logger.log('sendOTP error: ' + err.message);
    return {success: false, message: 'שגיאה בשליחת אימייל'};
  }

  return {success: true, maskedEmail: maskEmail(email)};
}

function requestOTPForEmail(tz, email) {
  if (!tz || !email) return {success: false, message: 'יש להזין ת.ז. ואימייל'};
  tz = normalizeId(tz);
  email = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {success: false, message: 'כתובת אימייל לא תקינה'};

  var cache = CacheService.getScriptCache();
  var blockKey = 'otp-block-' + tz;
  if (cache.get(blockKey)) {
    return {success: false, message: 'יותר מדי ניסיונות. נסה שוב בעוד 15 דקות'};
  }

  var code = generateOTP();
  var cacheData = JSON.stringify({code: code, attempts: 0, email: email});
  cache.put('otp-' + tz, cacheData, OTP_TTL_SECONDS);

  try {
    MailApp.sendEmail(email, 'קוד אימות - מערכת אימוני ירי', '', {
      name: OTP_FROM_NAME,
      htmlBody: '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px">'
        + '<h2 style="color:#1e293b;text-align:center">קוד אימות</h2>'
        + '<p style="color:#475569;text-align:center;font-size:16px">הקוד שלך למערכת אימוני ירי:</p>'
        + '<div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:20px 0">'
        + '<span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1e293b">' + code + '</span></div>'
        + '<p style="color:#94a3b8;text-align:center;font-size:13px">הקוד תקף ל-5 דקות. אם לא ביקשת קוד זה, התעלם מהודעה זו.</p></div>'
    });
  } catch(err) {
    Logger.log('sendOTPForEmail error: ' + err.message);
    return {success: false, message: 'שגיאה בשליחת אימייל'};
  }

  return {success: true, maskedEmail: maskEmail(email)};
}

function verifyOTP(tz, code) {
  if (!tz || !code) return {success: false, message: 'יש להזין ת.ז. וקוד אימות'};
  tz = normalizeId(tz);
  code = String(code).trim();

  var cache = CacheService.getScriptCache();
  var blockKey = 'otp-block-' + tz;
  if (cache.get(blockKey)) {
    return {success: false, message: 'יותר מדי ניסיונות. נסה שוב בעוד 15 דקות'};
  }

  var raw = cache.get('otp-' + tz);
  if (!raw) return {success: false, message: 'קוד פג תוקף. בקש קוד חדש'};

  var otpData = JSON.parse(raw);

  if (otpData.code !== code) {
    otpData.attempts = (otpData.attempts || 0) + 1;
    if (otpData.attempts >= OTP_MAX_ATTEMPTS) {
      cache.remove('otp-' + tz);
      cache.put(blockKey, 'blocked', OTP_BLOCK_SECONDS);
      return {success: false, message: 'יותר מדי ניסיונות שגויים. נסה שוב בעוד 15 דקות'};
    }
    cache.put('otp-' + tz, JSON.stringify(otpData), OTP_TTL_SECONDS);
    return {success: false, message: 'קוד שגוי. נותרו ' + (OTP_MAX_ATTEMPTS - otpData.attempts) + ' ניסיונות'};
  }

  // OTP verified — clean up
  cache.remove('otp-' + tz);

  // If this was for a new email (needsEmail flow), store it in source sheet
  if (otpData.email) {
    try {
      var ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
      var sheet = ss.getSheets()[0];
      var data = sheet.getDataRange().getValues();
      var headers = data[0];
      var tzCol = -1;
      var emailCol = -1;
      for (var c = 0; c < headers.length; c++) {
        if (String(headers[c]).indexOf('ת.ז') > -1) tzCol = c;
        if (String(headers[c]).indexOf('אימייל') > -1) emailCol = c;
      }
      if (tzCol > -1 && emailCol > -1) {
        for (var i = 1; i < data.length; i++) {
          if (normalizeId(data[i][tzCol]) === tz) {
            sheet.getRange(i + 1, emailCol + 1).setValue(otpData.email);
            break;
          }
        }
      }
    } catch(err) {
      Logger.log('verifyOTP email save error: ' + err.message);
    }
  }

  // Return full trainee data (same as authenticated lookupByTZ)
  var result = _getVerifiedTraineeData(tz);
  result.otpVerified = true;
  return result;
}

function getVerifiedTraineeData(tokenOrEditToken, tz) {
  // v6.1.1: dual-token — accept session token OR admin-edit token
  var cache = CacheService.getScriptCache();
  var editTz = cache.get('edit-token-' + tokenOrEditToken);
  if (editTz) {
    cache.remove('edit-token-' + tokenOrEditToken); // one-time use
    // Valid admin edit token — proceed
  } else {
    // Must be a session token
    requireAuth(tokenOrEditToken, ['admin']);
  }
  return _getVerifiedTraineeData(tz);
}

function _getVerifiedTraineeData(tz) {
  tz = normalizeId(tz);
  var ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return {success: false, found: false};
  var headers = data[0];
  function findCol(keyword) {
    for (var c = 0; c < headers.length; c++) {
      if (String(headers[c]).indexOf(keyword) > -1) return c;
    }
    return -1;
  }
  var nameCol = findCol('שם מלא');
  var tzCol = findCol('ת.ז');
  var phoneCol = findCol('טלפון');
  if (tzCol === -1) return {success: false, found: false};
  var rowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (normalizeId(data[i][tzCol]) === tz) { rowIdx = i; break; }
  }
  if (rowIdx === -1) return {success: false, found: false};
  var trainees = _getTraineeData();
  var name = nameCol > -1 ? String(data[rowIdx][nameCol] || '').trim() : '';
  var trainee = trainees[name];
  if (!trainee) {
    return {success: true, found: true, name: name, tz: tz, phone: phoneCol > -1 ? normalizePhone(data[rowIdx][phoneCol]) : '', tools: []};
  }
  return {success: true, found: true, name: trainee.name, tz: trainee.tz, phone: trainee.phone, tools: trainee.tools};
}

function lookupByTZ(tz) {
  if (!tz || !String(tz).trim()) return {found: false, message: 'יש להזין ת.ז.'};
  tz = normalizeId(tz);

  var ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return {found: false, message: 'לא נמצא רישום עבור ת.ז. ' + tz};

  var headers = data[0];
  function findCol(keyword) {
    for (var c = 0; c < headers.length; c++) {
      if (String(headers[c]).indexOf(keyword) > -1) return c;
    }
    return -1;
  }

  var nameCol = findCol('שם מלא');
  var tzCol = findCol('ת.ז');
  var phoneCol = findCol('טלפון');
  var emailCol = findCol('אימייל');
  if (tzCol === -1) return {found: false, message: 'לא נמצאה עמודת ת.ז.'};

  var rowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (normalizeId(data[i][tzCol]) === tz) {
      rowIdx = i;
      break;
    }
  }

  if (rowIdx === -1) return {found: false, message: 'לא נמצא רישום עבור ת.ז. ' + tz};

  // Trainee status check (v5.0.0)
  var statusCol = findCol('סטטוס');
  var reasonCol = findCol('סיבת השעיה');
  var traineeStatus = statusCol > -1 ? String(data[rowIdx][statusCol] || '').trim() : 'פעיל';
  if (traineeStatus === 'לא פעיל') {
    return {found: false, message: 'חשבון לא פעיל. פנה למנהל המערכת.'};
  }

  // Security: hybrid auth — Google session or OTP
  var storedEmail = emailCol > -1 ? String(data[rowIdx][emailCol] || '').trim().toLowerCase() : '';
  var sessionEmail = '';
  try { sessionEmail = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch(e) {}

  if (REQUIRE_LOGIN && storedEmail) {
    if (sessionEmail) {
      // Google user — verify email matches
      if (sessionEmail !== storedEmail) {
        return {found: false, message: 'ת.ז. זו משויכת לחשבון אחר'};
      }
    } else {
      // No Google session — check simplified auth before requiring OTP
      var daCol = findCol('דא');
      var daFlag = daCol > -1 ? String(data[rowIdx][daCol] || '').trim() : '';
      var isGmail = storedEmail.indexOf('@gmail.com') > -1;
      if (daFlag === 'כן' && !isGmail) {
        // Simplified auth — skip OTP for flagged non-Gmail trainees
      } else {
        // Standard flow — need OTP verification
        var name = nameCol > -1 ? String(data[rowIdx][nameCol] || '').trim() : '';
        return {found: true, needsOTP: true, maskedEmail: maskEmail(storedEmail), name: name};
      }
    }
  }

  if (REQUIRE_LOGIN && !storedEmail && !sessionEmail) {
    // Existing trainee with no stored email AND no Google session — need email collection
    var name = nameCol > -1 ? String(data[rowIdx][nameCol] || '').trim() : '';
    return {found: true, needsEmail: true, name: name};
  }

  var trainees = _getTraineeData();
  var name = nameCol > -1 ? String(data[rowIdx][nameCol] || '').trim() : '';
  var trainee = trainees[name];
  var suspensionReason = (traineeStatus === 'מושעה' && reasonCol > -1) ? String(data[rowIdx][reasonCol] || '').trim() : '';

  if (!trainee) {
    var result = {
      found: true,
      name: name,
      tz: tz,
      phone: phoneCol > -1 ? normalizePhone(data[rowIdx][phoneCol]) : '',
      tools: []
    };
    if (traineeStatus === 'מושעה') { result.suspended = true; result.suspensionReason = suspensionReason; }
    return result;
  }

  var result = {
    found: true,
    name: trainee.name,
    tz: trainee.tz,
    phone: trainee.phone,
    tools: trainee.tools
  };
  if (traineeStatus === 'מושעה') { result.suspended = true; result.suspensionReason = suspensionReason; }
  return result;
}

// =====================================================
// Normalize functions
// =====================================================
function normalizeId(val) {
  var s = String(val || '').trim();
  if (s.match(/^\d+\.0+$/)) s = s.replace(/\.0+$/, '');
  s = s.replace(/^0+(\d)/, '$1');
  return s;
}

function normalizePhone(val) {
  var s = String(val || '').trim();
  if (s.match(/^\d+\.0+$/)) s = s.replace(/\.0+$/, '');
  if (s.match(/^[1-9]\d{8}$/)) s = '0' + s;
  return s;
}

function parseDate(dateStr) {
  var parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  }
  return new Date(0);
}

// =====================================================
// Poll responses — modified to include sessionId
// =====================================================
function getExistingPollResponse(traineeName, sessionId) {
  if (!traineeName) return {found: false};
  var nameOnly = traineeName.indexOf(' - ') > -1 ? traineeName.split(' - ')[0].trim() : traineeName.trim();
  var ss = SpreadsheetApp.openById(RESPONSE_SHEET_ID);
  var sheet = null;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName() === POLL_SHEET_NAME) { sheet = sheets[i]; break; }
  }
  if (!sheet || sheet.getLastRow() < 2) return {found: false};
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  for (var i = 0; i < data.length; i++) {
    var existing = String(data[i][1] || '');
    var existingName = existing.indexOf(' - ') > -1 ? existing.split(' - ')[0].trim() : existing.trim();
    var existingSessionId = String(data[i][5] || '').trim();
    if (existingName === nameOnly && existingSessionId === sessionId) {
      var existingLicense = existing.indexOf(' - ') > -1 ? existing.split(' - ')[1].trim() : '';
      return {
        found: true,
        attending: String(data[i][2] || '').indexOf('כן') > -1,
        bullets: String(data[i][3] || ''),
        notes: String(data[i][4] || ''),
        license: existingLicense
      };
    }
  }
  return {found: false};
}

function submitPollResponse(responseData) {
  if (!responseData || !responseData.trainee) {
    return {success: false, message: 'חסר בחירת מתאמן'};
  }
  // Trainee status check (v5.0.0) — block suspended/inactive trainees
  if (responseData.traineeTz) {
    var statusData = getTraineeStatusData(responseData.traineeTz);
    if (statusData.status === 'לא פעיל') return {success: false, message: 'חשבון לא פעיל. לא ניתן לדווח נוכחות.'};
    if (statusData.status === 'מושעה') return {success: false, message: 'החשבון מושעה: ' + (statusData.reason || '') + '. לא ניתן לדווח נוכחות.'};
  }
  var ss = SpreadsheetApp.openById(RESPONSE_SHEET_ID);
  var sheet = null;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName() === POLL_SHEET_NAME) { sheet = sheets[i]; break; }
  }
  if (!sheet) {
    sheet = ss.insertSheet(POLL_SHEET_NAME);
    sheet.appendRow(['Timestamp', 'שם - רישיון', 'מגיע?', 'כמות כדורים', 'הערות', 'מזהה אימון']);
  }

  var timestamp = new Date();
  var attending = responseData.attending ? 'כן' : 'לא';
  var traineeName = responseData.trainee;
  var nameOnly = traineeName.indexOf(' - ') > -1 ? traineeName.split(' - ')[0].trim() : traineeName.trim();
  var sessionId = responseData.sessionId || '';

  // Check if exists for this session
  var existingRow = -1;
  if (sheet.getLastRow() > 1) {
    var data = sheet.getRange(2, 2, sheet.getLastRow() - 1, 5).getValues();
    for (var i = 0; i < data.length; i++) {
      var existing = String(data[i][0] || '');
      var existingName = existing.indexOf(' - ') > -1 ? existing.split(' - ')[0].trim() : existing.trim();
      var existingSessionId = String(data[i][4] || '').trim();
      if (existingName === nameOnly && existingSessionId === sessionId) {
        existingRow = i + 2;
        break;
      }
    }
  }

  if (existingRow > -1) {
    sheet.getRange(existingRow, 1, 1, 6).setValues([[timestamp, responseData.trainee, attending, responseData.bullets || '', responseData.notes || '', sessionId]]);
    backfillTraineeEmail(nameOnly);
    return {success: true, message: 'התשובה עודכנה בהצלחה'};
  }
  sheet.appendRow([timestamp, responseData.trainee, attending, responseData.bullets || '', responseData.notes || '', sessionId]);
  backfillTraineeEmail(nameOnly);
  return {success: true, message: 'התשובה נשמרה בהצלחה'};
}

function backfillTraineeEmail(traineeName) {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) return;
    var ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return;
    var headers = data[0];
    var nameCol = -1;
    var emailCol = -1;
    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c]);
      if (h.indexOf('שם מלא') > -1) nameCol = c;
      if (h.indexOf('אימייל') > -1) emailCol = c;
    }
    if (nameCol === -1 || emailCol === -1) return;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][nameCol] || '').trim() === traineeName) {
        var existing = String(data[i][emailCol] || '').trim();
        if (!existing) {
          sheet.getRange(i + 1, emailCol + 1).setValue(email);
        }
        return;
      }
    }
  } catch(err) {
    Logger.log('backfillTraineeEmail error: ' + err.message);
  }
}

// =====================================================
// Status endpoint — modified for sessionId
// =====================================================
function doGetStatus(sessionId) {
  var ss = SpreadsheetApp.openById(RESPONSE_SHEET_ID);
  var sheets = ss.getSheets();
  var pollSheet = null;
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName() === POLL_SHEET_NAME) { pollSheet = sheets[i]; break; }
  }
  if (!pollSheet || pollSheet.getLastRow() < 2) {
    return {success: true, total: 0, attending: 0};
  }
  var data = pollSheet.getRange(2, 1, pollSheet.getLastRow() - 1, 6).getValues();
  var total = 0;
  var yesCount = 0;
  for (var i = 0; i < data.length; i++) {
    var sid = String(data[i][5] || '').trim();
    if (sid === sessionId) {
      total++;
      if (String(data[i][2]).indexOf('כן') > -1) yesCount++;
    }
  }
  return {success: true, total: total, attending: yesCount};
}
function validateTraineeData(data) {
  if (!data.name || !String(data.name).trim()) return 'שם מלא הוא שדה חובה';
  if (!data.tz || !String(data.tz).trim()) return 'ת.ז. הוא שדה חובה';
  var tzClean = String(data.tz).trim().replace(/[^0-9]/g, '');
  if (!/^\d{8,9}$/.test(tzClean)) return 'ת.ז. חייב להכיל 8–9 ספרות בלבד';
  if (!data.phone || !String(data.phone).trim()) return 'טלפון הוא שדה חובה';
  var phoneClean = String(data.phone).trim().replace(/[^0-9]/g, '');
  if (!/^0\d{9}$/.test(phoneClean)) return 'טלפון חייב להכיל 10 ספרות, מתחיל ב-0';
  var tools = data.tools || [];
  for (var t = 0; t < tools.length && t < MAX_TOOLS; t++) {
    var tool = tools[t];
    var fields = [
      String(tool.license || '').trim(),
      String(tool.expiry || '').trim(),
      String(tool.weaponType || '').trim(),
      String(tool.weaponNum || '').trim(),
      String(tool.caliber || '').trim()
    ];
    var filled = 0;
    for (var f = 0; f < fields.length; f++) { if (fields[f]) filled++; }
    if (filled > 0 && filled < 5) return 'כלי ' + (t + 1) + ': יש למלא את כל השדות או לנקות הכל';
    var lic = String(tool.license || '').trim();
    if (lic && !/^\d+$/.test(lic)) return 'כלי ' + (t + 1) + ': מס׳ רישיון חייב להכיל ספרות בלבד';
  }
  if (!tools.length || !String((tools[0] || {}).license || '').trim()) return 'כלי 1 הוא שדה חובה';
  return null;
}

function addTraineeData(newData) {
  if (!newData) return {success: false, message: 'חסרים נתונים'};
  var validationError = validateTraineeData(newData);
  if (validationError) return {success: false, message: validationError};
  var tz = normalizeId(newData.tz);

  var ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  function findCol(keyword) {
    for (var c = 0; c < headers.length; c++) {
      if (String(headers[c]).indexOf(keyword) > -1) return c;
    }
    return -1;
  }

  var tzCol = findCol('ת.ז');
  if (tzCol > -1) {
    for (var i = 1; i < data.length; i++) {
      if (normalizeId(data[i][tzCol]) === tz) {
        return {success: false, message: 'ת.ז. כבר קיימת במערכת'};
      }
    }
  }

  var newRow = new Array(headers.length).fill('');
  var nameCol = findCol('שם מלא');
  var phoneCol = findCol('טלפון');
  var emailCol = findCol('אימייל');

  newRow[0] = new Date();
  if (nameCol > -1) newRow[nameCol] = newData.name;
  if (tzCol > -1) newRow[tzCol] = tz;
  if (phoneCol > -1) newRow[phoneCol] = newData.phone || '';
  if (emailCol > -1) {
    try { newRow[emailCol] = Session.getActiveUser().getEmail() || ''; } catch(e) { newRow[emailCol] = ''; }
  }

  var tools = newData.tools || [];
  for (var t = 0; t < tools.length && t < MAX_TOOLS; t++) {
    if (!tools[t].license) continue;
    var suffix = 'כלי ' + (t + 1);
    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c]);
      if (h.indexOf(suffix) > -1) {
        if (h.indexOf('רישיון') > -1) newRow[c] = tools[t].license;
        else if (h.indexOf('תוקף') > -1) {
          var parts = String(tools[t].expiry).split('/');
          if (parts.length === 3) newRow[c] = new Date(parseInt(parts[2],10), parseInt(parts[1],10)-1, parseInt(parts[0],10));
        }
        else if (h.indexOf('סוג כלי') > -1) newRow[c] = tools[t].weaponType;
        else if (h.indexOf('מספר כלי') > -1) newRow[c] = tools[t].weaponNum;
        else if (h.indexOf('קוטר') > -1) newRow[c] = tools[t].caliber;
      }
    }
  }

  if (tzCol > -1) newRow[tzCol] = String(newData.tz || '');
  if (phoneCol > -1) newRow[phoneCol] = String(newData.phone || '');
  // Default status for new trainees (v5.0.0)
  var statusCol = findCol('סטטוס');
  if (statusCol > -1) newRow[statusCol] = 'פעיל';
  var newRowIdx = sheet.getLastRow() + 1;
  sheet.getRange(newRowIdx, 1, 1, newRow.length).setValues([newRow]);
  return {success: true, message: 'הרישום נוסף בהצלחה'};
}

function updateTraineeData(updatedData) {
  if (!updatedData) return {success: false, message: 'חסרים נתונים'};
  var validationError = validateTraineeData(updatedData);
  if (validationError) return {success: false, message: validationError};
  var tz = normalizeId(updatedData.tz);

  var ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
  var sheet = ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return {success: false, message: 'אין נתונים בגיליון'};

  var headers = data[0];
  function findCol(keyword) {
    for (var c = 0; c < headers.length; c++) {
      if (String(headers[c]).indexOf(keyword) > -1) return c;
    }
    return -1;
  }

  var tzCol = findCol('ת.ז');
  if (tzCol === -1) return {success: false, message: 'לא נמצאה עמודת ת.ז.'};

  var rowIdx = -1;
  for (var i = 1; i < data.length; i++) {
    if (normalizeId(data[i][tzCol]) === tz) {
      rowIdx = i;
      break;
    }
  }
  if (rowIdx === -1) return {success: false, message: 'ת.ז. לא נמצאה'};

  // Start from existing row data to preserve columns not managed by this function (status, suspension reason, date)
  var newRow = [];
  for (var c = 0; c < headers.length; c++) { newRow[c] = data[rowIdx][c]; }
  var nameCol = findCol('שם מלא');
  var phoneCol = findCol('טלפון');
  var emailCol = findCol('אימייל');

  newRow[0] = new Date();
  if (nameCol > -1) newRow[nameCol] = updatedData.name;
  if (tzCol > -1) newRow[tzCol] = tz;
  if (phoneCol > -1) newRow[phoneCol] = updatedData.phone || '';
  if (emailCol > -1) {
    try { newRow[emailCol] = Session.getActiveUser().getEmail() || ''; } catch(e) { newRow[emailCol] = ''; }
  }

  var tools = updatedData.tools || [];
  for (var t = 0; t < tools.length && t < MAX_TOOLS; t++) {
    if (!tools[t].license) continue;
    var suffix = 'כלי ' + (t + 1);
    for (var c = 0; c < headers.length; c++) {
      var h = String(headers[c]);
      if (h.indexOf(suffix) > -1) {
        if (h.indexOf('רישיון') > -1) newRow[c] = tools[t].license;
        else if (h.indexOf('תוקף') > -1) {
          var parts = String(tools[t].expiry).split('/');
          if (parts.length === 3) newRow[c] = new Date(parseInt(parts[2],10), parseInt(parts[1],10)-1, parseInt(parts[0],10));
        }
        else if (h.indexOf('סוג כלי') > -1) newRow[c] = tools[t].weaponType;
        else if (h.indexOf('מספר כלי') > -1) newRow[c] = tools[t].weaponNum;
        else if (h.indexOf('קוטר') > -1) newRow[c] = tools[t].caliber;
      }
    }
  }

  if (tzCol > -1) newRow[tzCol] = String(updatedData.tz || '');
  if (phoneCol > -1) newRow[phoneCol] = String(updatedData.phone || '');
  sheet.getRange(rowIdx + 1, 1, 1, newRow.length).setValues([newRow]);
  return {success: true, message: 'הרישום עודכן בהצלחה'};
}

// =====================================================
// v5.0.0 — Instructor management functions
// =====================================================

function addInstructor(token, instrData) {
  requireAuth(token, ['admin']);
  if (!instrData) return {success: false, message: 'חסרים נתונים'};
  var tz = normalizeId(instrData.tz);
  if (!tz || !instrData.name) return {success: false, message: 'ת.ז. ושם מלא הם שדות חובה'};
  try {
    var ss = SpreadsheetApp.openById(INSTRUCTOR_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (sheet.getLastRow() > 1) {
      var existing = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < existing.length; i++) {
        if (normalizeId(existing[i][0]) === tz) return {success: false, message: 'מדריך עם ת.ז. זו כבר קיים'};
      }
    }
    var adminVal = instrData.admin ? 'כן' : '';
    sheet.appendRow([tz, String(instrData.name).trim(), String(instrData.license || '').trim(), String(instrData.phone || '').trim(), String(instrData.email || '').trim(), adminVal]);
    return {success: true, message: 'מדריך נוסף בהצלחה'};
  } catch(err) {
    Logger.log('addInstructor error: ' + err.message);
    return {success: false, message: 'שגיאה בהוספת מדריך'};
  }
}

function updateInstructor(token, tz, instrData) {
  requireAuth(token, ['admin']);
  if (!tz || !instrData) return {success: false, message: 'חסרים נתונים'};
  tz = normalizeId(tz);
  try {
    var ss = SpreadsheetApp.openById(INSTRUCTOR_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) return {success: false, message: 'מדריך לא נמצא'};
    var cols = Math.max(sheet.getLastColumn(), 6);
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
    for (var i = 0; i < data.length; i++) {
      if (normalizeId(data[i][0]) === tz) {
        var row = i + 2;
        sheet.getRange(row, 1, 1, 6).setValues([[tz, String(instrData.name || data[i][1]).trim(), String(instrData.license || data[i][2]).trim(), String(instrData.phone || data[i][3]).trim(), String(instrData.email || data[i][4]).trim(), instrData.admin ? 'כן' : '']]);
        return {success: true, message: 'מדריך עודכן בהצלחה'};
      }
    }
    return {success: false, message: 'מדריך לא נמצא'};
  } catch(err) {
    Logger.log('updateInstructor error: ' + err.message);
    return {success: false, message: 'שגיאה בעדכון מדריך'};
  }
}

// =====================================================
// v5.0.0 — Trainee status management functions
// =====================================================

function getTraineeStatusData(tz) {
  if (!tz) return {status: 'פעיל', reason: '', date: ''};
  tz = normalizeId(tz);
  try {
    var ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return {status: 'פעיל', reason: '', date: ''};
    var headers = data[0];
    function findCol(keyword) {
      for (var c = 0; c < headers.length; c++) {
        if (String(headers[c]).indexOf(keyword) > -1) return c;
      }
      return -1;
    }
    var tzCol = findCol('ת.ז');
    var statusCol = findCol('סטטוס');
    var reasonCol = findCol('סיבת השעיה');
    var dateCol = findCol('תאריך עדכון סטטוס');
    if (tzCol === -1) return {status: 'פעיל', reason: '', date: ''};
    for (var i = 1; i < data.length; i++) {
      if (normalizeId(data[i][tzCol]) === tz) {
        var status = statusCol > -1 ? String(data[i][statusCol] || '').trim() : 'פעיל';
        var reason = reasonCol > -1 ? String(data[i][reasonCol] || '').trim() : '';
        var dateVal = dateCol > -1 ? data[i][dateCol] : '';
        var dateStr = '';
        if (dateVal instanceof Date) { dateStr = Utilities.formatDate(dateVal, 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm'); }
        else if (dateVal) { dateStr = String(dateVal).trim(); }
        return {status: status || 'פעיל', reason: reason, date: dateStr};
      }
    }
  } catch(err) { Logger.log('getTraineeStatusData error: ' + err.message); }
  return {status: 'פעיל', reason: '', date: ''};
}

function updateTraineeStatus(token, tz, status, reason) {
  requireAuth(token, ['admin']);
  if (!tz || !status) return {success: false, message: 'חסרים נתונים'};
  tz = normalizeId(tz);
  var validStatuses = ['פעיל', 'לא פעיל', 'מושעה'];
  if (validStatuses.indexOf(status) === -1) return {success: false, message: 'סטטוס לא חוקי'};
  try {
    var ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return {success: false, message: 'אין נתונים'};
    var headers = data[0];
    function findCol(keyword) {
      for (var c = 0; c < headers.length; c++) {
        if (String(headers[c]).indexOf(keyword) > -1) return c;
      }
      return -1;
    }
    var tzCol = findCol('ת.ז');
    var statusCol = findCol('סטטוס');
    var reasonCol = findCol('סיבת השעיה');
    var dateCol = findCol('תאריך עדכון סטטוס');
    if (tzCol === -1 || statusCol === -1) return {success: false, message: 'עמודות סטטוס לא נמצאו'};
    for (var i = 1; i < data.length; i++) {
      if (normalizeId(data[i][tzCol]) === tz) {
        var row = i + 1;
        sheet.getRange(row, statusCol + 1).setValue(status);
        if (reasonCol > -1) sheet.getRange(row, reasonCol + 1).setValue(status === 'מושעה' ? (reason || '') : '');
        if (dateCol > -1) sheet.getRange(row, dateCol + 1).setValue(new Date());
        return {success: true, message: 'סטטוס עודכן בהצלחה'};
      }
    }
    return {success: false, message: 'מתאמן לא נמצא'};
  } catch(err) {
    Logger.log('updateTraineeStatus error: ' + err.message);
    return {success: false, message: 'שגיאה בעדכון סטטוס'};
  }
}

function searchTrainees(token, query) {
  requireAuth(token, ['admin']);
  if (!query || !String(query).trim()) return [];
  var q = String(query).trim().toLowerCase();
  try {
    var ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    var headers = data[0];
    function findCol(keyword) {
      for (var c = 0; c < headers.length; c++) {
        if (String(headers[c]).indexOf(keyword) > -1) return c;
      }
      return -1;
    }
    var nameCol = findCol('שם מלא');
    var tzCol = findCol('ת.ז');
    var phoneCol = findCol('טלפון');
    var statusCol = findCol('סטטוס');
    var results = [];
    for (var i = 1; i < data.length; i++) {
      var name = nameCol > -1 ? String(data[i][nameCol] || '').trim() : '';
      var tz = tzCol > -1 ? normalizeId(data[i][tzCol]) : '';
      var phone = phoneCol > -1 ? normalizePhone(data[i][phoneCol]) : '';
      if (!name) continue;
      if (name.toLowerCase().indexOf(q) > -1 || tz.indexOf(q) > -1 || phone.indexOf(q) > -1) {
        var status = statusCol > -1 ? String(data[i][statusCol] || '').trim() : 'פעיל';
        results.push({name: name, tz: tz, phone: phone, status: status || 'פעיל'});
        if (results.length >= 20) break;
      }
    }
    return results;
  } catch(err) {
    Logger.log('searchTrainees error: ' + err.message);
    return [];
  }
}

function getSuspendedTrainees(token) {
  requireAuth(token, ['admin']);
  try {
    var ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    var headers = data[0];
    function findCol(keyword) {
      for (var c = 0; c < headers.length; c++) {
        if (String(headers[c]).indexOf(keyword) > -1) return c;
      }
      return -1;
    }
    var nameCol = findCol('שם מלא');
    var tzCol = findCol('ת.ז');
    var statusCol = findCol('סטטוס');
    var reasonCol = findCol('סיבת השעיה');
    if (tzCol === -1 || statusCol === -1) return [];
    var results = [];
    for (var i = 1; i < data.length; i++) {
      var status = String(data[i][statusCol] || '').trim();
      if (status !== 'מושעה') continue;
      var name = nameCol > -1 ? String(data[i][nameCol] || '').trim() : '';
      var tz = tzCol > -1 ? normalizeId(data[i][tzCol]) : '';
      var reason = reasonCol > -1 ? String(data[i][reasonCol] || '').trim() : '';
      if (name || tz) results.push({name: name, tz: tz, reason: reason});
    }
    return results;
  } catch(err) {
    Logger.log('getSuspendedTrainees error: ' + err.message);
    return [];
  }
}

// =====================================================
// v5.0.0 — Suspension reasons management
// =====================================================

function getSuspensionReasons(token) {
  requireAuth(token, ['admin']);
  try {
    if (!SUSPENSION_REASONS_SHEET_ID) return ['רישיון לא בתוקף', 'בעיית בטיחות', 'חוסר ציוד מתאים', 'סיבה אחרת'];
    var ss = SpreadsheetApp.openById(SUSPENSION_REASONS_SHEET_ID);
    var sheet = ss.getSheetByName(SUSPENSION_REASONS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return ['רישיון לא בתוקף', 'בעיית בטיחות', 'חוסר ציוד מתאים', 'סיבה אחרת'];
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    var reasons = [];
    for (var i = 0; i < data.length; i++) {
      var reason = String(data[i][0] || '').trim();
      var active = String(data[i][1] || '').trim();
      if (reason && active !== 'לא') reasons.push(reason);
    }
    return reasons.length > 0 ? reasons : ['רישיון לא בתוקף', 'בעיית בטיחות', 'חוסר ציוד מתאים', 'סיבה אחרת'];
  } catch(err) {
    Logger.log('getSuspensionReasons error: ' + err.message);
    return ['רישיון לא בתוקף', 'בעיית בטיחות', 'חוסר ציוד מתאים', 'סיבה אחרת'];
  }
}

function addSuspensionReason(token, reason) {
  requireAuth(token, ['admin']);
  if (!reason || !String(reason).trim()) return {success: false, message: 'חסרה סיבה'};
  try {
    if (!SUSPENSION_REASONS_SHEET_ID) return {success: false, message: 'גיליון סיבות השעיה לא מוגדר'};
    var ss = SpreadsheetApp.openById(SUSPENSION_REASONS_SHEET_ID);
    var sheet = ss.getSheetByName(SUSPENSION_REASONS_TAB);
    if (!sheet) {
      sheet = ss.insertSheet(SUSPENSION_REASONS_TAB);
      sheet.appendRow(['סיבה', 'פעיל']);
    }
    sheet.appendRow([String(reason).trim(), 'כן']);
    return {success: true, message: 'סיבה נוספה בהצלחה'};
  } catch(err) {
    Logger.log('addSuspensionReason error: ' + err.message);
    return {success: false, message: 'שגיאה בהוספת סיבה'};
  }
}

function getAllSuspensionReasons(token) {
  requireAuth(token, ['admin']);
  try {
    if (!SUSPENSION_REASONS_SHEET_ID) return [];
    var ss = SpreadsheetApp.openById(SUSPENSION_REASONS_SHEET_ID);
    var sheet = ss.getSheetByName(SUSPENSION_REASONS_TAB);
    if (!sheet || sheet.getLastRow() < 2) return [];
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    var reasons = [];
    for (var i = 0; i < data.length; i++) {
      var reason = String(data[i][0] || '').trim();
      var active = String(data[i][1] || '').trim();
      if (reason) reasons.push({reason: reason, active: active !== 'לא'});
    }
    return reasons;
  } catch(err) {
    Logger.log('getAllSuspensionReasons error: ' + err.message);
    return [];
  }
}

function toggleSuspensionReason(token, reason, active) {
  requireAuth(token, ['admin']);
  if (!reason) return {success: false, message: 'חסרה סיבה'};
  try {
    if (!SUSPENSION_REASONS_SHEET_ID) return {success: false, message: 'גיליון סיבות השעיה לא מוגדר'};
    var ss = SpreadsheetApp.openById(SUSPENSION_REASONS_SHEET_ID);
    var sheet = ss.getSheetByName(SUSPENSION_REASONS_TAB);
    if (!sheet) return {success: false, message: 'גיליון לא נמצא'};
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(reason).trim()) {
        sheet.getRange(i + 2, 2).setValue(active ? 'כן' : 'לא');
        return {success: true, message: active ? 'סיבה הופעלה' : 'סיבה הושבתה'};
      }
    }
    return {success: false, message: 'סיבה לא נמצאה'};
  } catch(err) {
    Logger.log('toggleSuspensionReason error: ' + err.message);
    return {success: false, message: 'שגיאה בעדכון סיבה'};
  }
}

// =====================================================
// v5.0.0 — Admin auth helpers (OTP-based, like instructor)
// =====================================================

function checkAdminAuth(tz) {
  if (!tz) return {authenticated: false};
  tz = normalizeId(tz);
  var inst = getInstructorData(tz);
  if (!inst.name) return {authenticated: false, message: 'מדריך לא נמצא'};
  if (!inst.admin) return {authenticated: false, message: 'אין הרשאת ניהול'};
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch(e) {}
  if (!email) return {authenticated: false, needsOtp: true};
  // Google session available — check if it matches this instructor or owner
  if (isOwnerEmail(email)) {
    var sessionToken = _createUserSession(tz, 'admin', inst.name);
    return {authenticated: true, sessionToken: sessionToken};
  }
  if (inst.email && String(inst.email).trim().toLowerCase() === email) {
    var sessionToken = _createUserSession(tz, 'admin', inst.name);
    return {authenticated: true, sessionToken: sessionToken};
  }
  return {authenticated: false, needsOtp: false, message: 'החשבון המחובר אינו תואם למדריך זה'};
}

function requestAdminOTP(tz) {
  if (!tz) return {success: false, message: 'יש להזין ת.ז.'};
  tz = normalizeId(tz);
  // Verify admin permission first
  var inst = getInstructorData(tz);
  if (!inst.name) return {success: false, message: 'מדריך לא נמצא'};
  if (!inst.admin) return {success: false, message: 'אין הרשאת ניהול'};
  if (!inst.email) return {success: false, message: 'לא נמצא אימייל למדריך זה. פנה למנהל המערכת'};
  var cache = CacheService.getScriptCache();
  var blockKey = 'otp-block-admin-' + tz;
  if (cache.get(blockKey)) return {success: false, message: 'יותר מדי ניסיונות. נסה שוב בעוד 15 דקות'};
  var code = generateOTP();
  var cacheData = JSON.stringify({code: code, attempts: 0});
  cache.put('otp-admin-' + tz, cacheData, OTP_TTL_SECONDS);
  try {
    MailApp.sendEmail(inst.email, 'קוד אימות מנהל - מערכת אימוני ירי', '', {
      name: OTP_FROM_NAME,
      htmlBody: '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px">'
        + '<h2 style="color:#1e293b;text-align:center">קוד אימות — מנהל</h2>'
        + '<p style="color:#475569;text-align:center;font-size:16px">הקוד שלך למערכת אימוני ירי:</p>'
        + '<div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin:20px 0">'
        + '<span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1e293b">' + code + '</span></div>'
        + '<p style="color:#94a3b8;text-align:center;font-size:13px">הקוד תקף ל-5 דקות. אם לא ביקשת קוד זה, התעלם מהודעה זו.</p></div>'
    });
  } catch(err) {
    Logger.log('requestAdminOTP error: ' + err.message);
    return {success: false, message: 'שגיאה בשליחת אימייל: ' + err.message};
  }
  return {success: true, maskedEmail: maskEmail(inst.email)};
}

function verifyAdminOTP(tz, code) {
  if (!tz || !code) return {success: false, message: 'יש להזין ת.ז. וקוד אימות'};
  tz = normalizeId(tz);
  code = String(code).trim();
  var cache = CacheService.getScriptCache();
  var blockKey = 'otp-block-admin-' + tz;
  if (cache.get(blockKey)) return {success: false, message: 'יותר מדי ניסיונות. נסה שוב בעוד 15 דקות'};
  var raw = cache.get('otp-admin-' + tz);
  if (!raw) return {success: false, message: 'קוד פג תוקף. בקש קוד חדש'};
  var otpData = JSON.parse(raw);
  if (otpData.code !== code) {
    otpData.attempts = (otpData.attempts || 0) + 1;
    if (otpData.attempts >= OTP_MAX_ATTEMPTS) {
      cache.remove('otp-admin-' + tz);
      cache.put(blockKey, 'blocked', OTP_BLOCK_SECONDS);
      return {success: false, message: 'יותר מדי ניסיונות שגויים. נסה שוב בעוד 15 דקות'};
    }
    cache.put('otp-admin-' + tz, JSON.stringify(otpData), OTP_TTL_SECONDS);
    return {success: false, message: 'קוד שגוי. נותרו ' + (OTP_MAX_ATTEMPTS - otpData.attempts) + ' ניסיונות'};
  }
  cache.remove('otp-admin-' + tz);
  var inst = getInstructorData(tz);
  var sessionToken = _createUserSession(tz, 'admin', inst.name);
  return {success: true, sessionToken: sessionToken};
}
