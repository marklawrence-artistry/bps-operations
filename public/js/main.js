import * as api from './api.js';
import * as render from './render.js';

const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(str) : str;
};

try {
    const tokenStr = localStorage.getItem('token');
    if (tokenStr) {
        const payload = JSON.parse(atob(tokenStr.replace(/^"|"$/g, '').split('.')[1]));
        if (payload.role_id === 2) {
            document.documentElement.classList.add('is-staff');
        }
    }
} catch(e) { /* Ignore errors, server check will handle it */ }

const ConnectivityManager = {
    isOffline: false,
    checkInterval: null,
    offlineToast: null,

    init() {
        if (!document.querySelector('.toast-container')) {
            const container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        window.ConnectivityManager = this;

        // FIX 2: Trigger an immediate ping on load/refresh
        this.pingServer();
        this.startConnectionCheck();
    },

    showToast(message, type) {
        const container = document.querySelector('.toast-container');
        if (type === 'offline' && this.offlineToast) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'online' ? '⚡' : '⚠️';
        
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        if (type === 'online') {
            setTimeout(() => {
                toast.classList.remove('show');
                toast.classList.add('hide');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        } else {
            this.offlineToast = toast;
        }
    },

    // Extracted ping logic to separate function
    async pingServer() {
        try {
            let token = localStorage.getItem('token');
            let headers = { 'Cache-Control': 'no-cache' };
            
            // Send token if we have it to prevent 403s
            if (token) {
                token = token.replace(/^"|"$/g, '');
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`/api/auth/me?ping=${Date.now()}`, { 
                method: 'GET', 
                headers: headers
            });

            if (res.status >= 200 && res.status < 500) {
                if (this.isOffline) this.handleOnline();
            } else {
                if (this.isOffline) this.handleOnline();
            }
        } catch (err) {
            if (!this.isOffline) this.handleOffline();
        }
    },

    // Update 2: Automatically wipe Data Cache when internet returns
    async handleOnline() {
        if (!this.isOffline) return;
        this.isOffline = false;

        console.log("Server detected back online.");

        // === WIPE THE CACHE SO TABLES GET FRESH DATA ===
        if ('caches' in window) {
            try {
                await caches.delete('bps-data-v2');
                console.log("Wiped offline cache to force fresh data.");
            } catch(e) { console.warn("Cache wipe failed", e); }
        }
        
        if (this.offlineToast) {
            this.offlineToast.classList.remove('show');
            this.offlineToast.classList.add('hide');
            setTimeout(() => {
                if (this.offlineToast) this.offlineToast.remove();
                this.offlineToast = null;
            }, 300);
        }
        
        this.showToast("Connection restored! Syncing...", "online");
        document.body.classList.remove('is-offline');

        if (!currentAccount && localStorage.getItem('token') && !window.location.pathname.endsWith('index.html')) {
            await checkSession();
        }

        // Process Offline Outbox
        await this.syncOutbox();

        // Refresh all tables
        await this.refreshActivePage();
        
        if (typeof io !== 'undefined' && window.socket) {
            window.socket.connect();
        }
    },

    startConnectionCheck() {
        if (this.checkInterval) clearInterval(this.checkInterval);
        // Ping every 3 seconds for faster detection
        this.checkInterval = setInterval(() => this.pingServer(), 3000); 
    },

    handleOffline() {
        if (this.isOffline) return; 
        this.isOffline = true;
        
        console.log("System detected server outage.");
        this.showToast("Server unreachable. Retrying...", "offline");
        document.body.classList.add('is-offline');
    },

    async handleOnline() {
        if (!this.isOffline) return;
        this.isOffline = false;

        console.log("Server detected back online.");
        
        if (this.offlineToast) {
            this.offlineToast.classList.remove('show');
            this.offlineToast.classList.add('hide');
            setTimeout(() => {
                if (this.offlineToast) this.offlineToast.remove();
                this.offlineToast = null;
            }, 300);
        }
        
        this.showToast("Connection restored! Refresh! CTRL + R", "online");
        document.body.classList.remove('is-offline');

        if (!currentAccount && localStorage.getItem('token') && !window.location.pathname.endsWith('index.html')) {
            await checkSession();
        }

        // === PROCESS OFFLINE OUTBOX ===
        await this.syncOutbox();

        await this.refreshActivePage();
        
        if (typeof io !== 'undefined' && window.socket) {
            window.socket.connect();
        }
    },

    // NEW FUNCTION INSIDE ConnectivityManager
    async syncOutbox() {
        const outbox = JSON.parse(localStorage.getItem('bps_outbox')) || [];
        if (outbox.length === 0) return;

        this.showToast(`Syncing ${outbox.length} offline actions...`, "online");

        for (let task of outbox) {
            try {
                await fetch(task.url, {
                    method: task.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': task.token
                    },
                    body: task.body
                });
            } catch (err) {
                console.error("Failed to sync an offline task:", task, err);
            }
        }
        
        // Clear outbox after syncing
        localStorage.removeItem('bps_outbox');
        this.showToast("Offline data synced to server!", "online");
    },

    async refreshActivePage() {
        const token = JSON.parse(localStorage.getItem('token'));
        if(!token) return;

        if (document.querySelector('#inventory-list')) {
             loadPaginatedData(api.getAllInventory, render.renderInventoryTable, document.querySelector('#inventory-list'), document.querySelector('.pagination'), 'inventoryPage', 'inventorySearch');
        }
        if (document.querySelector('#seller-list')) {
             loadPaginatedData(api.getAllSellers, render.renderSellersTable, document.querySelector('#seller-list'), document.querySelector('.pagination'), 'sellerPage');
        }
        if (document.querySelector('#rts-list')) {
             loadPaginatedData(api.getAllRTS, render.renderRTSTable, document.querySelector('#rts-list'), document.querySelector('.pagination'), 'rtsPage');
        }
        if (document.querySelector('#sales-list')) {
             loadPaginatedData(api.getAllSales, render.renderSalesTable, document.querySelector('#sales-list'), document.querySelector('.pagination'), 'salesPage');
        }
        if (document.querySelector('#document-list')) {
             loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable, document.querySelector('#document-list'), document.querySelector('.pagination'), 'documentPage');
        }
        if (document.querySelector('.overview-grid')) {
            try {
                const stats = await api.getDashboardStats(token);
                if(document.getElementById('stat-low-stock')) document.getElementById('stat-low-stock').innerText = stats.lowStockCount;
                if(document.getElementById('stat-sales')) document.getElementById('stat-sales').innerText = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: "compact" }).format(stats.salesMonthTotal);
                if(document.getElementById('stat-sellers')) document.getElementById('stat-sellers').innerText = stats.sellerCount;
            } catch(e) {}
        }
    }
};

// Initialize immediately
ConnectivityManager.init();


window.alert = function(message) {
    return new Promise((resolve) => {
        let modal = document.getElementById('custom-alert-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'custom-alert-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; text-align: center; animation: modalFadeIn 0.2s ease; z-index: 9999;">
                    <div class="modal-header" style="justify-content: center; border-bottom: none; padding-top: 2rem;">
                        <h2 style="color: #111827; font-size: 1.25rem;">System Notice</h2>
                    </div>
                    <div class="modal-body" style="padding: 0 2rem 2rem;">
                        <p id="custom-alert-message" style="color: #4b5563; margin-bottom: 1.5rem; line-height: 1.5;"></p>
                        <button id="custom-alert-btn" class="btn-orange" style="width: 100%;">OK</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }
        document.getElementById('custom-alert-message').innerText = message;
        modal.style.display = 'flex';
        
        document.getElementById('custom-alert-btn').onclick = () => {
            modal.style.display = 'none';
            resolve();
        };
    });
};

window.customConfirm = function(message) {
    return new Promise((resolve) => {
        let modal = document.getElementById('custom-confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'custom-confirm-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; text-align: center; animation: modalFadeIn 0.2s ease; z-index: 9999;">
                    <div class="modal-header" style="justify-content: center; border-bottom: none; padding-top: 2rem;">
                        <h2 style="color: #111827; font-size: 1.25rem;">Confirm Action</h2>
                    </div>
                    <div class="modal-body" style="padding: 0 2rem 2rem;">
                        <p id="custom-confirm-message" style="color: #4b5563; margin-bottom: 1.5rem; line-height: 1.5;"></p>
                        <div style="display: flex; gap: 1rem;">
                            <button id="custom-confirm-cancel" style="flex: 1; padding: 0.8rem; border-radius: 10px; border: 1px solid #e5e7eb; background: white; cursor: pointer;">Cancel</button>
                            <button id="custom-confirm-yes" class="btn-orange" style="flex: 1; background-color: #ef4444;">Yes, Proceed</button>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }
        document.getElementById('custom-confirm-message').innerText = message;
        modal.style.display = 'flex';
        
        document.getElementById('custom-confirm-cancel').onclick = () => { modal.style.display = 'none'; resolve(false); };
        document.getElementById('custom-confirm-yes').onclick = () => { modal.style.display = 'none'; resolve(true); };
    });
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const alertModal = document.getElementById('custom-alert-modal');
        const confirmModal = document.getElementById('custom-confirm-modal');
        
        if (alertModal && alertModal.style.display === 'flex') {
            e.preventDefault();
            document.getElementById('custom-alert-btn').click();
        } else if (confirmModal && confirmModal.style.display === 'flex') {
            e.preventDefault();
            document.getElementById('custom-confirm-yes').click();
        }
    }
});

let currentAccount = null;

// Global State for Pagination
const state = {
    accountPage: 1, accountSearch: '', accountRole: '', accountSort: 'DESC',
    sellerPage: 1, sellerSearch: '', sellerCategory: '', sellerSort: 'DESC',
    documentPage: 1, documentSearch: '', documentCategory: '', documentSort: 'DESC',
    inventoryPage: 1, inventorySearch: '', inventoryCategory: '', inventorySort: 'newest',
    rtsPage: 1, rtsSearch: '', rtsStatus: '', rtsSort: 'DESC',
    inventoryCatPage: 1,
    auditPage: 1, auditSearch: '', auditAction: '', auditSort: 'DESC',
    salesPage: 1, salesSearch: '', salesSort: 'newest'
};

let lockoutTimer;
function resetLockout() {
    clearTimeout(lockoutTimer);
    // 30 minutes = 30 * 60 * 1000
    lockoutTimer = setTimeout(() => {
        alert("Session expired due to inactivity.");
        sessionStorage.removeItem('token');
        window.location.href = 'index.html';
    }, 30 * 60 * 1000);
}
// Listen for activity
window.onload = resetLockout;
document.onmousemove = resetLockout;
document.onkeydown = resetLockout;

// --- HELPER: Load Paginated Data ---
async function loadPaginatedData(apiMethod, renderMethod, listDiv, paginationDiv, pageStateKey, searchStateKey = null, ...filterKeys) {
    if (!listDiv) return;

    try {
        const token = JSON.parse(localStorage.getItem('token'));
        const currentPage = state[pageStateKey];
        const searchTerm = searchStateKey ? state[searchStateKey] : ''; 

        // Collect extra filter values from state
        const extraArgs = filterKeys.map(key => state[key]);

        // Call API with token, page, search, ...filters
        const result = await apiMethod(token, currentPage, searchTerm, ...extraArgs);

        if (result.stats) {
            const formatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
            
            // Sales KPIs
            if (document.getElementById('kpi-sales-total')) {
                document.getElementById('kpi-sales-total').innerText = formatter.format(result.stats.totalRevenue);
                document.getElementById('kpi-sales-avg').innerText = formatter.format(result.stats.avgRevenue);
            }
            // Inventory KPIs
            if (document.getElementById('kpi-inv-total')) {
                document.getElementById('kpi-inv-total').innerText = result.stats.totalQuantity;
                document.getElementById('kpi-inv-low').innerText = result.stats.lowStockCount;
            }
            // Seller KPIs
            if (document.getElementById('kpi-seller-total')) {
                document.getElementById('kpi-seller-total').innerText = result.stats.total;
                document.getElementById('kpi-seller-platform').innerText = result.stats.topPlatformName;
                document.getElementById('kpi-seller-top-count').innerText = result.stats.topPlatformCount + " Sellers";
            }
        }

        renderMethod(result.data, listDiv);

        if (paginationDiv && result.pagination) {
            render.renderPagination(result.pagination, paginationDiv, (newPage) => {
                state[pageStateKey] = newPage;
                // Pass the same arguments recursively
                loadPaginatedData(apiMethod, renderMethod, listDiv, paginationDiv, pageStateKey, searchStateKey, ...filterKeys);
            });
        }
    } catch (err) {
        console.error(`Error loading ${pageStateKey}:`, err);
        if (err.message && (err.message.includes("token") || err.message.includes("expired"))) {
            localStorage.removeItem('token');
            location.href = 'index.html';
        } else if (err.message && (err.message.includes("Access denied") || err.message.includes("denied"))) {
            await window.alert("Access Denied. You do not have permission to view this page.");
            window.location.href = 'dashboard.html';
        } else {
            await window.alert(err.message);
        }
    }
}
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
// --- HELPER: Role Based UI ---
async function applyRoleBasedUI() { // <-- MAKE IT ASYNC
    if (!currentAccount) return;
    
    // If User is Staff (Role 2)
    if (currentAccount.role_id === 2) { 
        document.documentElement.classList.add('is-staff'); // Backup application of the class

        // Force Redirect if they type the URL manually
        const restrictedHrefs = ['audit-log.html', 'documents.html', 'sellers.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (restrictedHrefs.includes(currentPage)) {
            // Wait for user to click OK on the custom modal before redirecting
            await window.alert("Security Policy: You do not have permission to view this page.");
            window.location.href = 'dashboard.html';
        }
    }
}

// --- HELPER: Check Session ---
async function checkSession() {
    try {
        const token = JSON.parse(localStorage.getItem('token'));
        if (!token) throw new Error("No token found");
        
        const result = await api.checkSession(token);
        currentAccount = result.user;
        
        const userHeader = document.querySelector('.user-info');
        if (userHeader) {
            userHeader.innerHTML = `<h4>${currentAccount.username}</h4><p>${currentAccount.role_id === 1 ? 'Admin' : 'Staff'}</p>`;
        }

        await applyRoleBasedUI();
    } catch (err) {
        // DO NOT log out if it's just an offline network error!
        if (err.message && err.message.includes("Server unreachable")) {
            console.warn("Offline Mode: Retaining session. UI will update when reconnected.");
            const userHeader = document.querySelector('.user-info');
            if (userHeader) {
                userHeader.innerHTML = `<h4>Offline Mode</h4><p>Waiting for connection...</p>`;
            }
            return; // Stop execution here, keeping the token safe
        }

        // If it's a real Auth error (401/403)
        console.warn("Session check failed:", err.message);
        localStorage.removeItem('token');
        if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
            location.href = 'index.html';
        }
    }
}
function setupMultiDelete(listDivId, btnId, deleteApiCallback, refreshCallback) {
    const listDiv = document.querySelector(listDivId);
    const bulkBtn = document.querySelector(btnId);
    const countSpan = bulkBtn ? bulkBtn.querySelector('span') : null;

    if (!listDiv || !bulkBtn) return;

    // Helper to get selected IDs
    const getSelectedIds = () => {
        return Array.from(listDiv.querySelectorAll('.row-select:checked')).map(cb => cb.value);
    };

    // Update Button State
    const updateBtn = () => {
        const count = listDiv.querySelectorAll('.row-select:checked').length;
        if (count > 0) {
            bulkBtn.style.display = 'flex'; // or block/inline-flex
            if(countSpan) countSpan.innerText = count;
        } else {
            bulkBtn.style.display = 'none';
        }
    };

    // Event Delegation for Checkboxes
    listDiv.addEventListener('change', (e) => {
        if (e.target.classList.contains('select-all')) {
            const checkboxes = listDiv.querySelectorAll('.row-select');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
            updateBtn();
        } else if (e.target.classList.contains('row-select')) {
            updateBtn();
            // Uncheck "select all" if one is unchecked
            if(!e.target.checked) {
                const selectAll = listDiv.querySelector('.select-all');
                if(selectAll) selectAll.checked = false;
            }
        }
    });

    // Handle Delete Click
    bulkBtn.addEventListener('click', async () => {
        const ids = getSelectedIds();
        if (ids.length === 0) return;

        // --- NEW: Require Reason ---
        const reason = prompt(`Please provide a reason for deleting these ${ids.length} items (Required):`);
        if (!reason || reason.trim() === "") {
            alert("Deletion cancelled: A reason is required for the Audit Log.");
            return;
        }

        if (await customConfirm(`Are you sure you want to delete ${ids.length} items? This cannot be undone.`)) {
            const token = JSON.parse(localStorage.getItem('token'));
            try {
                // Pass the reason to the API callback
                await Promise.all(ids.map(id => deleteApiCallback(id, token, reason)));
                
                alert("Selected items deleted.");
                bulkBtn.style.display = 'none';
                refreshCallback(); // Reload table
            } catch (err) {
                alert("Some items could not be deleted: " + err.message);
                refreshCallback();
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {

    if (typeof flatpickr !== 'undefined') {
        
        // 1. Documents Page
        flatpickr('#document-expiry', {
            dateFormat: "Y-m-d",
            allowInput: true,
            placeholder: "Select expiry date..." // Adds the placeholder
        });

        // 2. Reports Page (Linked Pickers to prevent invalid ranges)
        const repStartInput = document.querySelector('#rep-start');
        const repEndInput = document.querySelector('#rep-end');
        if (repStartInput && repEndInput) {
            const repEndPicker = flatpickr(repEndInput, {
                dateFormat: "Y-m-d",
                allowInput: true,
                placeholder: "Select end date..."
            });

            flatpickr(repStartInput, {
                dateFormat: "Y-m-d",
                allowInput: true,
                placeholder: "Select start date...",
                onChange: function(selectedDates, dateStr) {
                    if (selectedDates.length > 0) {
                        repEndPicker.set('minDate', dateStr); // Prevent picking end date before start date
                        
                        // If current end date is before new start date, auto-adjust it
                        if (repEndPicker.selectedDates.length > 0 && repEndPicker.selectedDates[0] < selectedDates[0]) {
                            repEndPicker.setDate(dateStr);
                        }
                    } else {
                        repEndPicker.set('minDate', null);
                    }
                }
            });
        }

        // 3. Sales Page (Auto-add 6 days)
        const saleEndDateInput = document.querySelector('#sale-end-date');
        const saleStartDateInput = document.querySelector('#sale-start-date');
        let saleEndPicker;
        
        if (saleEndDateInput) {
            saleEndPicker = flatpickr(saleEndDateInput, {
                dateFormat: "Y-m-d",
                placeholder: "Auto-calculated...",
                clickOpens: false, // Prevents user from clicking it since it's auto-calculated
                disableMobile: true 
            });
            // Force readonly so user can't type in it
            saleEndDateInput.setAttribute('readonly', 'readonly'); 
        }

        if (saleStartDateInput) {
            flatpickr(saleStartDateInput, {
                dateFormat: "Y-m-d",
                allowInput: true,
                placeholder: "Select start date...",
                onChange: function(selectedDates, dateStr) {
                    if (selectedDates.length > 0 && saleEndPicker) {
                        const startDate = selectedDates[0];
                        const endDate = new Date(startDate);
                        endDate.setDate(startDate.getDate() + 6);
                        saleEndPicker.setDate(endDate); 
                    }
                }
            });
        }
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker Registered!', reg.scope))
            .catch(err => console.log('Service Worker Registration Failed:', err));
    }

    let socket;
    if (typeof io !== 'undefined') {
        socket = io();
        window.socket = socket; // Save for reconnection logic
        
        // 1. Inventory Listener
        if (document.querySelector('#inventory-list')) {
            socket.on('inventory_update', () => {
                loadPaginatedData(api.getAllInventory, render.renderInventoryTable, document.querySelector('#inventory-list'), document.querySelector('.pagination'), 'inventoryPage', 'inventorySearch', 'inventoryCategory', 'inventorySort');
                if(document.querySelector('.dashboard-table')) {
                     api.getLowStockItems(JSON.parse(localStorage.getItem('token')))
                        .then(data => render.renderLowStockWidget(data, document.querySelector('.dashboard-table')));
                }
            });
        }
        
        // 2. Dashboard Listener (Stats)
        if (document.querySelector('.overview-grid')) {
            const updateDashboard = async () => {
                const token = JSON.parse(localStorage.getItem('token'));
                const stats = await api.getDashboardStats(token);
                document.getElementById('stat-low-stock').innerText = stats.lowStockCount;
                document.getElementById('stat-sales').innerText = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: "compact" }).format(stats.salesMonthTotal);
                document.getElementById('stat-sellers').innerText = stats.sellerCount;
            };

            socket.on('inventory_update', updateDashboard);
            socket.on('sales_update', updateDashboard);
            socket.on('seller_update', updateDashboard);
        }

        // 3. Sales Listener
        if (document.querySelector('#sales-list')) {
            socket.on('sales_update', () => {
                loadPaginatedData(api.getAllSales, render.renderSalesTable, document.querySelector('#sales-list'), document.querySelector('.pagination'), 'salesPage', 'salesSearch', 'salesSort');
            });
        }

        // 4. Sellers Listener
        if (document.querySelector('#seller-list')) {
            socket.on('seller_update', () => {
                loadPaginatedData(api.getAllSellers, render.renderSellersTable, document.querySelector('#seller-list'), document.querySelector('.pagination'), 'sellerPage', 'sellerSearch', 'sellerCategory');
            });
        }
        
        // 5. RTS Listener
        if (document.querySelector('#rts-list')) {
            socket.on('rts_update', () => {
                loadPaginatedData(api.getAllRTS, render.renderRTSTable, document.querySelector('#rts-list'), document.querySelector('.pagination'), 'rtsPage', 'rtsSearch', 'rtsStatus', 'rtsSort');
            });
        }
    } else {
        console.warn("Socket.io library not loaded. Server might be offline.");
    }

    

    
    
    // 1. SESSION CHECK (Skip on login page)
    if (!window.location.pathname.endsWith('index.html')) {
        await checkSession();
    }

    function initAutoLogout() {
        const TIMEOUT_MS = 30 * 60 * 1000; 
        let logoutTimer;
        let sessionExpiryTime = Date.now() + TIMEOUT_MS;

        const resetTimer = () => {
            sessionExpiryTime = Date.now() + TIMEOUT_MS;
            clearTimeout(logoutTimer);
            logoutTimer = setTimeout(() => {
                alert("Session expired due to inactivity.");
                localStorage.removeItem('token');
                location.href = 'index.html';
            }, TIMEOUT_MS);
        };

        // Events that count as "activity"
        window.onload = resetTimer;
        document.onmousemove = resetTimer;
        document.onkeypress = resetTimer;
        document.ontouchstart = resetTimer; 
        document.onclick = resetTimer;
        document.onscroll = resetTimer;

        // --- NEW: Visual Countdown Updater ---
        setInterval(() => {
            const elSession = document.getElementById('timer-session');
            if (elSession) {
                const timeLeft = Math.max(0, sessionExpiryTime - Date.now());
                const m = Math.floor((timeLeft / 1000 / 60) % 60).toString().padStart(2, '0');
                const s = Math.floor((timeLeft / 1000) % 60).toString().padStart(2, '0');
                elSession.innerText = `${m}:${s}`;
                
                // Turn red if under 5 minutes
                if (timeLeft < 300000) elSession.style.color = '#dc2626';
                else elSession.style.color = '#16a34a'; // Green otherwise
            }
        }, 1000);
    }

    // Call this if the user is logged in
    if (localStorage.getItem('token')) {
        initAutoLogout();
    }

    const testEmailBtn = document.getElementById('test-email-btn');
    if (testEmailBtn) {
        testEmailBtn.addEventListener('click', async () => {
            if (!(await customConfirm("Send a test email summary of all documents to the Admin?"))) return;

            // 1. Get Token
            let token = localStorage.getItem('token');

            if (!token) {
                alert("You are not logged in (Token missing).");
                window.location.href = 'index.html';
                return;
            }

            // 2. Clean Token (Remove potential extra quotes that cause 401 errors)
            token = token.replace(/^"|"$/g, '');

            const originalText = testEmailBtn.innerHTML;
            testEmailBtn.innerText = "Sending...";
            testEmailBtn.disabled = true;

            try {
                // 3. Send Request
                const response = await fetch('/api/notifications/test-run', {
                    method: 'GET',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                // 4. Handle Response
                if (response.status === 401) {
                    alert("Session expired. Please log out and log in again.");
                    return;
                }

                const result = await response.json();

                if (result.success) {
                    alert(`Success! Email sent. Check your inbox.`);
                } else {
                    alert(`Error: ${result.data || 'Failed to send'}`);
                }
            } catch (error) {
                console.error(error);
                alert("System error. Check console.");
            } finally {
                testEmailBtn.innerHTML = originalText;
                testEmailBtn.disabled = false;
            }
        });
    }

    setupMultiDelete(
        '#inventory-list', 
        '#bulk-delete-btn', 
        api.deleteInventory, 
        () => loadPaginatedData(api.getAllInventory, render.renderInventoryTable, document.querySelector('#inventory-list'), document.querySelector('.pagination'), 'inventoryPage', 'inventorySearch')
    );
    setupMultiDelete(
        '#account-list', 
        '#bulk-delete-btn', 
        api.deleteAccount, 
        () => loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, document.querySelector('#account-list'), document.querySelector('.pagination'), 'accountPage', 'accountSearch')
    );
    setupMultiDelete(
        '#seller-list', 
        '#bulk-delete-btn', 
        api.deleteSeller, 
        () => loadPaginatedData(api.getAllSellers, render.renderSellersTable, document.querySelector('#seller-list'), document.querySelector('.pagination'), 'sellerPage', 'sellerSearch')
    );
    setupMultiDelete(
        '#rts-list', 
        '#bulk-delete-btn', 
        api.deleteRTS, 
        () => loadPaginatedData(api.getAllRTS, render.renderRTSTable, document.querySelector('#rts-list'), document.querySelector('.pagination'), 'rtsPage', 'rtsSearch')
    );
    setupMultiDelete(
        '#sales-list', 
        '#bulk-delete-btn', 
        api.deleteSale, 
        () => loadPaginatedData(api.getAllSales, render.renderSalesTable, document.querySelector('#sales-list'), document.querySelector('.pagination'), 'salesPage', 'salesSearch')
    );
    setupMultiDelete(
        '#document-list', 
        '#bulk-delete-btn', 
        api.deleteDocument, 
        () => loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable,  document.querySelector('#document-list'), document.querySelector('.pagination'), 'documentPage', 'documentSearch')
    );


    // ============================================================
    // AUTHENTICATION (Login / Logout)
    // ============================================================
    const loginForm = document.querySelector('#login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const credentials = {
                email: loginForm.querySelector('#login-email').value.trim(),
                password: loginForm.querySelector('#login-password').value.trim()
            };
            try {
                const data = await api.loginAccount(credentials);
                localStorage.setItem('token', JSON.stringify(data.token));
                location.href = 'dashboard.html';
            } catch (err) {
                alert(`Login Failed: ${err.message}`);
            }
        });
    }

    const logoutBtn = document.querySelector('#logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('token');
                location.href = 'index.html';
            }
        });
    }

    // --- FORGOT PASSWORD LOGIC (Index Page) ---
    const fpLink = document.querySelector('.login-options a');
    const fpModal = document.querySelector('#forgot-password-modal');
    
    if (fpLink && fpModal) {
        const step1 = document.querySelector('#fp-step-1');
        const step2 = document.querySelector('#fp-step-2');
        const closeBtn = document.querySelector('#close-fp-modal');

        fpLink.addEventListener('click', (e) => {
            e.preventDefault();
            fpModal.style.display = 'flex';
            step1.style.display = 'block';
            step2.style.display = 'none';
        });

        closeBtn.addEventListener('click', () => fpModal.style.display = 'none');
        window.addEventListener('click', (e) => {
            if(e.target == fpModal) fpModal.style.display = 'none';
        });

        // Step 1: Check Email
        step1.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.querySelector('#fp-email').value;
            try {
                const question = await api.getSecurityQuestion(email);
                document.querySelector('#fp-question-display').innerText = question;
                step1.style.display = 'none';
                step2.style.display = 'block';
            } catch (err) {
                alert(err.message);
            }
        });

        // Step 2: Reset
        step2.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.querySelector('#fp-email').value;
            const answer = document.querySelector('#fp-answer').value;
            const newPassword = document.querySelector('#fp-new-pass').value;

            try {
                await api.resetPassword({ email, answer, newPassword });
                alert("Password reset successfully! You can now log in.");
                fpModal.style.display = 'none';
                // Clear forms
                step1.reset();
                step2.reset();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    // ============================================================
    // MODULE: ACCOUNTS
    // ============================================================
    const accountListDiv = document.querySelector('#account-list');
    if (accountListDiv) {
        const paginationDiv = document.querySelector('.pagination');
        const roleFilter = document.getElementById('account-role-filter');
        const accountSortFilter = document.getElementById('account-sort'); // Add this

        // Add this new listener block:
        if (accountSortFilter) {
            accountSortFilter.addEventListener('change', (e) => {
                state.accountSort = e.target.value;
                state.accountPage = 1;
                loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage', 'accountSearch', 'accountRole', 'accountSort');
            });
        }

        // 1. UPDATE INITIAL LOAD to include 'accountRole'
        loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage', 'accountSearch', 'accountRole', 'accountSort');

        // 2. UPDATE SEARCH LISTENER to include 'accountRole'
        const searchInput = document.querySelector('.search-box input');
        if(searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                state.accountSearch = e.target.value.trim();
                state.accountPage = 1;
                loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage', 'accountSearch', 'accountRole', 'accountSort');
            }, 500));
        }

        // 3. ADD FILTER LISTENER
        if(roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                state.accountRole = e.target.value;
                state.accountPage = 1;
                loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage', 'accountSearch', 'accountRole', 'accountSort');
            });
        }

        // Event Delegation
        accountListDiv.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            if (!row) return;
            const id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            // Edit
            if (e.target.classList.contains('edit-btn')) {
                const accountForm = document.querySelector('#account-form');
                if(accountForm) {
                    const acc = await api.getAccount(id, token);
                    accountForm.querySelector('#account-id').value = acc.id;
                    accountForm.querySelector('#account-username').value = acc.username;
                    accountForm.querySelector('#account-email').value = acc.email;
                    accountForm.querySelector('#account-role').value = acc.role_id;
                    accountForm.querySelector('#account-password').value = "";
                    
                    // --- NEW: Disable Role if editing self ---
                    const roleSelect = accountForm.querySelector('#account-role');
                    if (Number(id) === Number(currentAccount.id)) {
                        roleSelect.disabled = true;
                        roleSelect.title = "You cannot change your own role.";
                    } else {
                        roleSelect.disabled = false;
                        roleSelect.title = "";
                    }

                    document.querySelector('#form-title').innerText = "Update Account";
                    accountForm.style.display = "block";
                    document.querySelector('#cancel-account-btn').style.display = "block";
                }
            }
            // Delete
            if (e.target.classList.contains('delete-btn')) {
                // --- NEW: Require Reason for Deletion ---
                const reason = prompt("Please provide a reason for deleting this staff account (Required):");
                if (reason === null || reason.trim() === "") {
                    alert("Deletion cancelled: Reason is required for the Audit Log.");
                    return;
                }

                if (await customConfirm("Delete this account?")) {
                    await api.deleteAccount(id, token, reason);
                    loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage');
                }
            }
            // Disable/Enable
            if (e.target.classList.contains('disable-btn')) {
                if (await customConfirm("Disable this account?")) {
                    await api.disableAccount(id, token);
                    loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage');
                }
            }
            if (e.target.classList.contains('enable-btn')) {
                if (await customConfirm("Enable this account?")) {
                    await api.enableAccount(id, token);
                    loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage');
                }
            }
        });

        // Form Handling
        const createAccountBtn = document.querySelector('#create-account-btn');
        const accountForm = document.querySelector('#account-form');
        const cancelAccountBtn = document.querySelector('#cancel-account-btn');

        if (createAccountBtn) {
            createAccountBtn.addEventListener('click', () => {
                accountForm.reset();
                accountForm.querySelector('#account-id').value = "";
                
                // --- NEW: Re-enable role select for new accounts ---
                const roleSelect = accountForm.querySelector('#account-role');
                if(roleSelect) roleSelect.disabled = false;

                document.querySelector('#form-title').innerText = "Create New Account";
                accountForm.style.display = "block";
                cancelAccountBtn.style.display = "block";
            });
        }
        if (cancelAccountBtn) {
            cancelAccountBtn.addEventListener('click', () => {
                accountForm.style.display = "none";
                cancelAccountBtn.style.display = "none";
            });
        }
        if (accountForm) {
            accountForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const data = {
                    username: accountForm.querySelector('#account-username').value.trim() || null,
                    email: accountForm.querySelector('#account-email').value.trim() || null,
                    role_id: accountForm.querySelector('#account-role').value || null,
                    password: accountForm.querySelector('#account-password').value.trim() || null
                    // Removed security_question & security_answer
                };
                const id = accountForm.querySelector('#account-id').value;
                const token = JSON.parse(localStorage.getItem('token'));

                try {
                    if (id) {
                        await api.updateAccount(data, token, id);
                        alert("Updated successfully");
                    } else {
                        await api.createAccount(data, token);
                        alert("Created successfully");
                    }
                    accountForm.style.display = "none";
                    loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage');
                } catch (err) {
                    alert(err.message);
                }
            });
        }
    }

    // ============================================================
    // MODULE: INVENTORY
    // ============================================================
    const inventoryListDiv = document.querySelector('#inventory-list');
    if (inventoryListDiv) {
        // Note: inventory.html usually has a different class for pagination
        const paginationDiv = document.querySelector('.inventory-pagination') || document.querySelector('.pagination');
        
        const catFilter = document.getElementById('inv-category-filter');
        const sortFilter = document.getElementById('inv-sort');

        // A. POPULATE CATEGORY DROPDOWN
        if(catFilter) {
            try {
                const token = JSON.parse(localStorage.getItem('token'));
                const cats = await api.getAllInventoryCategories(token, 1, true); // fetchAll=true
                cats.data.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.innerText = c.name;
                    catFilter.appendChild(opt);
                });
            } catch(e) { console.error("Failed to load category filter", e); }
            
            // Listener
            catFilter.addEventListener('change', (e) => {
                state.inventoryCategory = e.target.value;
                state.inventoryPage = 1;
                loadPaginatedData(api.getAllInventory, render.renderInventoryTable, inventoryListDiv, paginationDiv, 'inventoryPage', 'inventorySearch', 'inventoryCategory', 'inventorySort');
            });
        }

        // B. SORT LISTENER
        if(sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                state.inventorySort = e.target.value;
                state.inventoryPage = 1;
                loadPaginatedData(api.getAllInventory, render.renderInventoryTable, inventoryListDiv, paginationDiv, 'inventoryPage', 'inventorySearch', 'inventoryCategory', 'inventorySort');
            });
        }

        // C. UPDATE INITIAL LOAD (Add the new keys)
        loadPaginatedData(api.getAllInventory, render.renderInventoryTable, inventoryListDiv, paginationDiv, 'inventoryPage', 'inventorySearch', 'inventoryCategory', 'inventorySort');

        // Search Listener
        const searchInput = document.querySelector('.inventory-search-filter input'); // Uses the specific wrapper class
        if(searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                state.inventorySearch = e.target.value.trim();
                state.inventoryPage = 1;
                loadPaginatedData(api.getAllInventory, render.renderInventoryTable, inventoryListDiv, paginationDiv, 'inventoryPage', 'inventorySearch');
            }, 500));
        }


        // Delete/Edit Logic
        inventoryListDiv.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            if(!row) return;

            const isInteractiveElem = e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('.action-buttons');
            if (!isInteractiveElem) {
                const editBtn = row.querySelector('.edit-btn');
                if (editBtn) editBtn.click();
                return;
            }

            const id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            if(e.target.classList.contains('delete-btn')) {
                // --- NEW: Require Reason ---
                const reason = prompt("Please provide a reason for deletion (Required):");
                if (!reason || reason.trim() === "") {
                    alert("Deletion cancelled: A reason is required for the Audit Log.");
                    return;
                }

                if (await customConfirm("Delete this item?")) {
                    await api.deleteInventory(id, token, reason); // Pass reason here!
                    loadPaginatedData(api.getAllInventory, render.renderInventoryTable, inventoryListDiv, paginationDiv, 'inventoryPage');
                }
            }
            if(e.target.classList.contains('edit-btn')) {
                const inventoryForm = document.querySelector('#inventory-form');
                const item = await api.getInventory(id, token);
                
                try {
                    const catRes = await api.getAllInventoryCategories(token, 1, true);
                    const select = inventoryForm.querySelector('#inventory-category');
                    select.innerHTML = '<option value="" disabled selected>Select Category...</option>';
                    catRes.data.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id;
                        opt.innerText = c.name;
                        select.appendChild(opt);
                    });
                } catch(e) { console.error(e); }
                
                inventoryForm.querySelector('#inventory-id').value = item.id;
                inventoryForm.querySelector('#inventory-name').value = item.name;
                inventoryForm.querySelector('#inventory-category').value = item.category_id;
                inventoryForm.querySelector('#inventory-quantity').value = item.quantity;
                inventoryForm.querySelector('#inventory-minstock').value = item.min_stock_level;
                
                // --- NEW: Show Image Preview ---
                const imgPreview = inventoryForm.querySelector('.inventory-image-preview');
                if (imgPreview) {
                    if (item.image_url) {
                        imgPreview.src = item.image_url;
                        imgPreview.style.display = 'block';
                    } else {
                        imgPreview.style.display = 'none';
                    }
                }
                
                document.querySelector('#form-title').innerText = "Edit Inventory Item";
                inventoryForm.style.display = "block";
                document.querySelector('#cancel-inventory-btn').style.display = "block";
                inventoryForm.scrollIntoView({ behavior: 'smooth' }); // Scroll down to form
            }
        });

        

        // Inventory Form
        const inventoryForm = document.querySelector('#inventory-form');
        const createInventoryBtn = document.querySelector('#create-inventory-btn');
        const cancelInventoryBtn = document.querySelector('#cancel-inventory-btn');

        if(createInventoryBtn) {
            createInventoryBtn.addEventListener('click', async () => { // Make async
                inventoryForm.reset();
                inventoryForm.querySelector('#inventory-id').value = "";
                
                // --- NEW: POPULATE DROPDOWN ---
                try {
                    const token = JSON.parse(localStorage.getItem('token'));
                    const catRes = await api.getAllInventoryCategories(token, 1, true); // fetchAll
                    const select = inventoryForm.querySelector('#inventory-category');
                    select.innerHTML = '<option value="" disabled selected>Select Category...</option>';
                    catRes.data.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id;
                        opt.innerText = c.name;
                        select.appendChild(opt);
                    });
                } catch(e) { console.error(e); }
                // -----------------------------

                inventoryForm.style.display = "block";
                cancelInventoryBtn.style.display = "block";
            });
        }
        if(cancelInventoryBtn) {
            cancelInventoryBtn.addEventListener('click', () => {
                inventoryForm.style.display = "none";
                cancelInventoryBtn.style.display = "none";
            });
        }
        if(inventoryForm) {
            inventoryForm.querySelector('#inventory-staff-id').value = currentAccount.id;
            inventoryForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData();

                const name = inventoryForm.querySelector('#inventory-name').value
                if(name) formData.append('name', name);

                const category_id = inventoryForm.querySelector('#inventory-category').value
                if(category_id) formData.append('category_id', category_id);

                const quantity = inventoryForm.querySelector('#inventory-quantity').value
                if(quantity) formData.append('quantity', quantity);

                const min_stock_level = inventoryForm.querySelector('#inventory-minstock').value
                if(min_stock_level) formData.append('min_stock_level', min_stock_level);

                const staff_id = inventoryForm.querySelector('#inventory-staff-id').value
                if(staff_id)formData.append('staff_id', staff_id);
                
                const fileInput = inventoryForm.querySelector('#inventory-image');
                if(fileInput.files[0]) formData.append('image', fileInput.files[0]);

                const id = inventoryForm.querySelector('#inventory-id').value;
                const token = JSON.parse(localStorage.getItem('token'));

                try {
                    if(id) {
                        await api.updateInventory(formData, id, token);
                        alert("Item updated");
                    } else {
                        await api.createInventory(formData, token);
                        alert("Item created");
                    }
                    inventoryForm.style.display = "none";
                    loadPaginatedData(api.getAllInventory, render.renderInventoryTable, inventoryListDiv, paginationDiv, 'inventoryPage');
                } catch(err) {
                    alert(err.message);
                }
            });
        }

        // --- Categories Modal Logic ---
        const catListDiv = document.querySelector('#inventory-category-list');
        const manageCatBtn = document.querySelector('#create-inventory-category-btn');
        const catModal = document.querySelector('#category-modal');
        const closeCatModal = document.querySelector('.close-modal');
        const catForm = document.querySelector('#inventory-category-form');

        if(catListDiv && manageCatBtn) {
            const catPagination = document.querySelector('.category-pagination');

            // 1. Open Modal
            manageCatBtn.addEventListener('click', () => {
                catModal.style.display = 'flex';
                // Load data when modal opens
                loadPaginatedData(api.getAllInventoryCategories, render.renderInventoryCategoriesTable, catListDiv, catPagination, 'inventoryCatPage');
            });

            // 2. Close Modal
            closeCatModal.addEventListener('click', () => {
                catModal.style.display = 'none';
                // Also refresh main inventory list in case categories changed (optional)
                loadPaginatedData(api.getAllInventory, render.renderInventoryTable, inventoryListDiv, paginationDiv, 'inventoryPage');
            });

            // Close on click outside
            window.addEventListener('click', (e) => {
                if (e.target == catModal) {
                    catModal.style.display = 'none';
                    loadPaginatedData(api.getAllInventory, render.renderInventoryTable, inventoryListDiv, paginationDiv, 'inventoryPage');
                }
            });

            // 3. Delete Category Logic
            catListDiv.addEventListener('click', async (e) => {
                const row = e.target.closest('tr');
                if(!row) return;
                const id = row.dataset.id;
                const token = JSON.parse(localStorage.getItem('token'));
                
                // DELETE
                if(e.target.classList.contains('delete-btn')) {
                    if (await customConfirm("Delete this category? Items in this category might lose their association.")) {
                        try {
                            await api.deleteInventoryCategory(id, token);
                            loadPaginatedData(api.getAllInventoryCategories, render.renderInventoryCategoriesTable, catListDiv, catPagination, 'inventoryCatPage');
                        } catch(err) { alert(err.message); }
                    }
                }

                // EDIT (NEW)
                if(e.target.classList.contains('edit-btn')) {
                    const cells = row.querySelectorAll('td');
                    catForm.querySelector('#cat-id').value = id;
                    catForm.querySelector('#cat-name').value = cells[0].innerText;
                    catForm.querySelector('#cat-desc').value = cells[1].innerText;
                    document.getElementById('cat-form-title').innerText = "Edit Category";
                }
            });

            // Replace the old catForm.addEventListener with this:
            if(catForm) {
                catForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const id = catForm.querySelector('#cat-id').value;
                    const name = catForm.querySelector('#cat-name').value;
                    const desc = catForm.querySelector('#cat-desc').value;
                    const token = JSON.parse(localStorage.getItem('token'));

                    try {
                        if (id) {
                            await api.updateInventoryCategory(id, { name, description: desc }, token);
                            alert("Category updated.");
                        } else {
                            await api.createInventoryCategory({ name, description: desc }, token);
                            alert("Category created.");
                        }
                        
                        // Reset form back to Add mode
                        catForm.reset();
                        catForm.querySelector('#cat-id').value = "";
                        document.getElementById('cat-form-title').innerText = "Add New Category";
                        
                        loadPaginatedData(api.getAllInventoryCategories, render.renderInventoryCategoriesTable, catListDiv, catPagination, 'inventoryCatPage');
                    } catch(err) {
                        alert(err.message);
                    }
                });
            }
        }
    }

    // ============================================================
    // MODULE: SELLERS
    // ============================================================
    const sellerListDiv = document.querySelector('#seller-list');
    if (sellerListDiv) {
        const paginationDiv = document.querySelector('.pagination');
        const sellerCatFilter = document.getElementById('seller-cat-filter');
        const sellerSortFilter = document.getElementById('seller-sort'); // Add this

        // Add this new listener block:
        if (sellerSortFilter) {
            sellerSortFilter.addEventListener('change', (e) => {
                state.sellerSort = e.target.value;
                state.sellerPage = 1;
                loadPaginatedData(api.getAllSellers, render.renderSellersTable, sellerListDiv, paginationDiv, 'sellerPage', 'sellerSearch', 'sellerCategory', 'sellerSort');
            });
        }

        // 1. UPDATE INITIAL LOAD
        loadPaginatedData(api.getAllSellers, render.renderSellersTable, sellerListDiv, paginationDiv, 'sellerPage', 'sellerSearch', 'sellerCategory', 'sellerSort');

        // 2. FILTER LISTENER
        if(sellerCatFilter) {
            sellerCatFilter.addEventListener('change', (e) => {
                state.sellerCategory = e.target.value;
                state.sellerPage = 1;
                loadPaginatedData(api.getAllSellers, render.renderSellersTable, sellerListDiv, paginationDiv, 'sellerPage', 'sellerSearch', 'sellerCategory', 'sellerSort');
            });
        }

        const searchInput = document.querySelector('.search-box input');
        if(searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                state.sellerSearch = e.target.value.trim();
                state.sellerPage = 1;
                loadPaginatedData(api.getAllSellers, render.renderSellersTable, sellerListDiv, paginationDiv, 'sellerPage', 'sellerSearch', 'sellerCategory', 'sellerSort');
            }, 500));
        }

        sellerListDiv.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            if (!row) return;

            const isInteractiveElem = e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('.action-buttons');
            if (!isInteractiveElem) {
                const editBtn = row.querySelector('.edit-btn');
                if (editBtn) editBtn.click();
                return;
            }

            const id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            // DELETE ACTION
            if (e.target.classList.contains('delete-btn')) {
                const reason = prompt("Please provide a reason for deletion (Required):");
                if (!reason || reason.trim() === "") {
                    alert("Deletion cancelled: A reason is required for the Audit Log.");
                    return;
                }

                if (await customConfirm("Are you sure you want to delete this seller?")) {
                    try {
                        await api.deleteSeller(id, token, reason);
                        alert("Seller deleted successfully.");
                        loadPaginatedData(api.getAllSellers, render.renderSellersTable, sellerListDiv, paginationDiv, 'sellerPage');
                    } catch (err) {
                        alert(err.message);
                    }
                }
            }

            // EDIT ACTION
            if (e.target.classList.contains('edit-btn')) {
                try {
                    const seller = await api.getSeller(id, token);
                    const sellerForm = document.querySelector('#seller-form');
                    
                    // Populate Form
                    sellerForm.querySelector('#seller-id').value = seller.id;
                    sellerForm.querySelector('#seller-name').value = seller.name;
                    sellerForm.querySelector('#seller-category').value = seller.category;
                    sellerForm.querySelector('#seller-platform').value = seller.platform_name;
                    sellerForm.querySelector('#seller-contact').value = seller.contact_num;
                    sellerForm.querySelector('#seller-email').value = seller.email;
                    
                    // Handle Image Preview
                    const imgPreview = sellerForm.querySelector('.seller-image-preview');
                    if (seller.image_path) {
                        imgPreview.src = seller.image_path;
                        imgPreview.style.display = 'block';
                    } else {
                        imgPreview.style.display = 'none';
                    }

                    // Update Title & Show
                    document.querySelector('#form-title').innerText = "Edit Seller";
                    sellerForm.style.display = "block";
                    document.querySelector('#cancel-seller-btn').style.display = "block";
                    
                    // Scroll to form
                    sellerForm.scrollIntoView({ behavior: 'smooth' });
                } catch (err) {
                    alert("Failed to fetch seller details: " + err.message);
                }
            }
        });

        // --- Form Logic ---
        const sellerForm = document.querySelector('#seller-form');
        const createSellerBtn = document.querySelector('#create-seller-btn');
        const cancelSellerBtn = document.querySelector('#cancel-seller-btn');

        if(createSellerBtn) {
            createSellerBtn.addEventListener('click', () => {
                sellerForm.reset();
                sellerForm.querySelector('#seller-id').value = "";
                
                // Reset Image Preview
                const imgPreview = sellerForm.querySelector('.seller-image-preview');
                if(imgPreview) { 
                    imgPreview.src = ""; 
                    imgPreview.style.display = 'none'; 
                }

                document.querySelector('#form-title').innerText = "Add New Seller";
                sellerForm.style.display = "block";
                cancelSellerBtn.style.display = "block";
            });
        }
        if(cancelSellerBtn) {
            cancelSellerBtn.addEventListener('click', () => {
                sellerForm.style.display = "none";
                cancelSellerBtn.style.display = "none";
            });
        }
        if(sellerForm) {
            sellerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData();
                formData.append('name', sellerForm.querySelector('#seller-name').value);
                formData.append('category', sellerForm.querySelector('#seller-category').value);
                formData.append('platform_name', sellerForm.querySelector('#seller-platform').value);
                formData.append('contact_num', sellerForm.querySelector('#seller-contact').value);
                formData.append('email', sellerForm.querySelector('#seller-email').value);
                
                const fileInput = sellerForm.querySelector('#seller-image');
                if(fileInput.files[0]) formData.append('image', fileInput.files[0]);

                const id = sellerForm.querySelector('#seller-id').value;
                const token = JSON.parse(localStorage.getItem('token'));

                try {
                    if(id) {
                        await api.updateSeller(id, formData, token);
                        alert("Seller updated successfully");
                    } else {
                        await api.createSeller(formData, token);
                        alert("Seller created successfully");
                    }
                    sellerForm.style.display = "none";
                    if(cancelSellerBtn) cancelSellerBtn.style.display = "none";
                    loadPaginatedData(api.getAllSellers, render.renderSellersTable, sellerListDiv, paginationDiv, 'sellerPage');
                } catch(err) {
                    alert(err.message);
                }
            });
        }
    }

    // ============================================================
    // MODULE: RTS
    // ============================================================
    const rtsListDiv = document.querySelector('#rts-list');
    if (rtsListDiv) {
        const paginationDiv = document.querySelector('.pagination');
        const rtsStatusFilter = document.getElementById('rts-status-filter');
        const rtsSort = document.getElementById('rts-sort');

        // 1. UPDATE INITIAL LOAD
        loadPaginatedData(api.getAllRTS, render.renderRTSTable, rtsListDiv, paginationDiv, 'rtsPage', 'rtsSearch', 'rtsStatus', 'rtsSort');

        // 2. LISTENERS
        if(rtsStatusFilter) {
            rtsStatusFilter.addEventListener('change', (e) => {
                state.rtsStatus = e.target.value;
                state.rtsPage = 1;
                loadPaginatedData(api.getAllRTS, render.renderRTSTable, rtsListDiv, paginationDiv, 'rtsPage', 'rtsSearch', 'rtsStatus', 'rtsSort');
            });
        }
        if(rtsSort) {
            rtsSort.addEventListener('change', (e) => {
                state.rtsSort = e.target.value;
                state.rtsPage = 1;
                loadPaginatedData(api.getAllRTS, render.renderRTSTable, rtsListDiv, paginationDiv, 'rtsPage', 'rtsSearch', 'rtsStatus', 'rtsSort');
            });
        }

        const searchInput = document.querySelector('.search-box input');
        if(searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                state.rtsSearch = e.target.value.trim();
                state.rtsPage = 1;
                loadPaginatedData(api.getAllRTS, render.renderRTSTable, rtsListDiv, paginationDiv, 'rtsPage', 'rtsSearch');
            }, 500));
        }

        // --- NEW: Event Listener for Edit/Delete ---
        rtsListDiv.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            if(!row) return;

            const id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            // DELETE ACTION
            if(e.target.classList.contains('delete-btn')) {
                const reason = prompt("Please provide a reason for deletion (Required):");
                if (!reason || reason.trim() === "") {
                    alert("Deletion cancelled: A reason is required for the Audit Log.");
                    return;
                }

                if (await customConfirm("Are you sure you want to delete this record?")) {
                    try {
                        await api.deleteRTS(id, token, reason);
                        alert("Record deleted.");
                        loadPaginatedData(api.getAllRTS, render.renderRTSTable, rtsListDiv, paginationDiv, 'rtsPage');
                    } catch(err) {
                        alert(err.message);
                    }
                }
            }

            // EDIT ACTION
            if(e.target.classList.contains('edit-btn')) {
                const rtsForm = document.querySelector('#rts-form');
                
                try {
                    // 1. Fetch the RTS Record
                    const item = await api.getRTS(id, token);

                    // 2. Fetch Sellers (Needed for the dropdown)
                    const sellerRes = await api.getSellerDropdown(token); 
                    const select = rtsForm.querySelector('#rts-seller-id');
                    select.innerHTML = '<option value="">Select Seller</option>';
                    sellerRes.data.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.id;
                        opt.innerText = s.name;
                        select.appendChild(opt);
                    });

                    // 3. Populate Form
                    rtsForm.querySelector('#rts-id').value = item.id;
                    rtsForm.querySelector('#rts-tracking').value = item.tracking_no;
                    rtsForm.querySelector('#rts-seller-id').value = item.seller_id;
                    rtsForm.querySelector('#rts-product').value = item.product_name;
                    rtsForm.querySelector('#rts-customer').value = item.customer_name;
                    rtsForm.querySelector('#rts-desc').value = item.description;

                    const statusContainer = document.getElementById('rts-status-container');
                    const statusSelect = document.getElementById('rts-status');
                    if(statusContainer && statusSelect) {
                        statusContainer.style.display = 'block';
                        statusSelect.value = item.status || 'pending';
                    }

                    // 4. UI Updates
                    document.querySelector('#form-title').innerText = "Edit Returned Item";
                    rtsForm.style.display = "block";
                    const cancelBtn = document.querySelector('#cancel-rts-btn');
                    if(cancelBtn) cancelBtn.style.display = "block";
                    
                    rtsForm.scrollIntoView({ behavior: 'smooth' });

                } catch(err) {
                    alert("Error loading details: " + err.message);
                }
            }
        });

        // --- Form Logic ---
        const createRtsBtn = document.querySelector('#create-rts-btn');
        const rtsForm = document.querySelector('#rts-form');
        const cancelRtsBtn = document.querySelector('#cancel-rts-btn');
        
        if(createRtsBtn) {
            createRtsBtn.addEventListener('click', async () => {
                rtsForm.reset();
                rtsForm.querySelector('#rts-id').value = "";
                document.querySelector('#form-title').innerText = "Log Returned Item";
                
                // HIDE STATUS ON CREATE
                const statusContainer = document.getElementById('rts-status-container');
                if(statusContainer) statusContainer.style.display = 'none'; 
                
                // Load Sellers for Dropdown
                try {
                    const token = JSON.parse(localStorage.getItem('token'));
                    const sellerRes = await api.getSellerDropdown(token); 
                    const select = rtsForm.querySelector('#rts-seller-id');
                    select.innerHTML = '<option value="">Select Seller</option>';
                    sellerRes.data.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.id;
                        opt.innerText = s.name;
                        select.appendChild(opt);
                    });
                    
                    rtsForm.style.display = "block";
                    if(cancelRtsBtn) cancelRtsBtn.style.display = "block";
                } catch(err) {
                    alert("Could not load sellers: " + err.message);
                }
            });
        }

        if(cancelRtsBtn) {
            cancelRtsBtn.addEventListener('click', () => {
                rtsForm.style.display = 'none';
                cancelRtsBtn.style.display = 'none';
            });
        }
        
        if(rtsForm) {
            rtsForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const statusVal = document.getElementById('rts-status').value;
                
                const data = {
                    tracking_no: rtsForm.querySelector('#rts-tracking').value,
                    seller_id: rtsForm.querySelector('#rts-seller-id').value,
                    product_name: rtsForm.querySelector('#rts-product').value,
                    customer_name: rtsForm.querySelector('#rts-customer').value,
                    description: rtsForm.querySelector('#rts-desc').value,
                    status: statusVal // Add this line
                };
                const id = rtsForm.querySelector('#rts-id').value;
                const token = JSON.parse(localStorage.getItem('token'));

                try {
                    if(id) {
                        await api.updateRTS(id, data, token);
                        alert("Record updated successfully");
                    } else {
                        await api.createRTS(data, token);
                        alert("Record logged successfully");
                    }
                    rtsForm.style.display = "none";
                    if(cancelRtsBtn) cancelRtsBtn.style.display = "none";
                    loadPaginatedData(api.getAllRTS, render.renderRTSTable, rtsListDiv, paginationDiv, 'rtsPage');
                } catch(err) {
                    alert(err.message);
                }
            });
        }
    }

    // ============================================================
    // MODULE: AUDIT
    // ============================================================
    const auditListDiv = document.querySelector('#audit-list');
    if (auditListDiv) {
        const paginationDiv = document.querySelector('.pagination');
        const actionFilter = document.getElementById('audit-action-filter'); // <--- GET
        const sortFilter = document.getElementById('audit-sort');         // <--- GET

        // 1. UPDATE INITIAL LOAD
        loadPaginatedData(api.getAuditLogs, render.renderAuditLogTable, auditListDiv, paginationDiv, 'auditPage', 'auditSearch', 'auditAction', 'auditSort');

        // 2. UPDATE SEARCH LISTENER
        const searchInput = document.querySelector('#audit-search');
        if(searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                state.auditSearch = e.target.value.trim();
                state.auditPage = 1;
                loadPaginatedData(api.getAuditLogs, render.renderAuditLogTable, auditListDiv, paginationDiv, 'auditPage', 'auditSearch', 'auditAction', 'auditSort');
            }, 500));
        }

        // 3. ADD NEW LISTENERS
        if(actionFilter) {
            actionFilter.addEventListener('change', (e) => {
                state.auditAction = e.target.value;
                state.auditPage = 1;
                loadPaginatedData(api.getAuditLogs, render.renderAuditLogTable, auditListDiv, paginationDiv, 'auditPage', 'auditSearch', 'auditAction', 'auditSort');
            });
        }
        if(sortFilter) {
            sortFilter.addEventListener('change', (e) => {
                state.auditSort = e.target.value;
                state.auditPage = 1;
                loadPaginatedData(api.getAuditLogs, render.renderAuditLogTable, auditListDiv, paginationDiv, 'auditPage', 'auditSearch', 'auditAction', 'auditSort');
            });
        }
    }

    // ============================================================
    // MODULE: SALES
    // ============================================================
    const salesListDiv = document.querySelector('#sales-list');
    if (salesListDiv) {
        const paginationDiv = document.querySelector('.pagination') || document.createElement('div');
        if(!document.querySelector('.pagination')) {
            salesListDiv.parentNode.appendChild(paginationDiv);
            paginationDiv.className = 'pagination';
        }
        
        const salesSort = document.getElementById('sales-sort');

        // 1. UPDATE INITIAL LOAD
        loadPaginatedData(api.getAllSales, render.renderSalesTable, salesListDiv, paginationDiv, 'salesPage', 'salesSearch', 'salesSort');

        // 2. SORT LISTENER
        if(salesSort) {
            salesSort.addEventListener('change', (e) => {
                state.salesSort = e.target.value;
                state.salesPage = 1;
                loadPaginatedData(api.getAllSales, render.renderSalesTable, salesListDiv, paginationDiv, 'salesPage', 'salesSearch', 'salesSort');
            });
        }

        const searchInput = document.querySelector('.search-box input');
        if(searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                state.salesSearch = e.target.value.trim();
                state.salesPage = 1;
                loadPaginatedData(api.getAllSales, render.renderSalesTable, salesListDiv, paginationDiv, 'salesPage', 'salesSearch');
            }, 500));
        }

        // --- NEW: Add Event Listener for Edit/Delete ---
        salesListDiv.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            if (!row) return;

            const id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            // DELETE ACTION
            if (e.target.classList.contains('delete-btn')) {
                if (await customConfirm("Are you sure you want to delete this sales record?")) {
                    try {
                        await api.deleteSale(id, token);
                        alert("Record deleted successfully.");
                        loadPaginatedData(api.getAllSales, render.renderSalesTable, salesListDiv, paginationDiv, 'salesPage');
                    } catch (err) {
                        alert(err.message);
                    }
                }
            }

            // EDIT ACTION
            if (e.target.classList.contains('edit-btn')) {
                const saleForm = document.querySelector('#sale-form');
                
                // Populate Form with data stored in the row dataset (from render.js)
                saleForm.querySelector('#sale-id').value = id;
                saleForm.querySelector('#sale-start-date').value = row.dataset.startDate;
                saleForm.querySelector('#sale-end-date').value = row.dataset.endDate;
                saleForm.querySelector('#sale-amount').value = row.dataset.amount;
                saleForm.querySelector('#sale-notes').value = row.dataset.notes;

                // Update Title
                const formTitle = document.querySelector('#form-title');
                if(formTitle) formTitle.innerText = "Edit Sales Record";

                // Show Form
                saleForm.style.display = 'block';
                const cancelBtn = document.querySelector('#cancel-sale-btn');
                if(cancelBtn) cancelBtn.style.display = 'block';

                // Scroll to form (UX)
                saleForm.scrollIntoView({ behavior: 'smooth' });
            }
        });

        // --- Form Logic ---
        const createSaleBtn = document.querySelector('#create-sale-btn');
        const saleForm = document.querySelector('#sale-form');
        const cancelSaleBtn = document.querySelector('#cancel-sale-btn');

        if(createSaleBtn) {
            createSaleBtn.addEventListener('click', () => {
                saleForm.reset(); 
                saleForm.querySelector('#sale-id').value = ""; // Clear ID for new creation
                const formTitle = document.querySelector('#form-title');
                if(formTitle) formTitle.innerText = "Add New Sales Record";
                
                saleForm.style.display = 'block';
                if(cancelSaleBtn) cancelSaleBtn.style.display = 'block';
            });
        }

        if(cancelSaleBtn) {
            cancelSaleBtn.addEventListener('click', () => {
                saleForm.style.display = 'none';
                cancelSaleBtn.style.display = 'none';
            });
        }
            
        if(saleForm) {
            saleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const start = saleForm.querySelector('#sale-start-date').value;
                const end = saleForm.querySelector('#sale-end-date').value;

                // --- NEW: DATE VALIDATION ---
                if (new Date(start) > new Date(end)) {
                    alert("Error: Start Date cannot be after End Date.");
                    return; // Stop execution
                }
                // -----------------------------

                const id = saleForm.querySelector('#sale-id').value;
                const data = {
                    week_start_date: saleForm.querySelector('#sale-start-date').value,
                    week_end_date: saleForm.querySelector('#sale-end-date').value,
                    total_amount: saleForm.querySelector('#sale-amount').value,
                    notes: saleForm.querySelector('#sale-notes').value
                };
                const token = JSON.parse(localStorage.getItem('token'));
                try {
                    if(id) {
                        await api.updateSale(id, data, token);
                        alert("Sales record updated successfully");
                    } else {
                        await api.createSale(data, token);
                        alert("Sales record created successfully");
                    }
                    saleForm.style.display = 'none';
                    if(cancelSaleBtn) cancelSaleBtn.style.display = 'none';
                    loadPaginatedData(api.getAllSales, render.renderSalesTable, salesListDiv, paginationDiv, 'salesPage');
                } catch(err){ 
                    alert(err.message); 
                }
            });
        }
    }

    // ============================================================
    // MODULE: DOCUMENTS
    // ============================================================
    const documentListDiv = document.querySelector('#document-list');
    if (documentListDiv) {
        // Ensure pagination exists
        let paginationDiv = document.querySelector('.pagination');
        if(!paginationDiv) {
            paginationDiv = document.createElement('div');
            paginationDiv.className = 'pagination';
            documentListDiv.parentNode.appendChild(paginationDiv);
        }

        const docCatFilter = document.getElementById('doc-category-filter');
        const docSortFilter = document.getElementById('document-sort'); // Add this

        // Add this new listener block:
        if (docSortFilter) {
            docSortFilter.addEventListener('change', (e) => {
                state.documentSort = e.target.value;
                state.documentPage = 1;
                loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable, documentListDiv, paginationDiv, 'documentPage', 'documentSearch', 'documentCategory', 'documentSort');
            });
        }

        // 1. UPDATE INITIAL LOAD
        loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable, documentListDiv, paginationDiv, 'documentPage', 'documentSearch', 'documentCategory', 'documentSort');

        // 2. FILTER LISTENER
        if(docCatFilter) {
            docCatFilter.addEventListener('change', (e) => {
                state.documentCategory = e.target.value;
                state.documentPage = 1;
                loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable, documentListDiv, paginationDiv, 'documentPage', 'documentSearch', 'documentCategory', 'documentSort');
            });
        }

        const searchInput = document.querySelector('.search-box input');
        if(searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                state.documentSearch = e.target.value.trim();
                state.documentPage = 1;
                loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable, documentListDiv, paginationDiv, 'documentPage', 'documentSearch', 'documentCategory', 'documentSort');
            }, 500));
        }
            
        // --- NEW: Event Listener for Edit/Delete ---
        documentListDiv.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            if(!row) return;
            
            const isInteractiveElem = e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('.action-buttons');
            if (!isInteractiveElem) {
                const editBtn = row.querySelector('.real-edit-btn') || row.querySelector('.edit-btn');
                if (editBtn) editBtn.click();
                return;
            }

            const id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            // DELETE ACTION
            if(e.target.classList.contains('delete-btn')) {
                const reason = prompt("Please provide a reason for deletion (Required):");
                if (!reason || reason.trim() === "") {
                    alert("Deletion cancelled: A reason is required for the Audit Log.");
                    return;
                }

                if (await customConfirm("Are you sure you want to delete this document?")) {
                    try {
                        await api.deleteDocument(id, token, reason);
                        alert("Document deleted.");
                        loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable, documentListDiv, paginationDiv, 'documentPage');
                    } catch(err) {
                        alert(err.message);
                    }
                }
            }

            // EDIT ACTION (Targeting .real-edit-btn based on render.js or .edit-btn)
            if(e.target.classList.contains('real-edit-btn') || e.target.classList.contains('edit-btn')) {
                const docForm = document.querySelector('#document-form');
                
                // --- FIX: Shifted array indexes by +1 to account for the checkbox column ---
                const cells = row.querySelectorAll('td');
                const currentTitle = cells[1].textContent.trim();
                const currentCategory = cells[2].textContent.trim();
                const currentExpiry = cells[3].textContent.trim();

                // Populate Form
                docForm.querySelector('#document-id').value = id;
                docForm.querySelector('#document-title').value = currentTitle;
                docForm.querySelector('#document-category').value = currentCategory;
                docForm.querySelector('#document-expiry').value = currentExpiry;

                // UI Changes for Edit Mode
                document.querySelector('#form-title').innerText = "Edit Document Details";
                
                // Hide File Input (Backend doesn't support file update yet)
                const fileInputContainer = docForm.querySelector('#document-file').parentNode;
                if(fileInputContainer) fileInputContainer.style.display = 'none';

                // Show Form
                docForm.style.display = 'block';
                const cancelBtn = document.querySelector('#cancel-document-btn');
                if(cancelBtn) cancelBtn.style.display = 'block';
                
                docForm.scrollIntoView({ behavior: 'smooth' });
            }
        });

        // --- Form Logic ---
        const createDocBtn = document.querySelector('#create-document-btn');
        const docForm = document.querySelector('#document-form');
        const cancelDocBtn = document.querySelector('#cancel-document-btn');

        if(createDocBtn) {
            createDocBtn.addEventListener('click', ()=>{
                docForm.reset();
                docForm.querySelector('#document-id').value = ""; // Clear ID
                
                // UI Changes for Create Mode
                document.querySelector('#form-title').innerText = "Upload New Document";
                const fileInputContainer = docForm.querySelector('#document-file').parentNode;
                if(fileInputContainer) fileInputContainer.style.display = 'block'; // Show File Input

                docForm.style.display = 'block';
                if(cancelDocBtn) cancelDocBtn.style.display = 'block';
            });
        }

        if(cancelDocBtn) {
            cancelDocBtn.addEventListener('click', () => {
                docForm.style.display = 'none';
                cancelDocBtn.style.display = 'none';
            });
        }
            
        if(docForm) {
            docForm.addEventListener('submit', async (e)=>{
                e.preventDefault();
                const id = docForm.querySelector('#document-id').value;
                const token = JSON.parse(localStorage.getItem('token'));
                
                try {
                    if(id) {
                        // UPDATE (JSON)
                        const data = {
                            title: docForm.querySelector('#document-title').value,
                            category: docForm.querySelector('#document-category').value,
                            expiry_date: docForm.querySelector('#document-expiry').value
                        };
                        await api.updateDocument(id, data, token);
                        alert("Document updated successfully.");
                    } else {
                        // CREATE (FormData)
                        const formData = new FormData();
                        formData.append('title', docForm.querySelector('#document-title').value);
                        formData.append('category', docForm.querySelector('#document-category').value);
                        formData.append('expiry_date', docForm.querySelector('#document-expiry').value);
                        
                        const fileInput = docForm.querySelector('#document-file');
                        if(fileInput.files[0]) {
                            formData.append('document', fileInput.files[0]);
                        } else {
                            throw new Error("File is required for new documents.");
                        }

                        await api.createDocument(formData, token);
                        alert("Document uploaded successfully.");
                    }
                    docForm.style.display = 'none';
                    if(cancelDocBtn) cancelDocBtn.style.display = 'none';
                    loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable, documentListDiv, paginationDiv, 'documentPage');
                } catch(err){ 
                    alert(err.message); 
                }
            });
        }
    }

    // ============================================================
    // MODULE: DASHBOARD (Widgets)
    // ============================================================
    if (document.querySelector('.dashboard-table')) {
        try {
            const token = JSON.parse(localStorage.getItem('token'));
            
            // 1. Populate Low Stock Table
            const lowStock = await api.getLowStockItems(token);
            render.renderLowStockWidget(lowStock, document.querySelector('.dashboard-table'));
            
            // 2. Populate Stats Cards
            const stats = await api.getDashboardStats(token);
            
            const elLowStock = document.getElementById('stat-low-stock');
            const elSales = document.getElementById('stat-sales');
            const elSellers = document.getElementById('stat-sellers');
            const elChartTotal = document.querySelector('.chart-total');
            const elChartTotalLarge = document.querySelector('.chart-total-large');

            if(elLowStock) elLowStock.innerText = stats.lowStockCount;
            
            // Format Currency
            const peso = new Intl.NumberFormat('en-PH', { 
                style: 'currency', 
                currency: 'PHP', 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            if(elSales) elSales.innerText = peso.format(stats.salesMonthTotal);
            if(elSellers) elSellers.innerText = stats.sellerCount;
            
            // Apply the exact same raw formatting to the charts
            if(elChartTotal) elChartTotal.innerText = peso.format(stats.chart.grandTotal);
            if(elChartTotalLarge) elChartTotalLarge.innerText = peso.format(stats.chart.grandTotal);

            // 3. Render Line Chart
            const ctx = document.getElementById('salesChart');
            if(ctx) {
                new Chart(ctx, {
                    type: 'line', // Changed to Line
                    data: {
                        labels: stats.chart.labels,
                        datasets: [{
                            label: 'Monthly Sales',
                            data: stats.chart.data,
                            // Blue line style
                            borderColor: '#3b82f6', 
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 2,
                            tension: 0.4, // Smooth curve
                            pointBackgroundColor: '#fff',
                            pointBorderColor: '#3b82f6',
                            pointRadius: 4,
                            fill: true // Fill area under line
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false } // Hide legend for cleaner look
                        },
                        scales: {
                            y: { 
                                beginAtZero: true,
                                grid: { borderDash: [5, 5] }
                            },
                            x: {
                                grid: { display: false }
                            }
                        }
                    }
                });
            }

            function startSystemTimers() {
                const elEmail = document.getElementById('timer-email');
                const elAudit = document.getElementById('timer-audit');
                if (!elEmail || !elAudit) return;

                setInterval(() => {
                    const now = new Date();

                    // 1. Calculate next 8:00 AM (Email Alert)
                    let next8AM = new Date();
                    next8AM.setHours(8, 0, 0, 0);
                    if (now > next8AM) next8AM.setDate(next8AM.getDate() + 1); // If past 8am, set to tomorrow

                    // 2. Calculate next 12:00 AM (Midnight / Audit Cleanup)
                    let nextMidnight = new Date();
                    nextMidnight.setHours(24, 0, 0, 0); // Tonight at midnight

                    // Formatting function
                    const formatTimeDiff = (target) => {
                        const diff = target - now;
                        const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
                        const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
                        const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
                        return `${h}:${m}:${s}`;
                    };

                    elEmail.innerText = formatTimeDiff(next8AM);
                    elAudit.innerText = formatTimeDiff(nextMidnight);
                }, 1000);
            }
            
            // Start the timers immediately
            startSystemTimers();
        } catch(err) {
            console.error("Dashboard Error:", err);
        }
    }

    // ============================================================
    // MODULE: ARCHIVE
    // ============================================================
    if (document.body.classList.contains('archive-page')) {
        const moduleSelect = document.getElementById('archive-module-select');
        const tbody = document.querySelector('#archive-table tbody');
        const token = JSON.parse(localStorage.getItem('token'));

        // 1. Load Data Function
        const loadArchive = async () => {
            const module = moduleSelect.value;
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';
            try {
                // Call the API
                const response = await fetch(`/api/archive/${module}`, { 
                    headers: { 'Authorization': `Bearer ${token}` } 
                });
                const result = await response.json();
                
                if(!result.success) throw new Error(result.data);
                const data = result.data;

                tbody.innerHTML = ''; // Clear loading message

                if(data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: #6b7280;">Archive is empty for this category.</td></tr>';
                    return;
                }

                // Render Rows
                data.forEach(row => {
                    const tr = document.createElement('tr');
                    
                    // SECURITY FIX: We use data-attributes instead of onclick
                    tr.innerHTML = `
                        <td>${row.id}</td>
                        <td><strong>${sanitize(row.display_name || 'N/A')}</strong></td>
                        <td>${new Date(row.created_at).toLocaleString()}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn enable-btn btn-restore" data-module="${module}" data-id="${row.id}">Restore</button>
                                <button class="btn delete-btn btn-hard-delete" data-module="${module}" data-id="${row.id}">Hard Delete</button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (err) {
                console.error(err);
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Error loading data: ${err.message}</td></tr>`;
            }
        };

        // 2. Event Delegation (The Security Fix)
        // We listen for clicks on the TABLE BODY, then check what was clicked.
        tbody.addEventListener('click', async (e) => {
            const target = e.target;

            // HANDLE RESTORE CLICK
            if (target.classList.contains('btn-restore')) {
                const module = target.dataset.module;
                const id = target.dataset.id;

                if (await customConfirm("Restore this record back to the main system?")) {
                    try {
                        const response = await fetch(`/api/archive/restore/${module}/${id}`, { 
                            method: 'PUT', 
                            headers: { 'Authorization': `Bearer ${token}` } 
                        });
                        const result = await response.json();
                        if(result.success) {
                            alert("Restored Successfully!");
                            loadArchive(); // Refresh table
                        } else {
                            alert("Error: " + result.data);
                        }
                    } catch(err) { alert(err.message); }
                }
            }

            // HANDLE HARD DELETE CLICK
            if (target.classList.contains('btn-hard-delete')) {
                const module = target.dataset.module;
                const id = target.dataset.id;

                const reason = prompt("Enter reason for HARD DELETE. A PDF receipt will be generated.");
                if (!reason || reason.trim() === "") return alert("Action Cancelled: Reason is required for audit trail.");

                if (await customConfirm("WARNING: This permanently wipes the record. Proceed?")) {
                    try {
                        // Special Fetch for File Download
                        const response = await fetch(`/api/archive/hard-delete/${module}/${id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ reason })
                        });

                        if(!response.ok) throw new Error("Failed to process hard delete.");
                        
                        // Handle PDF Download Blob
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Deleted_${module}_${id}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();

                        alert("Record Permanently Deleted. PDF Receipt downloaded.");
                        loadArchive(); // Refresh table
                    } catch(err) { 
                        alert("Error: " + err.message); 
                    }
                }
            }
        });

        // 3. Listen for Dropdown Change
        moduleSelect.addEventListener('change', loadArchive);
        
        // 4. Initial Load
        loadArchive();
    }

    // ============================================================
    // MODULE: REPORTS
    // ============================================================
    const btnGenInventory = document.querySelector('#btn-gen-inventory');
    if(btnGenInventory) {
        btnGenInventory.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const token = JSON.parse(localStorage.getItem('token'));
                await api.downloadReport(token, 'inventory');
            } catch(err) { alert(err.message); }
        });
    }
    const btnGenSales = document.querySelector('#btn-gen-sales');
    if(btnGenSales) {
        btnGenSales.addEventListener('click', async (e) => {
            e.preventDefault();
            const start = document.querySelector('#report-start').value;
            const end = document.querySelector('#report-end').value;
            try {
                const token = JSON.parse(localStorage.getItem('token'));
                await api.downloadReport(token, 'sales', start, end);
            } catch(err) { alert(err.message); }
        });
    }
    

    // Identify current page
    const isReportsPage = document.body.classList.contains('reports-page');
    if (isReportsPage) {
        const token = JSON.parse(localStorage.getItem('token'));
        initReportsPage(token);
    }

    async function initReportsPage(token) {
        const categorySelect = document.getElementById('rep-category');
        const startInput = document.getElementById('rep-start');
        const endInput = document.getElementById('rep-end');
        const btnUpdate = document.getElementById('btn-update-preview');
        const btnDownload = document.getElementById('btn-download');
        const previewTitle = document.getElementById('preview-title');
        const dateRangeGroup = document.querySelector('.date-range-group');

        // 1. Load Initial Data (Default: Sales, This Month)
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = today.toISOString().split('T')[0];

        // --- NEW: Tightly coupled Flatpickr setup for Reports ---
        const endPicker = flatpickr(endInput, {
            dateFormat: "Y-m-d",
            defaultDate: lastDay,
            allowInput: true
        });

        const startPicker = flatpickr(startInput, {
            dateFormat: "Y-m-d",
            defaultDate: firstDay,
            allowInput: true,
            onChange: function(selectedDates, dateStr) {
                if (selectedDates.length > 0) {
                    endPicker.set('minDate', dateStr); // Enforce the rule
                    // Auto-correct end date if it violates the new rule
                    if (endPicker.selectedDates.length > 0 && endPicker.selectedDates[0] < selectedDates[0]) {
                        endPicker.setDate(dateStr);
                    }
                } else {
                    endPicker.set('minDate', null);
                }
            }
        });

        // Trigger the rule immediately on page load!
        endPicker.set('minDate', firstDay);

        // Helper to fetch and render
        const refreshPreview = async () => {
            try {
                const type = categorySelect.value;
                const start = startInput.value;
                const end = endInput.value;

                // Update UI Title
                previewTitle.textContent = type === 'sales' 
                    ? `Sales from ${start || 'Start'} to ${end || 'Now'}` 
                    : 'Inventory Snapshot';

                // Hide/Show Date inputs based on category (Inventory doesn't strictly need dates)
                if(type === 'inventory') {
                    dateRangeGroup.style.opacity = '0.5';
                    dateRangeGroup.style.pointerEvents = 'none';
                } else {
                    dateRangeGroup.style.opacity = '1';
                    dateRangeGroup.style.pointerEvents = 'auto';
                }

                const data = await api.getReportPreview(token, type, start, end);
                render.renderReportChart(type, data.chart);
                render.renderReportTable(type, data.rows);

            } catch (error) {
                console.error(error);
                alert("Failed to load report preview.");
            }
        };

        // 2. Event Listeners
        btnUpdate.addEventListener('click', refreshPreview);
        categorySelect.addEventListener('change', refreshPreview);

        btnDownload.addEventListener('click', async () => {
            try {
                const type = categorySelect.value;
                await api.downloadReport(token, type, startInput.value, endInput.value);
            } catch (error) {
                alert("Download failed.");
            }
        });

        // Initial Load
        refreshPreview();
    }


    // --- SYSTEM BACKUP & RESTORE LOGIC ---
    const systemBtn = document.getElementById('system-maintenance-btn');
    const systemModal = document.getElementById('system-modal');
    const closeSystemModal = document.getElementById('close-system-modal');

    if (systemBtn && systemModal) {
        // Open Modal
        systemBtn.addEventListener('click', () => {
            systemModal.style.display = 'flex';
        });

        // Close Modal
        closeSystemModal.addEventListener('click', () => {
            systemModal.style.display = 'none';
        });

        // Close on click outside
        window.addEventListener('click', (e) => {
            if (e.target === systemModal) systemModal.style.display = 'none';
        });

        // Helper to find token
        function getStoredToken() {
            const t1 = localStorage.getItem('token');
            const t2 = localStorage.getItem('admin_token');
            const t3 = localStorage.getItem('session');
            
            let found = t1 || t2 || t3;

            // *** THE FIX: Remove extra quotes if they exist ***
            if (found && found.startsWith('"') && found.endsWith('"')) {
                found = found.slice(1, -1);
            }
            
            return found;
        }

        // 1. Handle Backup Download
        document.getElementById('btn-download-backup').addEventListener('click', async () => {
            const token = getStoredToken(); // Now returns clean token

            if (!token) {
                alert("Error: You are not logged in.");
                return;
            }

            try {
                const res = await fetch('/api/system/backup', {
                    method: 'GET',
                    headers: { 
                        'Authorization': `Bearer ${token}` 
                    }
                });

                if (res.status === 200) {
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `bps_backup_${new Date().toISOString().slice(0,10)}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                } else {
                    const err = await res.json();
                    console.error("Server Error:", err);
                    alert(`Backup failed: ${err.data || "Unauthorized"}`);
                }
            } catch (err) {
                console.error("Network Error:", err);
                alert("Error downloading backup. Check console (F12).");
            }
        });

        // 2. Handle Restore Upload
        document.getElementById('restore-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const token = getStoredToken();
            if (!token) return alert("Error: Token missing. Please re-login.");

            if (!confirm("CRITICAL WARNING: This will delete all current data and replace it with the backup. Are you sure?")) return;

            const fileInput = document.getElementById('backup-file');
            if(fileInput.files.length === 0) return alert("Please select a file.");

            const formData = new FormData();
            formData.append('backup_file', fileInput.files[0]);

            const btn = e.target.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Restoring...";
            btn.disabled = true;

            try {
                const res = await fetch('/api/system/restore', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const result = await res.json();

                if (result.success) {
                    alert("Restore Successful! The page will now reload.");
                    location.reload();
                } else {
                    alert("Restore Failed: " + result.data);
                }
            } catch (err) {
                console.error(err);
                alert("Restore failed. Server connection error.");
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }


    // ============================================================
    // PAGE: SETTINGS
    // ============================================================
    if (document.body.classList.contains('settings-page')) {
        
        // 1. GET TOKEN (Fixes ReferenceError)
        let token = localStorage.getItem('token');
        if (token) {
            // Remove extra quotes if they exist (common issue with localStorage strings)
            token = token.replace(/^"|"$/g, ''); 
        } else {
            window.location.href = 'index.html';
        }

        try {
            const healthRes = await fetch('/api/system/health', { headers: { 'Authorization': `Bearer ${token}` } });
            const healthData = await healthRes.json();
            if(healthData.success) {
                document.getElementById('health-uptime').innerText = healthData.data.uptime;
                document.getElementById('health-dbsize').innerText = healthData.data.dbSize + ' MB';
                document.getElementById('health-lastbackup').innerText = healthData.data.lastBackup;
            }
        } catch(err) { console.error("Failed to load health:", err); }

        // 2. LOAD CURRENT EMAIL
        const emailInput = document.getElementById('admin-email-input');
        if (emailInput) {
            try {
                const res = await fetch('/api/system/settings', { 
                    headers: { 'Authorization': `Bearer ${token}` } 
                });
                const data = await res.json();
                if(data.success && data.data.admin_email) {
                    emailInput.value = data.data.admin_email;
                }
            } catch(err) {
                console.error("Failed to load settings:", err);
            }
        }

        // 3. UPDATE EMAIL HANDLER
        const emailForm = document.getElementById('settings-email-form');
        if (emailForm) {
            emailForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = emailInput.value;
                const btn = emailForm.querySelector('button');
                const originalText = btn.innerText;
                
                btn.innerText = "Saving...";
                btn.disabled = true;

                try {
                    const updateRes = await fetch('/api/system/settings', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json', 
                            'Authorization': `Bearer ${token}` 
                        },
                        body: JSON.stringify({ admin_email: email })
                    });
                    const resData = await updateRes.json();
                    if(resData.success) {
                        alert("Email updated successfully!");
                    } else {
                        alert("Error: " + resData.data);
                    }
                } catch(err) { 
                    console.error(err);
                    alert("Error updating email"); 
                } finally {
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            });
        }

        // 4. CHANGE PASSWORD LOGIC
        const passForm = document.getElementById('change-pass-form');
        if (passForm) {
            passForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const oldPass = document.getElementById('old-pass').value;
                const newPass = document.getElementById('new-pass').value;
                const confirmPass = document.getElementById('confirm-new-pass').value;

                if (newPass !== confirmPass) {
                    alert("New passwords do not match.");
                    return;
                }

                try {
                    await api.changePassword({ oldPassword: oldPass, newPassword: newPass }, token);
                    alert("Password changed successfully.");
                    passForm.reset();
                } catch (err) {
                    alert(err.message);
                }
            });
        }

        // 5. BACKUP & RESTORE LOGIC
        const btnDownload = document.getElementById('btn-download-backup');
        if (btnDownload) {
            btnDownload.addEventListener('click', async () => {
                try {
                    const res = await fetch('/api/system/backup', { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.status === 200) {
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `bps_backup_${new Date().toISOString().slice(0,10)}.zip`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    } else { 
                        const errData = await res.json();
                        alert("Backup failed: " + (errData.data || "Unauthorized")); 
                    }
                } catch (err) { alert("Error downloading backup"); }
            });
        }

        const restoreForm = document.getElementById('restore-form');
        if (restoreForm) {
            restoreForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!confirm("CRITICAL WARNING: This will overwrite data. Continue?")) return;
                
                const fileInput = document.getElementById('backup-file');
                if(fileInput.files.length === 0) return alert("Please select a file.");

                const formData = new FormData();
                formData.append('backup_file', fileInput.files[0]);

                // UI Feedback
                const btn = restoreForm.querySelector('button');
                const orgText = btn.innerText;
                btn.innerText = "Restoring...";
                btn.disabled = true;

                try {
                    const res = await fetch('/api/system/restore', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    const result = await res.json();
                    if(result.success) {
                        alert("Restored! The system is restarting...");
                        // Wait a moment for server restart then reload
                        setTimeout(() => location.reload(), 2000);
                    } else { 
                        alert("Restore Failed: " + result.data); 
                        btn.innerText = orgText;
                        btn.disabled = false;
                    }
                } catch(err) { 
                    alert("Restore failed (Network Error)"); 
                    btn.innerText = orgText;
                    btn.disabled = false;
                }
            });
        }

        // 6. LEGACY ENCRYPTION LOGIC
        const btnEncrypt = document.getElementById('btn-encrypt-legacy');
        if (btnEncrypt) {
            btnEncrypt.addEventListener('click', async () => {
                if (!confirm("This will encrypt all old files in the uploads folder. Make sure you have a backup first! Continue?")) return;
                
                const originalText = btnEncrypt.innerText;
                btnEncrypt.innerText = "Encrypting files... please wait.";
                btnEncrypt.disabled = true;

                try {
                    const res = await fetch('/api/system/encrypt-legacy', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await res.json();
                    
                    if (result.success) {
                        alert(result.data); // Shows how many were encrypted
                    } else {
                        alert("Error: " + result.data);
                    }
                } catch (err) {
                    alert("Migration failed. Check server console.");
                } finally {
                    btnEncrypt.innerText = originalText;
                    btnEncrypt.disabled = false;
                }
            });
        }


        // 7. SECURITY Q&A LOGIC
        const qaForm = document.getElementById('security-qa-form');
        if (qaForm) {
            // Optional: Fetch current question to pre-fill it
            fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => {
                    // Assuming you returned security_question in the /me payload, or just let them overwrite it blind.
                });

            qaForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const question = document.getElementById('sec-question').value;
                const answer = document.getElementById('sec-answer').value;

                try {
                    const res = await fetch('/api/auth/security-question', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}` 
                        },
                        body: JSON.stringify({ question, answer })
                    });
                    const result = await res.json();
                    
                    if (result.success) {
                        alert(result.data);
                        qaForm.reset();
                    } else {
                        alert("Error: " + result.data);
                    }
                } catch (err) {
                    alert("Network error.");
                }
            });
        }
    }
});