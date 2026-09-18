/**
 * UNIVERSAL API CONFIG — the ONE place the backend URL + token live.
 * index.html loads this file directly (in <head>), so window.API and
 * window.API_TOKEN are set before any other script runs on that page.
 * Modules loaded in iframes pick it up via window.parent.API.
 *
 * After you redeploy Google Apps Script (Deploy > Manage deployments),
 * copy the new Web App URL and paste it as window.API below.
 */

window.API = "https://script.google.com/macros/s/AKfycbyfhDvE-4--LDuep6Bdox0KEgQUl1TJ6YzeG8dWZbpHaJMeFHxRXcNYK3vjWMDgtrq_/exec";

// Must exactly match APP_SECRET in your Apps Script (Code.gs). Only change
// this if you rotate the secret on the backend too.
//
// NOTE: this value is visible to anyone who opens the page. It is a
// deployment identifier, NOT a security control. Real authorization comes
// from the per-login session token below.
window.API_TOKEN = "fab3805f-73fa-43f4-a844-8c42ddc322a99050e3aa-e547-4e51-962f-dbd936dcb47d";

// ---------------------------------------------------------------------------
// SESSION TOKEN
// Issued by the backend at login, valid ~6 hours, stored per browser.
// Every request must carry it once ENFORCE_SESSION = true in Code.gs.
// ---------------------------------------------------------------------------

window.setSessionToken = function (token) {
  if (token) localStorage.setItem("sessionToken", token);
};

window.clearSessionToken = function () {
  localStorage.removeItem("sessionToken");
};

window.getSessionToken = function () {
  try {
    // Inside an iframe module, fall back to the parent window's copy.
    return localStorage.getItem("sessionToken") ||
           (window.parent && window.parent !== window
             ? window.parent.localStorage.getItem("sessionToken")
             : null) || "";
  } catch (err) {
    return localStorage.getItem("sessionToken") || "";
  }
};

/**
 * Build an API URL with auth attached.
 *   apiUrl({ sheetID: id, module: "for_approval" })
 */
window.apiUrl = function (params) {
  var base = window.API || (window.parent && window.parent.API) || "";
  var token = window.API_TOKEN || (window.parent && window.parent.API_TOKEN) || "";
  var qs = new URLSearchParams(params || {});
  qs.set("token", token);
  qs.set("sessionToken", window.getSessionToken());
  return base + "?" + qs.toString();
};

/** Body wrapper for POSTs — adds the same two credentials. */
window.apiBody = function (payload) {
  var body = Object.assign({}, payload || {});
  body.token = window.API_TOKEN || (window.parent && window.parent.API_TOKEN) || "";
  body.sessionToken = window.getSessionToken();
  return JSON.stringify(body);
};