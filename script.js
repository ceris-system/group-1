/**
 * C.E.R.I.S System - Main External Logic
 */

const API_URL = window.API; // comes from universal.js, loaded in index.html's <head>

async function handleAction(action) {
    const user = document.getElementById('userInput').value;
    const passInputEl = document.getElementById('passInput');

    const body = { action: action, token: window.API_TOKEN };

    if (action === 'login') {
        if (!user) return showModal("REQUIRED", "Please enter your Identity Code.", "error");
        body.user = user;
        body.pass = passInputEl.value;
    } else if (action === 'updatePassword') {
        const newUserVal = (document.getElementById('newUserInput').value || "").trim();
        const newPass = document.getElementById('newPassInput').value;
        if (!newUserVal) return showModal("REQUIRED", "Please enter a username.", "error");
        if (!newPass) return showModal("REQUIRED", "Please enter a new password.", "error");
        if (newPass.length < 8) return showModal("TOO SHORT", "New password must be at least 8 characters.", "error");
        if (!window.pendingUpdateRowIndex) return showModal("SESSION EXPIRED", "Please log in again to update your account.", "error");
        body.user = newUserVal;
        body.rowIndex = window.pendingUpdateRowIndex;
        body.newUser = newUserVal;
        body.newPass = newPass;
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
            const currentStatus = data.status ? data.status.toUpperCase() : "";

            if (action === 'updatePassword') {
                // No bridges come back from an account-update response, so
                // send the user back to a clean login with their new
                // credentials rather than opening the dashboard without them.
                window.pendingUpdateRowIndex = null;
                backToLogin();
                document.getElementById('userInput').value = body.newUser;
                showModal("SECURED", "Access key updated. Please log in with your new credentials.", "success");
            } else if (currentStatus === 'ACTIVE') {
                window.sessionUser = user;
                window.sessionBridges = data.bridges;
                localStorage.setItem("userBridges", JSON.stringify(data.bridges));
                showDashboard(data.clientName || user);
                filterIcons();
            } else if (currentStatus === 'REQUIRE_UPDATE' || currentStatus === 'DEFAULT') {
                window.pendingUpdateRowIndex = data.rowIndex;
                const newUserField = document.getElementById('newUserInput');
                if (newUserField) newUserField.value = user;
                document.getElementById('cardInner').classList.add('flipped');
            } else {
                showModal("RESTRICTED", "Account locked.", "lock");
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

function backToLogin() {
    document.getElementById('cardInner').classList.remove('flipped');
    document.getElementById('cardInner').style.visibility = 'visible';
    const forgotFace = document.getElementById('forgotFace');
    if (forgotFace) forgotFace.style.display = 'none';
    const newUserField = document.getElementById('newUserInput');
    const newPassField = document.getElementById('newPassInput');
    if (newUserField) newUserField.value = "";
    if (newPassField) newPassField.value = "";
}

function showForgotPassword() {
    document.getElementById('cardInner').style.visibility = 'hidden';
    document.getElementById('forgotFace').style.display = 'flex';
    document.getElementById('forgotUserInput').value = document.getElementById('userInput').value || "";
}

function hideForgotPassword() {
    document.getElementById('forgotFace').style.display = 'none';
    document.getElementById('cardInner').style.visibility = 'visible';
    document.getElementById('forgotUserInput').value = "";
}

async function handleForgotPassword() {
    const username = (document.getElementById('forgotUserInput').value || "").trim();
    if (!username) return showModal("REQUIRED", "Please enter your Identity Code.", "error");

    if (typeof showSeaWaveLoader === 'function') {
        showSeaWaveLoader("LOOKING UP ACCOUNT...");
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "lookupAccountForReset", user: username, token: window.API_TOKEN })
        });

        const data = await response.json();

        if (data.success) {
            // Same trust level as a default-account reset: knowing the
            // username is enough to reach the update-password screen.
            window.pendingUpdateRowIndex = data.rowIndex;
            hideForgotPassword();
            document.getElementById('newUserInput').value = data.username || username;
            document.getElementById('cardInner').classList.add('flipped');
        } else {
            showModal("ACCESS DENIED", data.error || "Invalid username or password.", "error");
        }
    } catch (error) {
        showModal("CONNECTION LOST", "PLEASE CHECK INTERNET CONNECTION", "error");
    } finally {
        if (typeof hideSeaWaveLoader === 'function') {
            hideSeaWaveLoader();
        }
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

function logoutSystem() {
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
        const targetURL = `${API_URL}?sheetID=${encodeURIComponent(bufferBridgeID)}&module=${encodeURIComponent("5_buffer")}&token=${encodeURIComponent(window.API_TOKEN)}`;
        
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