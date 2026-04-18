// backup.gs — אימוני ירי v5.2.0

/**
 * Scheduled backup — exports all 4 sheets into a single .xlsx file
 * in a "Backups" subfolder next to the project spreadsheets.
 *
 * Setup:  run  installBackupTrigger()  once from the Apps Script editor.
 * Remove: run  removeBackupTrigger()   to stop scheduled backups.
 */

var BACKUP_FOLDER_NAME = 'Backups';
var BACKUP_RETENTION_DAYS = 30;

/* ───────── trigger management ───────── */

function installBackupTrigger() {
  removeBackupTrigger();
  ScriptApp.newTrigger('runScheduledBackup')
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .create();
  Logger.log('Backup trigger installed — runs daily at ~01:00.');
}

function removeBackupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runScheduledBackup') {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log('Removed existing backup trigger.');
    }
  }
}

/* ───────── main backup routine ───────── */

function runScheduledBackup() {
  try {
    var folder = getOrCreateBackupFolder();
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd_HH-mm');
    var fileName = 'backup_' + timestamp + '.xlsx';

    var tempSS = SpreadsheetApp.create('_backup_temp_' + timestamp);
    var tempId = tempSS.getId();

    try {
      copySheetInto(SOURCE_SHEET_ID, 'מאגר מתאמנים', tempSS);
      copySheetInto(RESPONSE_SHEET_ID, 'תשובות סקר', tempSS);
      copySheetInto(INSTRUCTOR_SHEET_ID, 'מדריכים', tempSS);
      copySheetInto(SESSIONS_SHEET_ID, 'אימונים', tempSS);

      // remove the default blank sheet that was created with the spreadsheet
      var sheets = tempSS.getSheets();
      for (var i = 0; i < sheets.length; i++) {
        if (sheets[i].getName() === 'Sheet1' || sheets[i].getName() === 'גיליון1') {
          if (sheets.length > 1) { tempSS.deleteSheet(sheets[i]); }
          break;
        }
      }

      SpreadsheetApp.flush();

      // export as xlsx
      var exportUrl = 'https://docs.google.com/spreadsheets/d/' + tempId + '/export?format=xlsx';
      var token = ScriptApp.getOAuthToken();
      var response = UrlFetchApp.fetch(exportUrl, { headers: { 'Authorization': 'Bearer ' + token }, muteHttpExceptions: true });

      if (response.getResponseCode() !== 200) {
        throw new Error('Export failed with HTTP ' + response.getResponseCode());
      }

      var blob = response.getBlob().setName(fileName);
      var file = folder.createFile(blob);
      Logger.log('Backup saved: ' + file.getName() + ' (' + Math.round(file.getSize() / 1024) + ' KB)');

      // cleanup old backups
      purgeOldBackups(folder);

    } finally {
      // always delete the temp spreadsheet
      DriveApp.getFileById(tempId).setTrashed(true);
    }

    return { success: true, file: fileName };

  } catch (err) {
    Logger.log('BACKUP ERROR: ' + err.message);
    notifyAdminOnFailure(err);
    return { success: false, error: err.message };
  }
}

/* ───────── helpers ───────── */

function copySheetInto(sourceSheetId, targetName, targetSS) {
  var sourceSS = SpreadsheetApp.openById(sourceSheetId);
  var sourceSheet = sourceSS.getSheets()[0];
  var copied = sourceSheet.copyTo(targetSS);
  copied.setName(targetName);
}

function getOrCreateBackupFolder() {
  // Place backup folder inside the same parent as the project spreadsheets
  var parentFolder = DriveApp.getFileById(SOURCE_SHEET_ID).getParents().next();
  var children = parentFolder.getFoldersByName(BACKUP_FOLDER_NAME);
  if (children.hasNext()) { return children.next(); }
  var folder = parentFolder.createFolder(BACKUP_FOLDER_NAME);
  Logger.log('Created backup folder: ' + BACKUP_FOLDER_NAME + ' inside ' + parentFolder.getName());
  return folder;
}

function purgeOldBackups(folder) {
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - BACKUP_RETENTION_DAYS);
  var files = folder.getFiles();
  var removed = 0;
  while (files.hasNext()) {
    var f = files.next();
    if (f.getName().indexOf('backup_') === 0 && f.getDateCreated() < cutoff) {
      f.setTrashed(true);
      removed++;
    }
  }
  if (removed > 0) { Logger.log('Purged ' + removed + ' backup(s) older than ' + BACKUP_RETENTION_DAYS + ' days.'); }
}

function notifyAdminOnFailure(err) {
  try {
    if (OWNER_EMAILS && OWNER_EMAILS.length > 0) {
      var subject = 'שגיאה בגיבוי אוטומטי - אימוני ירי';
      var body = 'הגיבוי האוטומטי נכשל.\n\nשגיאה: ' + err.message + '\n\nתאריך: ' + new Date().toLocaleString('he-IL');
      MailApp.sendEmail(OWNER_EMAILS[0], subject, body);
    }
  } catch (e) {
    Logger.log('Could not send failure notification: ' + e.message);
  }
}

/* ───────── manual run / test ───────── */

function runBackupNow() {
  var result = runScheduledBackup();
  Logger.log(result.success ? 'Backup completed successfully.' : 'Backup failed: ' + result.error);
  return result;
}
