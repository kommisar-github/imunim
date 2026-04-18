// setup.gs — אימוני ירי v6.1.5

// Header colors matching existing spreadsheet formatting
var HEADER_COLOR_PURPLE = '#5b3f86';  // Source sheet, Response sheet
var HEADER_COLOR_GREEN  = '#356854';  // Instructor sheet, Sessions sheet, Suspension reasons sheet

// Project folder on Google Drive
var PROJECT_FOLDER_NAME = 'ShootingTrainingSystem';

function getOrCreateProjectFolder() {
  var folders = DriveApp.getFoldersByName(PROJECT_FOLDER_NAME);
  if (folders.hasNext()) { return folders.next(); }
  var folder = DriveApp.createFolder(PROJECT_FOLDER_NAME);
  Logger.log('Created project folder: ' + PROJECT_FOLDER_NAME + ' (' + folder.getId() + ')');
  return folder;
}

function moveToProjectFolder(fileId) {
  try {
    var folder = getOrCreateProjectFolder();
    var file = DriveApp.getFileById(fileId);
    file.moveTo(folder);
    Logger.log('  Moved "' + file.getName() + '" → ' + PROJECT_FOLDER_NAME);
  } catch(e) { Logger.log('  Could not move file ' + fileId + ': ' + e.message); }
}

/**
 * One-time utility: moves ALL existing project spreadsheets into the project folder.
 * Safe to run multiple times — skips files already in the folder.
 */
function organizeExistingSheets() {
  var folder = getOrCreateProjectFolder();
  var sheetIds = [SOURCE_SHEET_ID, RESPONSE_SHEET_ID, INSTRUCTOR_SHEET_ID, SESSIONS_SHEET_ID];
  if (SUSPENSION_REASONS_SHEET_ID && SUSPENSION_REASONS_SHEET_ID !== '') { sheetIds.push(SUSPENSION_REASONS_SHEET_ID); }
  for (var i = 0; i < sheetIds.length; i++) {
    if (!sheetIds[i] || sheetIds[i].indexOf('PASTE') === 0 || sheetIds[i].indexOf('REPLACE') === 0) { continue; }
    try {
      var file = DriveApp.getFileById(sheetIds[i]);
      var parents = file.getParents();
      var alreadyInFolder = false;
      while (parents.hasNext()) { if (parents.next().getId() === folder.getId()) { alreadyInFolder = true; break; } }
      if (!alreadyInFolder) {
        file.moveTo(folder);
        Logger.log('Moved "' + file.getName() + '" → ' + PROJECT_FOLDER_NAME);
      } else {
        Logger.log('"' + file.getName() + '" already in folder — skipped.');
      }
    } catch(e) { Logger.log('Error moving sheet ' + sheetIds[i] + ': ' + e.message); }
  }
  Logger.log('Organize complete. Folder URL: ' + folder.getUrl());
}

function setupSourceSheet() {
  var ss;
  if (SOURCE_SHEET_ID && SOURCE_SHEET_ID !== 'PASTE_SOURCE_SHEET_ID_HERE') {
    ss = SpreadsheetApp.openById(SOURCE_SHEET_ID);
  } else {
    ss = SpreadsheetApp.create('מאגר מתאמנים');
    moveToProjectFolder(ss.getId());
    Logger.log('=== Source Sheet Created ===');
    Logger.log('  ID:  ' + ss.getId());
    Logger.log('  URL: ' + ss.getUrl());
    Logger.log('UPDATE SOURCE_SHEET_ID in config.gs to: ' + ss.getId());
  }
  var sheet = ss.getSheets()[0];
  sheet.setName('Form Responses 1');
  sheet.setRightToLeft(false);
  var headers = [
    'Timestamp', 'שם מלא', 'ת.ז.', 'טלפון', 'אימייל',
    'מס׳ רישיון - כלי 1', 'בתוקף עד - כלי 1', 'סוג כלי - כלי 1', 'מספר כלי - כלי 1', 'קוטר - כלי 1',
    'מס׳ רישיון - כלי 2', 'בתוקף עד - כלי 2', 'סוג כלי - כלי 2', 'מספר כלי - כלי 2', 'קוטר - כלי 2',
    'מס׳ רישיון - כלי 3', 'בתוקף עד - כלי 3', 'סוג כלי - כלי 3', 'מספר כלי - כלי 3', 'קוטר - כלי 3',
    'מס׳ רישיון - כלי 4', 'בתוקף עד - כלי 4', 'סוג כלי - כלי 4', 'מספר כלי - כלי 4', 'קוטר - כלי 4',
    'סטטוס', 'סיבת השעיה', 'תאריך עדכון סטטוס', 'דא'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground(HEADER_COLOR_PURPLE);
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  // Number formats & validation — wrapped in one block to handle Table typed-column errors
  try {
    sheet.getRange(2, 3, 500).setNumberFormat('@');   // ת.ז. as text
    sheet.getRange(2, 4, 500).setNumberFormat('@');   // טלפון as text
    var dateCols = [7, 12, 17, 22];
    for (var d = 0; d < dateCols.length; d++) { sheet.getRange(2, dateCols[d], 500).setNumberFormat('dd/mm/yyyy'); }
    var statusRule = SpreadsheetApp.newDataValidation().requireValueInList(['פעיל', 'לא פעיל', 'מושעה'], true).build();
    sheet.getRange(2, headers.indexOf('סטטוס') + 1, 500).setDataValidation(statusRule);
    sheet.getRange(2, headers.indexOf('תאריך עדכון סטטוס') + 1, 500).setNumberFormat('dd/mm/yyyy hh:mm');
    SpreadsheetApp.flush();
  } catch(e) { Logger.log('Format/validation skipped (Table typed columns): ' + e.message); }
  try { if (!sheet.getFilter()) { sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).createFilter(); } SpreadsheetApp.flush(); } catch(e) { Logger.log('Filter skipped: ' + e.message); }
  sheet.autoResizeColumns(1, headers.length);
  Logger.log('Source sheet setup complete: ' + ss.getUrl());
  return {success: true, sheetId: ss.getId(), url: ss.getUrl()};
}

function setupResponseSheet() {
  var ss;
  if (RESPONSE_SHEET_ID && RESPONSE_SHEET_ID !== 'PASTE_RESPONSE_SHEET_ID_HERE') {
    ss = SpreadsheetApp.openById(RESPONSE_SHEET_ID);
  } else {
    ss = SpreadsheetApp.create('תשובות סקר');
    moveToProjectFolder(ss.getId());
    Logger.log('=== Response Sheet Created ===');
    Logger.log('  ID:  ' + ss.getId());
    Logger.log('  URL: ' + ss.getUrl());
    Logger.log('UPDATE RESPONSE_SHEET_ID in config.gs to: ' + ss.getId());
  }
  var sheet = ss.getSheets()[0];
  sheet.setName('Form Responses 1');
  sheet.setRightToLeft(false);
  var headers = ['Timestamp', 'שם - רישיון', 'מגיע?', 'כמות כדורים', 'הערות', 'מזהה אימון'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground(HEADER_COLOR_PURPLE);
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  try {
    var comingRule = SpreadsheetApp.newDataValidation().requireValueInList(['כן', 'לא'], true).build();
    sheet.getRange(2, headers.indexOf('מגיע?') + 1, 500).setDataValidation(comingRule);
    SpreadsheetApp.flush();
  } catch(e) { Logger.log('Validation skipped: ' + e.message); }
  try { if (!sheet.getFilter()) { sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).createFilter(); } SpreadsheetApp.flush(); } catch(e) { Logger.log('Filter skipped: ' + e.message); }
  sheet.autoResizeColumns(1, headers.length);
  Logger.log('Response sheet setup complete: ' + ss.getUrl());
  return {success: true, sheetId: ss.getId(), url: ss.getUrl()};
}

function setupInstructorSheet() {
  var ss;
  if (INSTRUCTOR_SHEET_ID && INSTRUCTOR_SHEET_ID !== 'REPLACE_WITH_INSTRUCTOR_SHEET_ID') {
    ss = SpreadsheetApp.openById(INSTRUCTOR_SHEET_ID);
  } else {
    ss = SpreadsheetApp.create('מדריכים - אימוני ירי');
    moveToProjectFolder(ss.getId());
    Logger.log('=== Instructor Sheet Created ===');
    Logger.log('  ID:  ' + ss.getId());
    Logger.log('  URL: ' + ss.getUrl());
    Logger.log('UPDATE INSTRUCTOR_SHEET_ID in config.gs to: ' + ss.getId());
  }
  var sheet = ss.getSheets()[0];
  sheet.setName('מדריכים');
  sheet.setRightToLeft(false);
  var headers = ['ת.ז.', 'שם מלא', 'מ"מ', 'טלפון', 'אימייל', 'אדמין'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground(HEADER_COLOR_GREEN);
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  try {
    sheet.getRange(2, 1, 500).setNumberFormat('@');   // ת.ז. as text
    sheet.getRange(2, 3, 500).setNumberFormat('@');   // מ"מ as text
    sheet.getRange(2, 4, 500).setNumberFormat('@');   // טלפון as text
    var adminRule = SpreadsheetApp.newDataValidation().requireValueInList(['כן', 'לא'], true).build();
    sheet.getRange(2, 6, 500).setDataValidation(adminRule);
    SpreadsheetApp.flush();
  } catch(e) { Logger.log('Format/validation skipped (Table typed columns): ' + e.message); }
  if (sheet.getLastRow() < 2) {
    try { sheet.getRange(2, 1, 1, 6).setValues([['318253233', 'אלכסנדר קולסניקוב', '1200153567', '', 'kommisar@gmail.com', 'כן']]); SpreadsheetApp.flush(); } catch(e) { Logger.log('Seed row skipped: ' + e.message); }
  }
  try { if (!sheet.getFilter()) { sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).createFilter(); } SpreadsheetApp.flush(); } catch(e) { Logger.log('Filter skipped: ' + e.message); }
  sheet.autoResizeColumns(1, headers.length);
  Logger.log('Instructor sheet setup complete: ' + ss.getUrl());
  return {success: true, sheetId: ss.getId(), url: ss.getUrl()};
}

function setupSessionsSheet() {
  var ss;
  if (SESSIONS_SHEET_ID && SESSIONS_SHEET_ID !== 'PASTE_SESSIONS_SHEET_ID_HERE') {
    ss = SpreadsheetApp.openById(SESSIONS_SHEET_ID);
  } else {
    ss = SpreadsheetApp.create('אימוני ירי - לוח אימונים');
    moveToProjectFolder(ss.getId());
    Logger.log('=== Sessions Sheet Created ===');
    Logger.log('  ID:  ' + ss.getId());
    Logger.log('  URL: ' + ss.getUrl());
    Logger.log('UPDATE SESSIONS_SHEET_ID in config.gs to: ' + ss.getId());
  }
  var sheet = ss.getSheets()[0];
  sheet.setName('אימונים');
  sheet.setRightToLeft(false);
  var headers = ['מזהה אימון', 'תאריך אימון', 'מדריך ת.ז.', 'מדריך שם', 'סטטוס', 'הערות', 'נוצר בתאריך', 'מ"מ 1 ת.ז.', 'מ"מ 2 ת.ז.'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground(HEADER_COLOR_GREEN);
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  try {
    sheet.getRange(2, 1, 500).setNumberFormat('@');              // מזהה אימון as text
    sheet.getRange(2, 2, 500).setNumberFormat('dd/mm/yyyy');     // תאריך אימון
    sheet.getRange(2, 3, 500).setNumberFormat('@');              // מדריך ת.ז. as text
    sheet.getRange(2, 7, 500).setNumberFormat('dd/mm/yyyy hh:mm');  // נוצר בתאריך
    var sessionStatusRule = SpreadsheetApp.newDataValidation().requireValueInList(['פעיל', 'סגור', 'ארכיון'], true).build();
    sheet.getRange(2, headers.indexOf('סטטוס') + 1, 500).setDataValidation(sessionStatusRule);
    SpreadsheetApp.flush();
  } catch(e) { Logger.log('Format skipped (Table typed columns): ' + e.message); }
  try { if (!sheet.getFilter()) { sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).createFilter(); } SpreadsheetApp.flush(); } catch(e) { Logger.log('Filter skipped: ' + e.message); }
  sheet.autoResizeColumns(1, headers.length);
  Logger.log('Sessions sheet setup complete: ' + ss.getUrl());
  return {success: true, sheetId: ss.getId(), url: ss.getUrl()};
}

function setupSuspensionReasonsSheet() {
  var ss;
  if (SUSPENSION_REASONS_SHEET_ID && SUSPENSION_REASONS_SHEET_ID !== '') {
    ss = SpreadsheetApp.openById(SUSPENSION_REASONS_SHEET_ID);
  } else {
    ss = SpreadsheetApp.create('סיבות השעיה - אימוני ירי');
    moveToProjectFolder(ss.getId());
    Logger.log('=== Suspension Reasons Sheet Created ===');
    Logger.log('  ID:  ' + ss.getId());
    Logger.log('  URL: ' + ss.getUrl());
    Logger.log('UPDATE SUSPENSION_REASONS_SHEET_ID in config.gs to: ' + ss.getId());
  }
  var sheet = ss.getSheetByName(SUSPENSION_REASONS_TAB);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(SUSPENSION_REASONS_TAB);
  }
  sheet.setRightToLeft(false);
  var headers = ['סיבה', 'פעיל'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground(HEADER_COLOR_GREEN);
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  try {
    var activeRule = SpreadsheetApp.newDataValidation().requireValueInList(['כן', 'לא'], true).build();
    sheet.getRange(2, 2, 500).setDataValidation(activeRule);
    SpreadsheetApp.flush();
  } catch(e) { Logger.log('Validation skipped: ' + e.message); }
  if (sheet.getLastRow() < 2) {
    try {
      var defaults = [['רישיון לא בתוקף', 'כן'], ['בעיית בטיחות', 'כן'], ['חוסר ציוד מתאים', 'כן'], ['סיבה אחרת', 'כן']];
      sheet.getRange(2, 1, defaults.length, 2).setValues(defaults);
      SpreadsheetApp.flush();
    } catch(e) { Logger.log('Default reasons skipped: ' + e.message); }
  }
  try { if (!sheet.getFilter()) { sheet.getRange(1, 1, sheet.getMaxRows(), headers.length).createFilter(); } SpreadsheetApp.flush(); } catch(e) { Logger.log('Filter skipped: ' + e.message); }
  sheet.autoResizeColumns(1, headers.length);
  Logger.log('Suspension reasons sheet setup complete: ' + ss.getUrl());
  return {success: true, sheetId: ss.getId(), url: ss.getUrl()};
}

function setupAll() {
  Logger.log('=== Running all setup functions ===');
  var source = setupSourceSheet();
  Logger.log('');
  var response = setupResponseSheet();
  Logger.log('');
  var instructor = setupInstructorSheet();
  Logger.log('');
  var sessions = setupSessionsSheet();
  Logger.log('');
  var suspensionReasons = setupSuspensionReasonsSheet();
  Logger.log('');
  // Install scheduled triggers
  installBackupTrigger();
  installAutoCloseTrigger();
  Logger.log('');
  Logger.log('=== All setup complete ===');
  Logger.log('Source:              ' + source.url);
  Logger.log('Response:            ' + response.url);
  Logger.log('Instructor:          ' + instructor.url);
  Logger.log('Sessions:            ' + sessions.url);
  Logger.log('Suspension Reasons:  ' + suspensionReasons.url);
  Logger.log('Triggers:            backup (01:00), auto-close (02:00)');
}

// =====================================================
// Auto-close trigger management (v4.2.4)
// =====================================================

function installAutoCloseTrigger() {
  removeAutoCloseTrigger();
  ScriptApp.newTrigger('autoClosePastSessions')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  Logger.log('Auto-close trigger installed — runs daily at ~02:00.');
}

function removeAutoCloseTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'autoClosePastSessions') {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log('Removed existing auto-close trigger.');
    }
  }
}

function debugTraineeData() {
  var data = getTraineeData();
  Logger.log('Total trainees: ' + data.length);
  for (var i = 0; i < Math.min(data.length, 5); i++) {
    Logger.log('Trainee ' + (i+1) + ': ' + data[i].name + ' | tz=' + data[i].tz + ' | tools=' + (data[i].tools ? data[i].tools.length : 0));
  }
}

