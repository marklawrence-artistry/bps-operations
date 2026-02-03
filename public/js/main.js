import * as api from './api.js';
import * as render from './render.js';

let currentAccount = null;

// Global State for Pagination
const state = {
    accountPage: 1, accountSearch: '',
    inventoryPage: 1, inventorySearch: '',
    sellerPage: 1, sellerSearch: '',
    rtsPage: 1, rtsSearch: '',
    inventoryCatPage: 1,
    auditPage: 1, auditSearch: '',
    salesPage: 1, salesSearch: '',
    documentPage: 1, documentSearch: ''
};

// --- HELPER: Load Paginated Data ---
async function loadPaginatedData(apiMethod, renderMethod, listDiv, paginationDiv, pageStateKey, searchStateKey = null) {
    if (!listDiv) return;

    try {
        const token = JSON.parse(localStorage.getItem('token'));
        const currentPage = state[pageStateKey];
        // Pass search term if key exists
        const searchTerm = searchStateKey ? state[searchStateKey] : ''; 

        // Call API with search
        const result = await apiMethod(token, currentPage, searchTerm);

        // Render
        renderMethod(result.data, listDiv);

        if (paginationDiv && result.pagination) {
            render.renderPagination(result.pagination, paginationDiv, (newPage) => {
                state[pageStateKey] = newPage;
                loadPaginatedData(apiMethod, renderMethod, listDiv, paginationDiv, pageStateKey, searchStateKey);
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
    
    // 1. SESSION CHECK (Skip on login page)
    if (!window.location.pathname.endsWith('index.html')) {
        await checkSession();
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
        
        // Load Data
        loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage');

        // Search Listener
        const searchInput = document.querySelector('.search-box input');
        if(searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                state.accountSearch = e.target.value.trim();
                state.accountPage = 1; // Reset to page 1 on search
                loadPaginatedData(api.getAllAccounts, render.renderAccountsTable, accountListDiv, paginationDiv, 'accountPage', 'accountSearch');
            }, 500));
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
        
        loadPaginatedData(api.getAllInventory, render.renderInventoryTable, inventoryListDiv, paginationDiv, 'inventoryPage');

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
        loadPaginatedData(api.getAllSellers, render.renderSellersTable, sellerListDiv, paginationDiv, 'sellerPage');

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
        loadPaginatedData(api.getAllRTS, render.renderRTSTable, rtsListDiv, paginationDiv, 'rtsPage');

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
        loadPaginatedData(api.getAuditLogs, render.renderAuditLogTable, auditListDiv, paginationDiv, 'auditPage');

        const searchInput = document.querySelector('#audit-search'); // ID specific to audit page HTML
        if(searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                state.auditSearch = e.target.value.trim();
                state.auditPage = 1;
                loadPaginatedData(api.getAuditLogs, render.renderAuditLogTable, auditListDiv, paginationDiv, 'auditPage', 'auditSearch');
            }, 500));
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
        
        loadPaginatedData(api.getAllSales, render.renderSalesTable, salesListDiv, paginationDiv, 'salesPage');

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

        loadPaginatedData(api.getAllDocuments, render.renderDocumentsTable, documentListDiv, paginationDiv, 'documentPage');

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

            if(elLowStock) elLowStock.innerText = stats.lowStockCount + "+";
            
            // Format Currency
            const peso = new Intl.NumberFormat('en-PH', { 
                style: 'currency', 
                currency: 'PHP', 
                maximumFractionDigits: 0,
                notation: "compact", // e.g. 8.4k
                compactDisplay: "short"
            });

            if(elSales) elSales.innerText = peso.format(stats.salesMonthTotal);
            if(elSellers) elSellers.innerText = stats.sellerCount + "+";
            
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

});