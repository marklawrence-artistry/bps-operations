import * as api from './api.js';
import * as render from './render.js';

let currentAccount = null;

// Global State for Pagination
const state = {
    accountPage: 1,
    inventoryPage: 1,
    inventoryCatPage: 1,
    sellerPage: 1,
    rtsPage: 1,
    salesPage: 1,
    documentPage: 1,
    auditPage: 1
};

// --- HELPER: Load Paginated Data ---
async function loadPaginatedData(apiMethod, renderMethod, listDiv, paginationDiv, pageStateKey) {
    if (!listDiv) return;

    try {
        const token = JSON.parse(localStorage.getItem('token'));
        const currentPage = state[pageStateKey];

        // API Call
        const result = await apiMethod(token, currentPage);

        // Render Table
        renderMethod(result.data, listDiv);

        // Render Pagination Controls
        if (paginationDiv && result.pagination) {
            render.renderPagination(result.pagination, paginationDiv, (newPage) => {
                state[pageStateKey] = newPage;
                loadPaginatedData(apiMethod, renderMethod, listDiv, paginationDiv, pageStateKey);
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

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. SESSION CHECK (Skip on login page)
    if (!window.location.pathname.endsWith('index.html')) {
        await checkSession();
    }

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

    // ============================================================
    // MODULE: ACCOUNTS
    // ============================================================
    const accountListDiv = document.querySelector('#account-list');
    if (accountListDiv) {
        const paginationDiv = document.querySelector('.pagination');
        
        // Load Data
        loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage');

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
                    accountForm.querySelector('#account-password').value = ""; // Don't show hash
                    
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
                    username: accountForm.querySelector('#account-username').value.trim(),
                    email: accountForm.querySelector('#account-email').value.trim(),
                    role_id: accountForm.querySelector('#account-role').value,
                    password: accountForm.querySelector('#account-password').value.trim()
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
        
        loadPaginatedData(api.getAllInventory, render.renderInventoryTable, inventoryListDiv, paginationDiv, 'inventoryPage');

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
            createInventoryBtn.addEventListener('click', () => {
                inventoryForm.reset();
                inventoryForm.querySelector('#inventory-id').value = "";
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
            inventoryForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData();
                formData.append('name', inventoryForm.querySelector('#inventory-name').value);
                formData.append('category_id', inventoryForm.querySelector('#inventory-category').value);
                formData.append('quantity', inventoryForm.querySelector('#inventory-quantity').value);
                formData.append('min_stock_level', inventoryForm.querySelector('#inventory-minstock').value);
                
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

        // Categories (Simplified: Load all or paginated? Currently paginated)
        const catListDiv = document.querySelector('#inventory-category-list');
        if(catListDiv) {
            loadPaginatedData(api.getAllInventoryCategories, render.renderInventoryCategoriesTable, catListDiv, null, 'inventoryCatPage');
            // Category form logic... (omitted for brevity, similar pattern)
        }
    }

    // ============================================================
    // MODULE: SELLERS
    // ============================================================
    const sellerListDiv = document.querySelector('#seller-list');
    if (sellerListDiv) {
        const paginationDiv = document.querySelector('.pagination');
        loadPaginatedData(api.getAllSellers, render.renderSellersTable, sellerListDiv, paginationDiv, 'sellerPage');

        // Form Logic
        const sellerForm = document.querySelector('#seller-form');
        const createSellerBtn = document.querySelector('#create-seller-btn');
        const cancelSellerBtn = document.querySelector('#cancel-seller-btn');

        if(createSellerBtn) {
            createSellerBtn.addEventListener('click', () => {
                sellerForm.reset();
                sellerForm.querySelector('#seller-id').value = "";
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
                        alert("Seller updated");
                    } else {
                        await api.createSeller(formData, token);
                        alert("Seller created");
                    }
                    sellerForm.style.display = "none";
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
        loadPaginatedData(api.getAllRTS, render.renderRTSTable, rtsListDiv, paginationDiv, 'rtsPage');

        const createRtsBtn = document.querySelector('#create-rts-btn');
        const rtsForm = document.querySelector('#rts-form');
        
        if(createRtsBtn) {
            createRtsBtn.addEventListener('click', async () => {
                rtsForm.reset();
                rtsForm.querySelector('#rts-id').value = "";
                rtsForm.style.display = "block";
                document.querySelector('#cancel-rts-btn').style.display = "block";

                // Load Sellers for Dropdown
                const token = JSON.parse(localStorage.getItem('token'));
                const sellerRes = await api.getAllSellers(token, 1, true); // fetchAll = true
                const select = rtsForm.querySelector('#rts-seller-id');
                select.innerHTML = '<option value="">Select Seller</option>';
                sellerRes.data.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.innerText = s.name;
                    select.appendChild(opt);
                });
            });
        }
        
        // RTS Form Submit
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
                    } else {
                        await api.createRTS(data, token);
                    }
                    rtsForm.style.display = "none";
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
        loadPaginatedData(api.getAuditLogs, render.renderAuditLogTable, auditListDiv, paginationDiv, 'auditPage');
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
        
        loadPaginatedData(api.getAllSales, render.renderSalesTable, salesListDiv, paginationDiv, 'salesPage');
        
        // Sales Form listeners (omitted for brevity, follow generic pattern)
        const createSaleBtn = document.querySelector('#create-sale-btn');
        if(createSaleBtn) {
            const saleForm = document.querySelector('#sale-form');
            createSaleBtn.addEventListener('click', ()=>{
                saleForm.reset(); 
                saleForm.style.display = 'block';
                document.querySelector('#cancel-sale-btn').style.display = 'block';
            });
            
            saleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = saleForm.querySelector('#sale-id').value;
                const data = {
                    week_start_date: saleForm.querySelector('#sale-start-date').value,
                    week_end_date: saleForm.querySelector('#sale-end-date').value,
                    total_amount: saleForm.querySelector('#sale-amount').value,
                    notes: saleForm.querySelector('#sale-notes').value
                };
                const token = JSON.parse(localStorage.getItem('token'));
                try {
                    if(id) await api.updateSale(id, data, token);
                    else await api.createSale(data, token);
                    saleForm.style.display = 'none';
                    loadPaginatedData(api.getAllSales, render.renderSalesTable, salesListDiv, paginationDiv, 'salesPage');
                } catch(err){ alert(err.message); }
            });
        }
    }

    // ============================================================
    // MODULE: DOCUMENTS
    // ============================================================
    const documentListDiv = document.querySelector('#document-list');
    if (documentListDiv) {
        // Need to find or create pagination div as documents.html might not have it
        let paginationDiv = document.querySelector('.pagination');
        if(!paginationDiv) {
            paginationDiv = document.createElement('div');
            paginationDiv.className = 'pagination';
            documentListDiv.parentNode.appendChild(paginationDiv);
        }

        loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable, documentListDiv, paginationDiv, 'documentPage');
        
        // Document Form...
        const createDocBtn = document.querySelector('#create-document-btn');
        if(createDocBtn) {
            const docForm = document.querySelector('#document-form');
            createDocBtn.addEventListener('click', ()=>{
                docForm.reset();
                docForm.style.display = 'block';
                document.querySelector('#cancel-document-btn').style.display = 'block';
            });
            
            docForm.addEventListener('submit', async (e)=>{
                e.preventDefault();
                const id = docForm.querySelector('#document-id').value;
                const token = JSON.parse(localStorage.getItem('token'));
                
                try {
                    if(id) {
                        const data = {
                            title: docForm.querySelector('#document-title').value,
                            category: docForm.querySelector('#document-category').value,
                            expiry_date: docForm.querySelector('#document-expiry').value
                        };
                        await api.updateDocument(id, data, token);
                    } else {
                        const formData = new FormData();
                        formData.append('title', docForm.querySelector('#document-title').value);
                        formData.append('category', docForm.querySelector('#document-category').value);
                        formData.append('expiry_date', docForm.querySelector('#document-expiry').value);
                        formData.append('document', docForm.querySelector('#document-file').files[0]);
                        await api.createDocument(formData, token);
                    }
                    docForm.style.display = 'none';
                    loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable, documentListDiv, paginationDiv, 'documentPage');
                } catch(err){ alert(err.message); }
            });
        }
    }

    // ============================================================
    // MODULE: DASHBOARD (Widgets)
    // ============================================================
    if (document.querySelector('.dashboard-table')) {
        try {
            const token = JSON.parse(localStorage.getItem('token'));
            const lowStock = await api.getLowStockItems(token);
            render.renderLowStockWidget(lowStock, document.querySelector('.dashboard-table'));
            
            const stats = await api.getDashboardStats(token);
            
            const statValues = document.querySelectorAll('.stat-value');
            if(statValues.length >= 3) {
                statValues[0].innerText = stats.lowStockCount;
                statValues[1].innerText = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(stats.salesMonthTotal);
                statValues[2].innerText = stats.sellerCount;
            }

            const chartTotalEl = document.querySelector('.chart-total');
            if(chartTotalEl) chartTotalEl.innerText = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(stats.chart.grandTotal);

            const ctx = document.getElementById('salesChart');
            if(ctx) {
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: stats.chart.labels,
                        datasets: [{
                            label: 'Monthly Sales',
                            data: stats.chart.data,
                            backgroundColor: 'rgba(46, 59, 151, 0.8)',
                            borderColor: 'rgba(46, 59, 151, 1)',
                            borderWidth: 1,
                            borderRadius: 5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true } }
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

});