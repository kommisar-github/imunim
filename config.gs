// config.gs — אימוני ירי v5.2.0

var SCRIPT_VERSION = '5.2.0';
var MAX_TOOLS = 4;
var SOURCE_SHEET_ID = '182Kp5-vTABvRZ8VA3W0rqhAs5933yqe1YNdN61w-ACo';
var RESPONSE_SHEET_ID = '1wl4lUd3_XKLGDY58jilUae43xIH8BJtnGOgNmuF-SAQ';
var INSTRUCTOR_SHEET_ID = '1jTnZacJEKGiksJJfaIPB3sp29uHjsfrGv1Vic6v4Gls';
var INSTRUCTOR_TZ = '319253233';
var SESSIONS_SHEET_ID = '1hrsIxwkckoc_Od4gSinM07XiRVhiSo9pYW2--bbBumI';
var SESSIONS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/' + SESSIONS_SHEET_ID + '/edit';

var WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbygdC5WloMaLUJ8xN3zmRihr8_bUAVus9arG071q5VUIbs_vrAo_kTXwCPF0tGB9ytI/exec';
var REGISTER_URL = WEBAPP_URL + '?action=register';
var POLL_PAGE_URL = WEBAPP_URL + '?action=poll';
var SOURCE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/' + SOURCE_SHEET_ID + '/edit';
var RESPONSE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/' + RESPONSE_SHEET_ID + '/edit';
var INSTRUCTOR_SHEET_URL = 'https://docs.google.com/spreadsheets/d/' + INSTRUCTOR_SHEET_ID + '/edit';

var OWNER_EMAILS = ['kommisar@gmail.com'];
var SUSPENSION_REASONS_SHEET_ID = '1E3htH5udGPwgnqvOC6cJbtEjG0cva1EdDG_v1SByENQ';
var SUSPENSION_REASONS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/' + SUSPENSION_REASONS_SHEET_ID + '/edit';
var SUSPENSION_REASONS_TAB = 'סיבות השעיה';
var REQUIRE_LOGIN = true;
var POLL_SHEET_NAME = 'Form Responses 1';

// OTP configuration
var OTP_FROM_EMAIL = 'kommisar@gmail.com';
var OTP_FROM_NAME = 'מערכת אימוני ירי';
var OTP_TTL_SECONDS = 300;
var OTP_MAX_ATTEMPTS = 3;
var OTP_BLOCK_SECONDS = 900;

// LOGO_BASE64 is defined in logo.gs (separate file to keep code readable)
