/**
 * C.E.R.I.S SYSTEM - Universal API Configuration
 * ------------------------------------------------
 * Single source of truth for the backend URL and the auth token.
 * Every page (index.html) AND every module iframe (each modules
 * subfolder's HTML file) loads this file directly, so nothing
 * hardcodes its own copy of the
 * URL/token anymore and nothing depends on window.parent existing.
 *
 * IMPORTANT: window.API_TOKEN below MUST exactly match APP_SECRET in
 * the Apps Script backend (Code.gs). If you rotate one, rotate both.
 */
window.API = "https://script.google.com/macros/s/AKfycbwKiXQETth6iqptvflJOC8uiokISauplzLsKsNVKycGv7DOZNHmWSDFmMJWnPbOnlDX/exec";
window.API_TOKEN = "fab3805f-73fa-43f4-a844-8c42ddc322a99050e3aa-e547-4e51-962f-dbd936dcb47d";
