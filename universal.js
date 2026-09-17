/**
 * UNIVERSAL API CONFIG — the ONE place the backend URL + token live.
 * index.html loads this file directly (in <head>), so window.API and
 * window.API_TOKEN are set before any other script runs on that page.
 * Modules loaded in iframes pick it up via window.parent.API.
 *
 * After you redeploy Google Apps Script (Deploy > Manage deployments),
 * copy the new Web App URL and paste it as window.API below.
 */

window.API = "https://script.google.com/macros/s/AKfycbxM_BJ5v9-n0jVH-pVNiutFCGA-I4-UpGF-6RYkdSibVgTy_Gkr0Fh7RBa_567ym8wV/exec";

// Must exactly match APP_SECRET in your Apps Script (Code.gs). Only change
// this if you rotate the secret on the backend too.
window.API_TOKEN = "fab3805f-73fa-43f4-a844-8c42ddc322a99050e3aa-e547-4e51-962f-dbd936dcb47d";