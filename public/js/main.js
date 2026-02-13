import * as api from './api.js';
import * as render from './render.js';

let currentAccount = null;

// Global State for Pagination
const state = {
    accountPage: 1, accountSearch: '', accountRole: '',
    inventoryPage: 1, inventorySearch: '', inventoryCategory: '', inventorySort: 'newest',
    sellerPage: 1, sellerSearch: '', sellerCategory: '',
    rtsPage: 1, rtsSearch: '', rtsStatus: '', rtsSort: 'DESC',
    inventoryCatPage: 1,
    auditPage: 1, auditSearch: '', auditAction: '', auditSort: 'DESC',
    salesPage: 1, salesSearch: '', salesSort: 'newest',
    documentPage: 1, documentSearch: '', documentCategory: ''
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
function applyRoleBasedUI() {
    if (!currentAccount) return;
    if (currentAccount.role_id === 2) { // Staff
        const adminLinks = document.querySelectorAll('.admin-nav');
        adminLinks.forEach(link => link.style.display = 'none');
    }
}
// --- HELPER: Check Session ---
async function checkSession() {
    try {
        const token = JSON.parse(localStorage.getItem('token'));
        if (!token) throw new Error("No token found");
        
        const result = await api.checkSession(token);
        currentAccount = result.user;
        
        // Update Header Info
        const userHeader = document.querySelector('.user-info');
        if (userHeader) {
            userHeader.innerHTML = `<h4>${currentAccount.username}</h4><p>${currentAccount.role_id === 1 ? 'Admin' : 'Staff'}</p>`;
        }

        applyRoleBasedUI();
    } catch (err) {
        console.warn("Session check failed:", err.message);
        localStorage.removeItem('token');
        if (!window.location.pathname.endsWith('index.html')) {
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

        if (confirm(`Are you sure you want to delete ${ids.length} items? This cannot be undone.`)) {
            const token = JSON.parse(localStorage.getItem('token'));
            try {
                // Execute deletes in parallel
                await Promise.all(ids.map(id => deleteApiCallback(id, token)));
                
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

    const socket = io();
    // 1. Inventory Listener
    if (document.querySelector('#inventory-list')) {
        socket.on('inventory_update', () => {
            // Re-fetch data using current filters
            loadPaginatedData(api.getAllInventory, render.renderInventoryTable, document.querySelector('#inventory-list'), document.querySelector('.pagination'), 'inventoryPage', 'inventorySearch', 'inventoryCategory', 'inventorySort');
            
            // Optional: Dashboard Widget update
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
            // ... (Copy the logic from your existing Dashboard section to update numbers here)
            // Or simpler: just reload the page if you want to be lazy: location.reload();
            // But updating text is cooler:
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
    
    // 1. SESSION CHECK (Skip on login page)
    if (!window.location.pathname.endsWith('index.html')) {
        await checkSession();
    }

    function initAutoLogout() {
        // 30 minutes in milliseconds
        const TIMEOUT_MS = 30 * 60 * 1000; 
        let logoutTimer;

        const resetTimer = () => {
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
        document.ontouchstart = resetTimer; // For mobile
        document.onclick = resetTimer;
        document.onscroll = resetTimer;
    }

    // Call this if the user is logged in
    if (localStorage.getItem('token')) {
        initAutoLogout();
    }

    const testEmailBtn = document.getElementById('test-email-btn');
    if (testEmailBtn) {
        testEmailBtn.addEventListener('click', async () => {
            if(!confirm("Send a test email summary of all documents to the Admin?")) return;

            // 1. Get Token
            let token = localStorage.getItem('token');
            console.log("Raw Token from Storage:", token); // Check console to see what this prints

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
        const roleFilter = document.getElementById('account-role-filter'); // <--- GET ELEMENT

        // 1. UPDATE INITIAL LOAD to include 'accountRole'
        loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage', 'accountSearch', 'accountRole');

        // 2. UPDATE SEARCH LISTENER to include 'accountRole'
        const searchInput = document.querySelector('.search-box input');
        if(searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                state.accountSearch = e.target.value.trim();
                state.accountPage = 1;
                loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage', 'accountSearch', 'accountRole');
            }, 500));
        }

        // 3. ADD FILTER LISTENER
        if(roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                state.accountRole = e.target.value;
                state.accountPage = 1;
                loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage', 'accountSearch', 'accountRole');
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
                    accountForm.querySelector('#account-question').value = acc.security_question || "";
                    accountForm.querySelector('#account-answer').value = "";
                    
                    document.querySelector('#form-title').innerText = "Update Account";
                    accountForm.style.display = "block";
                    document.querySelector('#cancel-account-btn').style.display = "block";
                }
            }
            // Delete
            if (e.target.classList.contains('delete-btn')) {
                if (confirm("Delete this account?")) {
                    await api.deleteAccount(id, token);
                    loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage');
                }
            }
            // Disable/Enable
            if (e.target.classList.contains('disable-btn')) {
                if (confirm("Disable this account?")) {
                    await api.disableAccount(id, token);
                    loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage');
                }
            }
            if (e.target.classList.contains('enable-btn')) {
                if (confirm("Enable this account?")) {
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
                    password: accountForm.querySelector('#account-password').value.trim() || null,
                    security_question: accountForm.querySelector('#account-question').value || null,
                    security_answer: accountForm.querySelector('#account-answer').value.trim() || null
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
            const id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            if(e.target.classList.contains('delete-btn')) {
                if(confirm("Delete item?")) {
                    await api.deleteInventory(id, token);
                    loadPaginatedData(api.getAllInventory, render.renderInventoryTable, inventoryListDiv, paginationDiv, 'inventoryPage');
                }
            }
            if(e.target.classList.contains('edit-btn')) {
                const inventoryForm = document.querySelector('#inventory-form');
                const item = await api.getInventory(id, token);
                
                // --- NEW: POPULATE DROPDOWN BEFORE SETTING VALUE ---
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
                
                // Show form
                inventoryForm.style.display = "block";
                document.querySelector('#cancel-inventory-btn').style.display = "block";
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
                console.log(currentAccount);
                
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
                if(e.target.classList.contains('delete-btn')) {
                    const row = e.target.closest('tr');
                    const id = row.dataset.id;
                    const token = JSON.parse(localStorage.getItem('token'));
                    
                    if(confirm("Delete this category? Items in this category might lose their association.")) {
                        try {
                            await api.deleteInventoryCategory(id, token);
                            loadPaginatedData(api.getAllInventoryCategories, render.renderInventoryCategoriesTable, catListDiv, catPagination, 'inventoryCatPage');
                        } catch(err) {
                            alert(err.message);
                        }
                    }
                }
            });

            // 4. Create Category Logic
            if(catForm) {
                catForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const name = catForm.querySelector('#cat-name').value;
                    const desc = catForm.querySelector('#cat-desc').value;
                    const token = JSON.parse(localStorage.getItem('token'));

                    try {
                        await api.createInventoryCategory({ name, description: desc }, token);
                        catForm.reset();
                        alert("Category created.");
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

        // 1. UPDATE INITIAL LOAD
        loadPaginatedData(api.getAllSellers, render.renderSellersTable, sellerListDiv, paginationDiv, 'sellerPage', 'sellerSearch', 'sellerCategory');

        // 2. FILTER LISTENER
        if(sellerCatFilter) {
            sellerCatFilter.addEventListener('change', (e) => {
                state.sellerCategory = e.target.value;
                state.sellerPage = 1;
                loadPaginatedData(api.getAllSellers, render.renderSellersTable, sellerListDiv, paginationDiv, 'sellerPage', 'sellerSearch', 'sellerCategory');
            });
        }

        const searchInput = document.querySelector('.search-box input');
        if(searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                state.sellerSearch = e.target.value.trim();
                state.sellerPage = 1;
                loadPaginatedData(api.getAllSellers, render.renderSellersTable, sellerListDiv, paginationDiv, 'sellerPage', 'sellerSearch');
            }, 500));
        }

        // --- NEW: Event Listener for Edit/Delete ---
        sellerListDiv.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            if (!row) return;

            const id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            // DELETE ACTION
            if (e.target.classList.contains('delete-btn')) {
                if (confirm("Are you sure you want to delete this seller?")) {
                    try {
                        await api.deleteSeller(id, token);
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
                if(confirm("Are you sure you want to delete this record?")) {
                    try {
                        await api.deleteRTS(id, token);
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
                const data = {
                    tracking_no: rtsForm.querySelector('#rts-tracking').value,
                    seller_id: rtsForm.querySelector('#rts-seller-id').value,
                    product_name: rtsForm.querySelector('#rts-product').value,
                    customer_name: rtsForm.querySelector('#rts-customer').value,
                    description: rtsForm.querySelector('#rts-desc').value
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
                if (confirm("Are you sure you want to delete this sales record?")) {
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

        // 1. UPDATE INITIAL LOAD
        loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable, documentListDiv, paginationDiv, 'documentPage', 'documentSearch', 'documentCategory');

        // 2. FILTER LISTENER
        if(docCatFilter) {
            docCatFilter.addEventListener('change', (e) => {
                state.documentCategory = e.target.value;
                state.documentPage = 1;
                loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable, documentListDiv, paginationDiv, 'documentPage', 'documentSearch', 'documentCategory');
            });
        }

        const searchInput = document.querySelector('.search-box input');
        if(searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                state.documentSearch = e.target.value.trim();
                state.documentPage = 1;
                loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable, documentListDiv, paginationDiv, 'documentPage', 'documentSearch');
            }, 500));
        }
            
        // --- NEW: Event Listener for Edit/Delete ---
        documentListDiv.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            if(!row) return;
            
            const id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            // DELETE ACTION
            if(e.target.classList.contains('delete-btn')) {
                if(confirm("Are you sure you want to delete this document?")) {
                    try {
                        await api.deleteDocument(id, token);
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
                
                // Get data from table cells (Order: Title, Category, Expiry)
                const cells = row.querySelectorAll('td');
                const currentTitle = cells[0].innerText;
                const currentCategory = cells[1].innerText;
                const currentExpiry = cells[2].innerText;

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
                maximumFractionDigits: 0,
                notation: "compact", // e.g. 8.4k
                compactDisplay: "short"
            });

            if(elSales) elSales.innerText = peso.format(stats.salesMonthTotal);
            if(elSellers) elSellers.innerText = stats.sellerCount;
            
            const fullPeso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
            if(elChartTotal) elChartTotal.innerText = fullPeso.format(stats.chart.grandTotal);
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
        } catch(err) {
            console.error("Dashboard Error:", err);
        }
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
        
        startInput.value = firstDay;
        endInput.value = lastDay;

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
    const settingsBody = document.querySelector('.settings-page');
    if (settingsBody) {
        // 1. Change Password
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
                    const token = JSON.parse(localStorage.getItem('token'));
                    await api.changePassword({ oldPassword: oldPass, newPassword: newPass }, token);
                    alert("Password changed successfully.");
                    passForm.reset();
                } catch (err) {
                    alert(err.message);
                }
            });
        }

        // 2. Backup & Restore (Copied logic, reused here)
        // ... (The backup/restore logic provided in previous answer can be reused here targeting IDs in settings.html) ...
        const btnDownload = document.getElementById('btn-download-backup');
        if (btnDownload) {
            btnDownload.addEventListener('click', async () => {
                const token = JSON.parse(localStorage.getItem('token'));
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
                    } else { alert("Backup failed"); }
                } catch (err) { alert("Error downloading backup"); }
            });
        }

        const restoreForm = document.getElementById('restore-form');
        if (restoreForm) {
            restoreForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!confirm("CRITICAL WARNING: This will overwrite data. Continue?")) return;
                
                const token = JSON.parse(localStorage.getItem('token'));
                const fileInput = document.getElementById('backup-file');
                const formData = new FormData();
                formData.append('backup_file', fileInput.files[0]);

                try {
                    const res = await fetch('/api/system/restore', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    const result = await res.json();
                    if(result.success) {
                        alert("Restored! Reloading...");
                        location.reload();
                    } else { alert(result.data); }
                } catch(err) { alert("Restore failed"); }
            });
        }


        const res = await fetch('/api/system/settings', { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        const data = await res.json();
        if(data.success) document.getElementById('admin-email-input').value = data.data.admin_email;

        // Save email
        document.getElementById('settings-email-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email-input').value;
            try {
                const updateRes = await fetch('/api/system/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ admin_email: email })
                });
                const resData = await updateRes.json();
                if(resData.success) alert("Email updated!");
            } catch(err) { alert("Error updating email"); }
        });
    }
});