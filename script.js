/**
 * C.E.R.I.S System - Main External Logic
 */

const API_URL = window.API;
const API_TOKEN = window.API_TOKEN;

async function handleAction(action) {
    const user = document.getElementById('userInput').value;
    const passInputEl = document.getElementById('passInput');
    
    if(!user) return showModal("REQUIRED", "Please enter your Identity Code.", "error");

    const body = { action: action, user: user, token: API_TOKEN };

    if (action === 'login') {
        body.pass = passInputEl.value;
    } else if (action === 'updatePassword') {
        const newPass = document.getElementById('newPassInput').value;
        if (!newPass) return showModal("REQUIRED", "Please enter a new password.", "error");
        body.newPass = newPass;
        // The backend's updateUserCredentials() needs to know WHICH row to
        // touch (rowIndex, captured from the earlier login's REQUIRE_UPDATE
        // response) and needs a username to keep (newUser) or it will blank
        // the username cell out. Both were previously never sent, so every
        // "set your new password" submission silently failed.
        body.rowIndex = window.sessionRowIndex;
        body.newUser = window.sessionUser || user;
    }

    // Show the sea wave progress bar when processing starts
    if (typeof showSeaWaveLoader === 'function') {
        showSeaWaveLoader("AUTHORIZING USER...");
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
            window.sessionUser = user;
            window.sessionBridges = data.bridges || {};
            localStorage.setItem("userBridges", JSON.stringify(window.sessionBridges));

            const currentStatus = data.status ? data.status.toUpperCase() : "";

            if (action === 'updatePassword' || currentStatus === 'ACTIVE') {
                showDashboard(data.clientName || user);
                filterIcons();
                if (action === 'updatePassword') showModal("SECURED", "Access key updated.", "success");
            } else if (currentStatus === 'REQUIRE_UPDATE') {
                // Backend sends REQUIRE_UPDATE (not "DEFAULT") for a
                // default-password account. Keep the row reference so the
                // follow-up updatePassword call above can use it.
                window.sessionRowIndex = data.rowIndex;
                document.getElementById('cardInner').classList.add('flipped');
            } else {
                showModal("RESTRICTED", data.message || "Account locked.", "lock");
            }
        } else {
            showModal("ACCESS DENIED", data.error || data.message || "Invalid credentials.", "error");
        }
    } catch (error) {
        showModal("CONNECTION LOST", "PLEASE CHECK INTERNET CONNECTION", "error");
    } finally {
        if (typeof hideSeaWaveLoader === 'function') {
            hideSeaWaveLoader();
        }
    }
}

/**
 * "Back to Login" button on the default-password (register) flip face.
 */
function backToLogin() {
    document.getElementById('cardInner').classList.remove('flipped');
}

/**
 * FORGOT PASSWORD FLOW
 * Step 1: verify the username exists (action: forgotPassword) and get
 *         back the rowIndex needed to update it.
 * Step 2: submit a new password (reuses the updatePassword action),
 *         which writes directly to the USERDB spreadsheet row.
 */
function openForgotPassword() {
    document.getElementById('forgotStep1').style.display = 'block';
    document.getElementById('forgotStep2').style.display = 'none';
    document.getElementById('forgotUserInput').value = '';
    document.getElementById('forgotNewPassInput').value = '';
    document.getElementById('forgotModal').style.display = 'flex';
}

function closeForgotModal() {
    document.getElementById('forgotModal').style.display = 'none';
}

async function submitForgotUsername() {
    const user = document.getElementById('forgotUserInput').value.trim();
    if (!user) return showModal("REQUIRED", "Please enter your Identity Code.", "error");

    if (typeof showSeaWaveLoader === 'function') showSeaWaveLoader("VERIFYING ACCOUNT...");

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "forgotPassword", user: user, token: API_TOKEN })
        });
        const data = await response.json();

        if (data.success) {
            window.sessionForgotUser = user;
            window.sessionForgotRowIndex = data.rowIndex;
            document.getElementById('forgotStep1').style.display = 'none';
            document.getElementById('forgotStep2').style.display = 'block';
        } else {
            showModal("NOT FOUND", data.error || "We couldn't verify that account.", "error");
        }
    } catch (error) {
        showModal("CONNECTION LOST", "PLEASE CHECK INTERNET CONNECTION", "error");
    } finally {
        if (typeof hideSeaWaveLoader === 'function') hideSeaWaveLoader();
    }
}

async function submitForgotReset() {
    const newPass = document.getElementById('forgotNewPassInput').value;
    if (!newPass) return showModal("REQUIRED", "Please enter a new password.", "error");
    if (!window.sessionForgotUser || !window.sessionForgotRowIndex) {
        return showModal("SESSION EXPIRED", "Please start the Forgot Password process again.", "error");
    }

    if (typeof showSeaWaveLoader === 'function') showSeaWaveLoader("UPDATING SPREADSHEET...");

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "updatePassword",
                user: window.sessionForgotUser,
                newUser: window.sessionForgotUser,
                newPass: newPass,
                rowIndex: window.sessionForgotRowIndex,
                token: API_TOKEN
            })
        });
        const data = await response.json();

        if (data.success) {
            closeForgotModal();
            showModal("SECURED", "Your password was reset and the spreadsheet has been updated. You can log in now.", "success");
        } else {
            showModal("ERROR", data.error || data.message || "Could not reset your password.", "error");
        }
    } catch (error) {
        showModal("CONNECTION LOST", "PLEASE CHECK INTERNET CONNECTION", "error");
    } finally {
        if (typeof hideSeaWaveLoader === 'function') hideSeaWaveLoader();
    }
}

function showDashboard(clientName) {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    document.getElementById('clientHeader').innerText = clientName.toUpperCase() + " SYSTEM";
    document.getElementById('displayUsername').innerText = getTimeGreeting() + ", " + window.sessionUser.toUpperCase();
    openModule('announcement'); 
}

function filterIcons() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.style.display = 'flex';
    });
}

function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "GOOD MORNING";
    if (hour < 18) return "GOOD AFTERNOON";
    return "GOOD EVENING";
}

function showModal(title, message, type) {
    const modal = document.getElementById('statusModal');
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalMessage').innerText = message;
    let iconHtml = '';
    if(type === 'error') iconHtml = '<i class="fa-solid fa-circle-xmark" style="color:#ff4444; font-size:3rem;"></i>';
    if(type === 'lock') iconHtml = '<i class="fa-solid fa-lock" style="color:#ffbb33; font-size:3rem;"></i>';
    if(type === 'success') iconHtml = '<i class="fa-solid fa-circle-check" style="color:#00C851; font-size:3rem;"></i>';
    document.getElementById('modalIconContainer').innerHTML = iconHtml;
    modal.style.display = 'flex';
}

async function logoutSystem() {
    // Previously this only cleared localStorage and reloaded - the backend's
    // "logout" action (which logs session duration to LOGIN_LOGS) was never
    // actually called.
    if (window.sessionUser) {
        try {
            await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ action: "logout", user: window.sessionUser, token: API_TOKEN })
            });
        } catch (err) {
            console.log("Logout log failed (continuing anyway):", err);
        }
    }
    localStorage.removeItem("userBridges");
    window.location.reload();
}

/**
 * +-5% BUFFER SYSTEM MODULE FETCH & RENDER LOGIC
 */
async function runBufferPlusMinus() {
    const bridges = window.sessionBridges || JSON.parse(localStorage.getItem("userBridges") || "{}");
    const bufferBridgeID = bridges["5_buffer"] || new URLSearchParams(window.location.search).get('sheetID');

    if (!bufferBridgeID) {
        showModal("RESTRICTED", "No bridge assigned for 5% Buffer System.", "error");
        return;
    }

    if (typeof showSeaWaveLoader === 'function') {
        showSeaWaveLoader("FETCHING BUFFER DATA...");
    }

    try {
        const targetURL = `${API_URL}?token=${encodeURIComponent(API_TOKEN)}&sheetID=${encodeURIComponent(bufferBridgeID)}&module=${encodeURIComponent("5_buffer")}`;
        
        const response = await fetch(targetURL, {
            method: "GET",
            headers: { "Accept": "application/json" }
        });

        const jsonResponse = await response.json();
        console.log("SERVER DATA RECEIVED:", jsonResponse);

        if (jsonResponse.error) {
            showModal("SERVER ERROR", jsonResponse.error, "error");
            return;
        }

        const rows = jsonResponse.rows || [];
        renderBufferTableRows(rows);
        
        const modalEl = document.getElementById('bufferModal'); 
        if (modalEl) modalEl.style.display = 'flex';

    } catch (err) {
        console.error("Buffer fetch failed:", err);
        showModal("COMMUNICATION ERROR", "Failed to retrieve buffer records.", "error");
    } finally {
        if (typeof hideSeaWaveLoader === 'function') {
            hideSeaWaveLoader();
        }
    }
}

function renderBufferTableRows(rows) {
    const tableBody = document.querySelector('#bufferTableBody'); 
    const tableFoot = document.querySelector('#bufferTableFoot');

    const formatPct = (val) => {
        if (val === undefined || val === null || val === '') return '0.00%';
        let num = Number(val);
        if (isNaN(num)) return val;
        return (num * 100).toFixed(2) + '%';
    };

    const getPctColor = (val) => {
        if (val === undefined || val === null || val === '') return '#000000';
        let num = Number(val);
        if (isNaN(num)) return '#000000';
        let pct = num * 100;

        if (pct >= -5 && pct <= 5) {
            return 'rgb(9, 175, 34)';
        }
        if (pct > 5 || pct < -5) {
            return '#f83939';
        }

        return '#000000';
    };

    if (tableBody) {
        tableBody.innerHTML = "";

        if (!rows || rows.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="14" style="text-align:center; padding:20px; color:#000; border: 1px solid #add8e6;">No buffer records found.</td></tr>`;
        } else {
            rows.forEach(row => {
                let tr = document.createElement('tr');
                tr.style.backgroundColor = '#ffffff';
                tr.style.borderBottom = "1px solid #add8e6";

                const accountName = row.account !== undefined && row.account !== null ? String(row.account).trim() : "";
                const isTotalRow = accountName.toUpperCase().includes('TOTAL');
                const rowBgColor = isTotalRow ? '#d4edda' : '#ffffff';
                
                const vcodeVal = row.vcode || row.VCODE || "";

                const dataValues = [
                    accountName, 
                    row.client_required !== undefined ? Math.round(row.client_required) : "", 
                    row.on_board !== undefined ? Math.round(row.on_board) : "", 
                    row.yes_plantilla_not_mika !== undefined ? Math.round(row.yes_plantilla_not_mika) : "", 
                    row.yes_mika_not_plantilla !== undefined ? Math.round(row.yes_mika_not_plantilla) : "", 
                    row.yes_plantilla_not_payroll !== undefined ? Math.round(row.yes_plantilla_not_payroll) : "", 
                    row.yes_payroll_not_plantilla !== undefined ? Math.round(row.yes_payroll_not_plantilla) : "", 
                    formatPct(row.payroll_buffer_1), 
                    formatPct(row.payroll_buffer_2), 
                    formatPct(row.mika_buffer_1), 
                    formatPct(row.mika_buffer_2), 
                    row.commando_reliever !== undefined ? Math.round(row.commando_reliever) : "", 
                    row.reliever !== undefined ? Math.round(row.reliever) : "", 
                    row.total_active !== undefined ? Math.round(row.total_active) : ""
                ];

                dataValues.forEach((val, i) => {
                    let td = document.createElement('td');
                    td.style.padding = "8px 10px";
                    td.style.border = "1px solid #add8e6";
                    td.style.color = "#000000";

                    if (isTotalRow && i <= 6) {
                        td.style.setProperty('background-color', rowBgColor, 'important');
                    } else {
                        td.style.setProperty('background-color', '#ffffff', 'important');
                    }

                    if (i > 0) td.style.textAlign = "center";
                    if (isTotalRow || i === 13) td.style.fontWeight = "bold";

                    if (i >= 7 && i <= 10) {
                        const rawVal = [row.payroll_buffer_1, row.payroll_buffer_2, row.mika_buffer_1, row.mika_buffer_2][i - 7];
                        td.style.setProperty('color', getPctColor(rawVal), 'important');
                        td.style.setProperty('font-weight', 'bold', 'important');
                    }

                    if (!isTotalRow && [3, 4, 5, 6].includes(i)) {
                        td.style.cursor = "pointer";
                        td.style.textDecoration = "underline";
                        td.title = "Click to view breakdown";

                        td.addEventListener('click', () => {
                            if (i === 3) handlePlantillaNotInMika(vcodeVal);
                            if (i === 4) handleMikaNotInPlantilla(vcodeVal);
                            if (i === 5) handlePlantillaNotPayroll(vcodeVal);
                            if (i === 6) handlePayrollNotPlantilla(vcodeVal);
                        });
                    }

                    td.innerText = val;
                    tr.appendChild(td);
                });

                tableBody.appendChild(tr);
          });
        }
    }

    if (tableFoot) {
        tableFoot.innerHTML = "";
    }
}

async function handlePlantillaNotInMika(vcode) {
    console.log("Executing separate logic for Plantilla Not In Mika with VCODE:", vcode);
    await openDrilldownModal('YES PLANTILLA NOT IN MIKA', 'yes_plantilla_not_mika', vcode);
}

async function handleMikaNotInPlantilla(vcode) {
    console.log("Executing separate logic for Mika Not In Plantilla with VCODE:", vcode);
    await openDrilldownModal('YES MIKA NOT IN PLANTILLA', 'yes_mika_not_plantilla', vcode);
}

async function handlePlantillaNotPayroll(vcode) {
    console.log("Executing separate logic for Possible Tamad with VCODE:", vcode);
    await openDrilldownModal('YES PLANTILLA BUT NOT IN PAYROLL (POSSIBLE TAMAD)', 'yes_plantilla_not_payroll', vcode);
}

async function handlePayrollNotPlantilla(vcode) {
    console.log("Executing separate logic for Possible Ghost with VCODE:", vcode);
    await openDrilldownModal('YES PAYROLL NOT IN PLANTILLA (POSSIBLE GHOST)', 'yes_payroll_not_plantilla', vcode);
}

async function openModule(folderName) {
    const container = document.getElementById('tableView');
    const titleElement = document.getElementById('activeModuleTitle');
    if (titleElement) titleElement.innerText = folderName.replace(/_/g, ' ').toUpperCase();

    if (folderName === 'announcement') {
        setBackgroundVideoState(true);
        container.innerHTML = `<iframe src="modules/announcement/announcement.html" style="width:100%; height:100%; border:none;"></iframe>`;
        return;
    } else {
        setBackgroundVideoState(false);
    }

    const bridges = window.sessionBridges || JSON.parse(localStorage.getItem("userBridges") || "{}");
    
    if (folderName === 'hr_emploc_monitoring' && !bridges['hr_emploc_monitoring']) {
        bridges['hr_emploc_monitoring'] = "1DxY_U6XAH-03DzBoBpU7je_WCpoUYz8t6XmrQpWCL3s";
    }

    let targetSheetID = bridges[folderName] || "";

    if (folderName === 'hr_emploc_monitoring') {
        if (!targetSheetID) {
            showModal("RESTRICTED", "HR Emploc Monitoring spreadsheet is not configured for this user.", "error");
            return;
        }
    }
    
    const currentClientHeader = document.getElementById('clientHeader').innerText || "";
    const iframeUrl = `modules/${folderName}/${folderName}.html?sheetID=${targetSheetID}&user=${window.sessionUser}&clientHeader=${encodeURIComponent(currentClientHeader)}`;
    container.innerHTML = `<iframe src="${iframeUrl}" style="width:100%; height:100%; border:none;"></iframe>`;
}