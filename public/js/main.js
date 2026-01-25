import * as api from './api.js'
import * as render from './render.js'

let currentAccount = null;

function renderSalesChart(chartData) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Monthly Sales',
                data: chartData.data,
                backgroundColor: 'rgba(46, 59, 151, 0.8)',
                borderColor: 'rgba(46, 59, 151, 1)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {


    // *********** CONSTANTS *************
    const loginForm = document.querySelector('#login-form');
    const accountForm = document.querySelector('#account-form');
    const inventoryCategoryForm = document.querySelector('#inventory-category-form');
    const inventoryForm = document.querySelector('#inventory-form');

    const logoutBtn = document.querySelector('#logout-button');
    const createAccountBtn = document.querySelector('#create-account-btn');
    const cancelAccountBtn = document.querySelector('#cancel-account-btn');
    const createInventoryCategoryBtn = document.querySelector('#create-inventory-category-btn');
    const cancelInventoryCategoryBtn = document.querySelector('#cancel-inventory-category-btn');
    const createInventoryBtn = document.querySelector('#create-inventory-btn');
    const cancelInventoryBtn = document.querySelector('#cancel-inventory-btn');

    const accountListDiv = document.querySelector('#account-list');
    const inventoryCategoriesListDiv = document.querySelector('#inventory-category-list');
    const inventoryListDiv = document.querySelector('#inventory-list');

    // SELLERS
    const sellerListDiv = document.querySelector('#seller-list');
    const sellerForm = document.querySelector('#seller-form');
    const createSellerBtn = document.querySelector('#create-seller-btn');
    const cancelSellerBtn = document.querySelector('#cancel-seller-btn');

    // RTS
    const rtsListDiv = document.querySelector('#rts-list');
    const rtsForm = document.querySelector('#rts-form');
    const createRtsBtn = document.querySelector('#create-rts-btn');
    const cancelRtsBtn = document.querySelector('#cancel-rts-btn');

    // SALES
    const salesListDiv = document.querySelector('#sales-list');
    const saleForm = document.querySelector('#sale-form');
    const createSaleBtn = document.querySelector('#create-sale-btn');
    const cancelSaleBtn = document.querySelector('#cancel-sale-btn');

    // DOCUMENTS
    const documentListDiv = document.querySelector('#document-list');
    const documentForm = document.querySelector('#document-form');
    const createDocumentBtn = document.querySelector('#create-document-btn');
    const cancelDocumentBtn = document.querySelector('#cancel-document-btn');

    // DASHBOARD
    const dashboardTable = document.querySelector('.dashboard-table');
    const salesChartCanvas = document.querySelector('#salesChart');

    // AUDIT LOG
    const auditListDiv = document.querySelector('#audit-list');



    // *********** HELPER FUNCTIONS *************
    async function checkSession() {
        try {
            const token = JSON.parse(localStorage.getItem('token'));
            // kailangan ng token dito para dumaan siya sa verifyToken middleware pero di na siya gagamitin sa controller
			const result = await api.checkSession(token);
            currentAccount = result.user;
            applyRoleBasedUI();
		} catch(err) {
            alert(`Error: ${err.message}`);
			if(err.message === "Invalid or expired token.") {
                localStorage.removeItem('token')
                location.href = 'index.html';
            }
		}
    }
    function applyRoleBasedUI() {
        if (!currentAccount) return;

        if (currentAccount.role_id === 2) {
            const adminLinks = document.querySelectorAll('.admin-nav');
            adminLinks.forEach(link => {
                link.style.display = 'none';
            });
        }
    }
    async function loadData(api_method, render_method, div_container) {
        try {
            const token = JSON.parse(localStorage.getItem('token'));
			const result = await api_method(token);
			render_method(result, div_container);
		} catch(err) {
            alert(`Error: ${err.message}`);
			if(err.message === "Invalid or expired token.") {
                localStorage.removeItem('token')
                location.href = 'index.html';
            }
		}
    }



    // *********** ACCOUNTS/AUTHENTICATION *************
    // (AUTH) LOGIN
    if(loginForm) {
        console.log(loginForm)
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const credentials = {
                email: loginForm.querySelector('#login-email').value.trim(),
                password: loginForm.querySelector('#login-password').value.trim()
            }

            try {
                const data = await api.loginAccount(credentials);
                localStorage.setItem('token', JSON.stringify(data.token));
                
                currentAccount = data.user;
                alert(`User ${data.user.username} successfully logged in.`);

                loginForm.reset();
                location.href = 'dashboard.html';
            } catch(err) {
                alert(`Error: ${err.message}`)
            }
        })
    }
    // (AUTH) LOGOUT
    if(logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();

            if(confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('token');
                location.reload();
            }
        })
    }
    // (AUTH) CREATE/UPDATE
    if(createAccountBtn) {
        createAccountBtn.addEventListener('click', (e) => {
            e.preventDefault();

            accountForm.reset();
            accountForm.style.display = "block";
            cancelAccountBtn.style.display = "block";
            accountForm.querySelector('#form-title').innerText = "Create New Account";
        })
    }
    if(cancelAccountBtn) {
        cancelAccountBtn.addEventListener('click', (e) => {
            e.preventDefault();

            accountForm.reset();
            accountForm.style.display = "none";
            cancelAccountBtn.style.display = "none";
        })
    }
    if(accountForm) {
        // Prevent emoji in input tags
        const usernameTextbox = accountForm.querySelector('#account-username');
        if(usernameTextbox) {
            usernameTextbox.addEventListener( "input", event => {
                const target = event.target;
                const regex = /[^\p{L}\p{N}\p{P}\p{Z}\s]/gu; 

                if (regex.test(target.value)) {
                    target.value = target.value.replace(regex, '');
                }
            }, false);
        }

        // CREATE/UPDATE Form
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                const data = {
                    username: accountForm.querySelector('#account-username').value.trim() || null,
                    email: accountForm.querySelector('#account-email').value.trim() || null,
                    role_id: accountForm.querySelector('#account-role').value || null,
                    password: accountForm.querySelector('#account-password').value.trim() || null
                }

                const user_id = accountForm.querySelector('#account-id').value;
                const token = JSON.parse(localStorage.getItem('token'));
                if(user_id) {
                    await api.updateAccount(data, token, user_id);
                    alert("Account updated successfully!");
                } else {
                    await api.createAccount(data, token);
                    alert("Account created successfully!");
                }

                location.reload();
                accountForm.reset();
            } catch(err) {
                alert(`Error: ${err.message}`);
            }
        })
    }
    // (AUTH) TABLE EVENT LISTENER (UPDATE/DELETE)
    if(accountListDiv) {
        loadData(api.getAllAccounts, render.renderAccountsTable, accountListDiv);

        accountListDiv.addEventListener('click', async (e) => {
            e.preventDefault();

            const row = e.target.closest('tr');
            const account_id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            if(e.target.classList.contains('edit-btn')) {
                accountForm.reset();
                accountForm.style.display = "block"
                cancelAccountBtn.style.display = "block"

                const account = await api.getAccount(account_id, token)
                accountForm.querySelector('#form-title').innerText = "Update Existing Account"

                accountForm.querySelector('#account-username').value = account.username
                accountForm.querySelector('#account-email').value = account.email
                accountForm.querySelector('#account-role').value = account.role === 1 ? "1" : "2"; 
                accountForm.querySelector('#account-password').value = "";
                accountForm.querySelector('#account-id').value = account.id;
            }

            if(e.target.classList.contains('delete-btn')) {
                if(confirm("Are you sure you want to delete this account?")) {
                    try {
                        await api.deleteAccount(account_id, token)
                        location.reload()
                    } catch(err) {
                        alert(`Error: ${err.message}`)
                    }
                }
            }

            if(e.target.classList.contains('disable-btn')) {
                if(confirm("Are you sure you want to disable this account?")) {
                    try {
                        await api.disableAccount(account_id, token)
                        location.reload()
                    } catch(err) {
                        alert(`Error: ${err.message}`)
                    }
                }
            }

            if(e.target.classList.contains('enable-btn')) {
                if(confirm("Are you sure you want to re-enable this account?")) {
                    try {
                        await api.enableAccount(account_id, token);
                        location.reload();
                    } catch(err) {
                        alert(`Error: ${err.message}`);
                    }
                }
            }
        })
    }
    


    // *********** INVENTORY *************
    // (INVENTORY CATEGORIES) CREATE
    if(createInventoryCategoryBtn) {
        createInventoryCategoryBtn.addEventListener('click', (e) => {
            e.preventDefault();

            inventoryCategoryForm.reset();
            inventoryCategoryForm.style.display = "block";
            cancelInventoryCategoryBtn.style.display = "block";
            inventoryCategoryForm.querySelector('#form-title').innerText = "Create New Inventory Category";
        })
    }
    if(cancelInventoryCategoryBtn) {
        cancelInventoryCategoryBtn.addEventListener('click', (e) => {
            e.preventDefault();

            inventoryCategoryForm.reset();
            inventoryCategoryForm.style.display = "none";
            cancelInventoryCategoryBtn.style.display = "none";
        })
    }
    if(inventoryCategoryForm) {
        inventoryCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                const data = {
                    name: inventoryCategoryForm.querySelector('#inventory-category-name').value.trim() || null,
                    description: inventoryCategoryForm.querySelector('#inventory-category-description').value.trim() || null,
                    staff_id: currentAccount.id
                }

                const inventory_category_id = inventoryCategoryForm.querySelector('#inventory-category-id').value;
                const token = JSON.parse(localStorage.getItem('token'));
                if(inventory_category_id) {
                    // await api.updateAccount(data, token, user_id);
                    // alert("Account updated successfully!");
                    return;
                } else {
                    await api.createInventoryCategory(data, token);
                    alert("Inventory category created successfully!");
                }

                location.reload();
                inventoryCategoryForm.reset();
            } catch(err) {
                alert(`Error: ${err.message}`);
            }
        })
    }
    // (INVENTORY CATEGORIES) TABLE EVENT LISTENER (DELETE)
    if(inventoryCategoriesListDiv) {
        // api.getAllInventoryCategories, render.renderInventoryCategoriesTable, inventoryCategoriesListDiv
        loadData(api.getAllInventoryCategories, render.renderInventoryCategoriesTable, inventoryCategoriesListDiv);

        inventoryCategoriesListDiv.addEventListener('click', async (e) => {
            e.preventDefault();

            const row = e.target.closest('tr');
            const inventory_category_id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            if(e.target.classList.contains('delete-btn')) {
                if(confirm("Are you sure you want to delete this inventory category?")) {
                    try {
                        await api.deleteInventoryCategory(inventory_category_id, token)
                        location.reload()
                    } catch(err) {
                        alert(`Error: ${err.message}`)
                    }
                }
            }
        })
    }
    // (INVENTORY) TABLE EVENT LISTENER (UPDATE/DELETE)
    if(inventoryListDiv) {
        loadData(api.getAllInventory, render.renderInventoryTable, inventoryListDiv);

        inventoryListDiv.addEventListener('click', async (e) => {
            e.preventDefault();

            const row = e.target.closest('tr');
            const inventory_id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));
            console.log(row)

            if(e.target.classList.contains('edit-btn')) {
                inventoryForm.style.display = "block"
                cancelInventoryBtn.style.display = "block"
                inventoryForm.querySelector('.inventory-image').style.display = "block"
                inventoryForm.reset();

                const inventoryItem = await api.getInventory(inventory_id, token)
                inventoryForm.querySelector('#form-title').innerText = "Update Existing Inventory Item"

                inventoryForm.querySelector('#inventory-name').value = inventoryItem.name
                inventoryForm.querySelector('#inventory-category').value = inventoryItem.category_id;
                inventoryForm.querySelector('#inventory-quantity').value = inventoryItem.quantity; 
                inventoryForm.querySelector('#inventory-minstock').value = inventoryItem.min_stock_level;
                inventoryForm.querySelector('.inventory-image').src = inventoryItem.image_url;
                inventoryForm.querySelector('#inventory-id').value = inventoryItem.id;
            }

            if(e.target.classList.contains('delete-btn')) {
                if(confirm("Are you sure you want to delete this inventory item?")) {
                    try {
                        await api.deleteInventory(inventory_id, token)
                        location.reload()
                    } catch(err) {
                        alert(`Error: ${err.message}`)
                    }
                }
            }
        })
    }
    // (INVENTORY) CREATE
    if(createInventoryBtn) {
        createInventoryBtn.addEventListener('click', (e) => {
            e.preventDefault();

            inventoryForm.reset(); 
            
            inventoryForm.querySelector('#inventory-id').value = "";
            inventoryForm.querySelector('.inventory-image').src = "";
            inventoryForm.querySelector('.inventory-image').style.display = "none"; 
            inventoryForm.querySelector('#form-title').innerText = "Create New Inventory Item";

            inventoryForm.style.display = "block";
            cancelInventoryBtn.style.display = "block";
        })
    }
    if(cancelInventoryBtn) {
        cancelInventoryBtn.addEventListener('click', (e) => {
            e.preventDefault();

            inventoryForm.reset();
            inventoryForm.style.display = "none";
            cancelInventoryBtn.style.display = "none";
            inventoryForm.querySelector('.inventory-image').style.display = "none"
        })
    }
    if(inventoryForm) {
        inventoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                let formData = new FormData();

                const name = inventoryForm.querySelector('#inventory-name').value
                if(name) formData.append('name', name)
                
                const category_id = inventoryForm.querySelector('#inventory-category').value
                if(category_id) formData.append('category_id', category_id)

                const quantity = inventoryForm.querySelector('#inventory-quantity').value
                if (quantity) formData.append('quantity', quantity)
                
                const min_stock_level = inventoryForm.querySelector('#inventory-minstock').value
                if(min_stock_level) formData.append('min_stock_level', min_stock_level) 

                const fileInput = inventoryForm.querySelector('#inventory-image')
                if(fileInput.files[0]) {
                    formData.append('image', fileInput.files[0])
                }

                const staff_id = currentAccount.id
                if(staff_id) formData.append('staff_id', staff_id) 

                const id = inventoryForm.querySelector('#inventory-id').value;
                const token = JSON.parse(localStorage.getItem('token'));

                if(id) {
                    await api.updateInventory(formData, id, token)
                    alert('Inventory item updated successfully!')
                } else {
                    await api.createInventory(formData, token)
                    alert('Inventory item created successfully!')
                }
                

                location.reload();
            } catch(err) {
                alert(`Error: ${err.message}`)
            }
        })
    }



    // *********** SELLERS MANAGEMENT *************
    // 1. LOAD DATA
    if (sellerListDiv) {
        loadData(api.getAllSellers, render.renderSellersTable, sellerListDiv);

        // 2. TABLE EVENT DELEGATION (Edit/Delete)
        sellerListDiv.addEventListener('click', async (e) => {
            e.preventDefault();
            const row = e.target.closest('tr');
            if (!row) return; // Safety check
            
            const id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            // DELETE
            if (e.target.classList.contains('delete-btn')) {
                if (confirm("Are you sure you want to delete this seller profile?")) {
                    try {
                        await api.deleteSeller(id, token);
                        location.reload();
                    } catch (err) {
                        alert(`Error: ${err.message}`);
                    }
                }
            }

            // EDIT
            if (e.target.classList.contains('edit-btn')) {
                try {
                    const seller = await api.getSeller(id, token);
                    
                    sellerForm.reset();
                    sellerForm.style.display = "block";
                    cancelSellerBtn.style.display = "block";
                    
                    // Populate Form
                    sellerForm.querySelector('#form-title').innerText = "Update Seller Profile";
                    sellerForm.querySelector('#seller-id').value = seller.id;
                    sellerForm.querySelector('#seller-name').value = seller.name;
                    sellerForm.querySelector('#seller-category').value = seller.category;
                    sellerForm.querySelector('#seller-platform').value = seller.platform_name;
                    sellerForm.querySelector('#seller-contact').value = seller.contact_num;
                    sellerForm.querySelector('#seller-email').value = seller.email;
                    
                    // Handle Image Preview
                    const imgPreview = sellerForm.querySelector('.seller-image-preview');
                    if(imgPreview) {
                        imgPreview.src = seller.image_path || '';
                        imgPreview.style.display = 'block';
                    }

                } catch (err) {
                    alert(`Error loading seller details: ${err.message}`);
                }
            }
        });
    }
    // 3. SHOW CREATE FORM
    if (createSellerBtn) {
        createSellerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sellerForm.reset();
            sellerForm.style.display = "block";
            cancelSellerBtn.style.display = "block";
            sellerForm.querySelector('#form-title').innerText = "Add New Seller";
            sellerForm.querySelector('#seller-id').value = "";
            
            const imgPreview = sellerForm.querySelector('.seller-image-preview');
            if(imgPreview) imgPreview.style.display = 'none';
        });
    }
    // 4. CANCEL FORM
    if (cancelSellerBtn) {
        cancelSellerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sellerForm.style.display = "none";
            cancelSellerBtn.style.display = "none";
        });
    }
    // 5. SUBMIT FORM
    if (sellerForm) {
        sellerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                let formData = new FormData();
                
                // Get values
                formData.append('name', sellerForm.querySelector('#seller-name').value);
                formData.append('category', sellerForm.querySelector('#seller-category').value);
                formData.append('platform_name', sellerForm.querySelector('#seller-platform').value);
                formData.append('contact_num', sellerForm.querySelector('#seller-contact').value);
                formData.append('email', sellerForm.querySelector('#seller-email').value);
                formData.append('staff_id', currentAccount.id);

                // Image
                const fileInput = sellerForm.querySelector('#seller-image');
                if (fileInput.files[0]) {
                    formData.append('image', fileInput.files[0]);
                }

                const id = sellerForm.querySelector('#seller-id').value;
                const token = JSON.parse(localStorage.getItem('token'));

                if (id) {
                    await api.updateSeller(id, formData, token);
                    alert('Seller updated successfully!');
                } else {
                    await api.createSeller(formData, token);
                    alert('Seller created successfully!');
                }

                location.reload();
            } catch (err) {
                alert(`Error: ${err.message}`);
            }
        });
    }




    // *********** RTS (RETURN-TO-SELLER) MANAGEMENT *************
    // 1. LOAD DATA
    if (rtsListDiv) {
        loadData(api.getAllRTS, render.renderRTSTable, rtsListDiv);

        // 2. TABLE EVENT DELEGATION
        rtsListDiv.addEventListener('click', async (e) => {
            e.preventDefault();
            const row = e.target.closest('tr');
            if (!row) return;

            const id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            // DELETE
            if (e.target.classList.contains('delete-btn')) {
                if (confirm("Delete this RTS record?")) {
                    try {
                        await api.deleteRTS(id, token);
                        location.reload();
                    } catch (err) {
                        alert(`Error: ${err.message}`);
                    }
                }
            }

            if (e.target.classList.contains('edit-btn')) {
                try {
                    const rtsItem = await api.getRTS(id, token);
                    const sellers = await api.getAllSellers(token);
                    
                    const selectBox = rtsForm.querySelector('#rts-seller-id');
                    selectBox.innerHTML = '<option value="">Select a Seller...</option>';
                    
                    sellers.forEach(s => {
                        const option = document.createElement('option');
                        option.value = s.id;
                        option.textContent = s.name;
                        selectBox.appendChild(option);
                    });

                    rtsForm.reset();
                    rtsForm.style.display = "block";
                    cancelRtsBtn.style.display = "block";
                    rtsForm.querySelector('#form-title').innerText = "Update RTS Log";

                    rtsForm.querySelector('#rts-id').value = rtsItem.id;
                    rtsForm.querySelector('#rts-tracking').value = rtsItem.tracking_no;
                    rtsForm.querySelector('#rts-product').value = rtsItem.product_name;
                    rtsForm.querySelector('#rts-customer').value = rtsItem.customer_name;
                    rtsForm.querySelector('#rts-desc').value = rtsItem.description || '';

                    selectBox.value = rtsItem.seller_id;

                } catch (err) {
                    console.error(err);
                    alert("Error loading data: " + err.message);
                }
            }
        });
    }
    // 3. SHOW CREATE FORM (And Populate Sellers Dropdown)
    if (createRtsBtn) {
        createRtsBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Fetch Sellers to populate the dropdown <select id="rts-seller-id">
            try {
                const token = JSON.parse(localStorage.getItem('token'));
                const sellers = await api.getAllSellers(token);
                
                const selectBox = rtsForm.querySelector('#rts-seller-id');
                selectBox.innerHTML = '<option value="">Select a Seller...</option>';
                
                sellers.forEach(s => {
                    const option = document.createElement('option');
                    option.value = s.id;
                    option.textContent = s.name;
                    selectBox.appendChild(option);
                });

                rtsForm.reset();
                rtsForm.style.display = "block";
                cancelRtsBtn.style.display = "block";
                rtsForm.querySelector('#form-title').innerText = "Log Returned Item";
                rtsForm.querySelector('#rts-id').value = "";

            } catch(err) {
                alert("Could not load sellers list.");
            }
        });
    }
    // 4. CANCEL FORM
    if (cancelRtsBtn) {
        cancelRtsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            rtsForm.style.display = "none";
            cancelRtsBtn.style.display = "none";
        });
    }
    // 5. SUBMIT FORM
    if (rtsForm) {
        rtsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const data = {
                    tracking_no: rtsForm.querySelector('#rts-tracking').value,
                    seller_id: rtsForm.querySelector('#rts-seller-id').value,
                    customer_name: rtsForm.querySelector('#rts-customer').value,
                    product_name: rtsForm.querySelector('#rts-product').value,
                    description: rtsForm.querySelector('#rts-desc').value,
                    status: 'pending', // Default
                    staff_id: currentAccount.id
                };

                const id = rtsForm.querySelector('#rts-id').value;
                const token = JSON.parse(localStorage.getItem('token'));

                if (id) {
                    await api.updateRTS(id, data, token);
                    alert('RTS Log updated!');
                } else {
                    await api.createRTS(data, token);
                    alert('Item logged successfully!');
                }
                
                location.reload();
            } catch (err) {
                alert(`Error: ${err.message}`);
            }
        });
    }







   // *********** DASHBOARD LOGIC *************
    if (dashboardTable) {
        loadData(api.getLowStockItems, render.renderLowStockWidget, dashboardTable);
    }
    if (salesChartCanvas) {
        // We can't use the loadData helper here because the render function is different
        (async () => {
            try {
                const token = JSON.parse(localStorage.getItem('token'));
                const result = await api.getSalesChartData(token);
                renderSalesChart(result);
            } catch (err) {
                console.error("Failed to load chart data:", err);
            }
        })();
    }
    // *********** DASHBOARD LOGIC *************
    if (document.querySelector('.stat-card')) { // Check if we are on dashboard page
        try {
            const token = JSON.parse(localStorage.getItem('token'));
            
            // 1. Load Low Stock Table
            loadData(api.getLowStockItems, render.renderLowStockWidget, dashboardTable);

            // 2. Load Stats & Chart
            const stats = await api.getDashboardStats(token);

            // Update KPI Cards (Targeting via index or specific selectors)
            const statValues = document.querySelectorAll('.stat-value');
            if(statValues.length >= 3) {
                // Low Stock Card
                statValues[0].innerText = stats.lowStockCount;
                
                // Sales Card (Format as Currency)
                statValues[1].innerText = new Intl.NumberFormat('en-PH', { 
                    style: 'currency', 
                    currency: 'PHP',
                    maximumFractionDigits: 0 
                }).format(stats.salesMonthTotal);
                
                // Sellers Card
                statValues[2].innerText = stats.sellerCount;
            }

            // Update Chart Text
            const chartTotalEl = document.querySelector('.chart-total');
            if(chartTotalEl) {
                chartTotalEl.innerText = new Intl.NumberFormat('en-PH', { 
                    style: 'currency', currency: 'PHP' 
                }).format(stats.chart.grandTotal);
            }

            // Render Chart
            renderSalesChart(stats.chart);

        } catch (err) {
            console.error("Dashboard Load Error:", err);
        }
    }










    // *********** SALES MANAGEMENT *************
    if (salesListDiv) {
        loadData(api.getAllSales, render.renderSalesTable, salesListDiv);

        salesListDiv.addEventListener('click', async e => {
            const row = e.target.closest('tr');
            if (!row) return;
            const id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            if (e.target.classList.contains('delete-btn')) {
                if (confirm('Delete this sales record? This cannot be undone.')) {
                    try {
                        await api.deleteSale(id, token);
                        location.reload();
                    } catch (err) { alert(`Error: ${err.message}`); }
                }
            }

            if (e.target.classList.contains('edit-btn')) {
                saleForm.reset();
                saleForm.style.display = 'block';
                cancelSaleBtn.style.display = 'block';
                saleForm.querySelector('#form-title').innerText = 'Update Sales Record';

                // Populate form from data attributes
                saleForm.querySelector('#sale-id').value = id;
                saleForm.querySelector('#sale-start-date').value = row.dataset.startDate;
                saleForm.querySelector('#sale-end-date').value = row.dataset.endDate;
                saleForm.querySelector('#sale-amount').value = row.dataset.amount;
                saleForm.querySelector('#sale-notes').value = row.dataset.notes;
            }
        });
    }
    if (createSaleBtn) {
        createSaleBtn.addEventListener('click', () => {
            saleForm.reset();
            saleForm.style.display = 'block';
            cancelSaleBtn.style.display = 'block';
            saleForm.querySelector('#form-title').innerText = 'Add New Sales Record';
            saleForm.querySelector('#sale-id').value = '';
        });
    }
    if (cancelSaleBtn) {
        cancelSaleBtn.addEventListener('click', () => {
            saleForm.style.display = 'none';
            cancelSaleBtn.style.display = 'none';
        });
    }
    if (saleForm) {
        saleForm.addEventListener('submit', async e => {
            e.preventDefault();
            const id = saleForm.querySelector('#sale-id').value;
            const token = JSON.parse(localStorage.getItem('token'));
            const data = {
                week_start_date: saleForm.querySelector('#sale-start-date').value,
                week_end_date: saleForm.querySelector('#sale-end-date').value,
                total_amount: saleForm.querySelector('#sale-amount').value,
                notes: saleForm.querySelector('#sale-notes').value,
            };

            try {
                if (id) {
                    await api.updateSale(id, data, token);
                    alert('Sales record updated!');
                } else {
                    await api.createSale(data, token);
                    alert('Sales record created!');
                }
                location.reload();
            } catch (err) { alert(`Error: ${err.message}`); }
        });
    }







    












    // *********** DOCUMENTS MANAGEMENT *************
    if (documentListDiv) {
        loadData(api.getAllDocuments, render.renderDocumentsTable, documentListDiv);
        
        documentListDiv.addEventListener('click', async e => {
            const row = e.target.closest('tr');
            if (!row) return;
            const id = row.dataset.id;
            const token = JSON.parse(localStorage.getItem('token'));

            // DELETE
            if (e.target.classList.contains('delete-btn')) {
                if (confirm('Are you sure you want to delete this document record?')) {
                    try {
                        await api.deleteDocument(id, token);
                        location.reload();
                    } catch (err) { alert(`Error: ${err.message}`); }
                }
            }

            // EDIT (NEW FUNCTIONALITY)
            if (e.target.classList.contains('edit-btn')) {
                // Prevent "View" link default behavior if it's the edit button
                e.preventDefault(); 
                
                // Note: In render.js, the 'edit-btn' is actually a 'View' link. 
                // We need to change render.js to have a separate Edit button. 
                // SEE STEP 2 BELOW.
            }

            // EDIT LOGIC (Actual)
            if (e.target.classList.contains('real-edit-btn')) {
                documentForm.reset();
                documentForm.style.display = 'block';
                cancelDocumentBtn.style.display = 'block';
                documentForm.querySelector('#form-title').innerText = "Update Document";
                
                // Set the ID in the hidden field
                documentForm.querySelector('#document-id').value = id;

                // Populate form from table data (or fetch from API if data isn't in DOM)
                const cells = row.querySelectorAll('td');
                // Assuming render order: Title, Category, Date, Status, Actions
                documentForm.querySelector('#document-title').value = cells[0].innerText;
                documentForm.querySelector('#document-category').value = cells[1].innerText;
                documentForm.querySelector('#document-expiry').value = cells[2].innerText;

                // Hide file input for edit mode (optional, or make it optional)
                documentForm.querySelector('#document-file').removeAttribute('required');
                const label = documentForm.querySelector('label[for="document-file"]');
                if(label) label.innerText = "Upload File (Leave empty to keep current)";
            }
        });
    }
    if (createDocumentBtn) {
        createDocumentBtn.addEventListener('click', () => {
            documentForm.reset();
            documentForm.style.display = 'block';
            cancelDocumentBtn.style.display = 'block';
            documentForm.querySelector('#form-title').innerText = "Upload New Document";
            documentForm.querySelector('#document-id').value = ""; // Clear ID
            
            // Make file required for new
            documentForm.querySelector('#document-file').setAttribute('required', 'true');
            const label = documentForm.querySelector('label[for="document-file"]');
            if(label) label.innerText = "Upload File";
        });
    }
    if (documentForm) {
        documentForm.addEventListener('submit', async e => {
            e.preventDefault();
            const token = JSON.parse(localStorage.getItem('token'));
            const id = documentForm.querySelector('#document-id').value;

            if (id) {
                // UPDATE MODE (JSON)
                const data = {
                    title: documentForm.querySelector('#document-title').value,
                    category: documentForm.querySelector('#document-category').value,
                    expiry_date: documentForm.querySelector('#document-expiry').value
                };

                try {
                    await api.updateDocument(id, data, token);
                    alert('Document updated successfully!');
                    location.reload();
                } catch (err) { alert(`Error: ${err.message}`); }

            } else {
                // CREATE MODE (FormData)
                const formData = new FormData();
                formData.append('title', documentForm.querySelector('#document-title').value);
                formData.append('category', documentForm.querySelector('#document-category').value);
                formData.append('expiry_date', documentForm.querySelector('#document-expiry').value);
                
                const fileInput = documentForm.querySelector('#document-file');
                if (fileInput.files[0]) {
                    formData.append('document', fileInput.files[0]);
                } else {
                    alert('Please select a file to upload.');
                    return;
                }

                try {
                    await api.createDocument(formData, token);
                    alert('Document uploaded successfully!');
                    location.reload();
                } catch (err) { alert(`Error: ${err.message}`); }
            }
        });
    }






    // *********** AUDIT LOGS *************
    if (auditListDiv) {
        loadData(api.getAuditLogs, render.renderAuditLogTable, auditListDiv);
        
        // Optional: Simple client-side search/filter
        const searchInput = document.querySelector('#audit-search');
        if(searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                const term = e.target.value.toLowerCase();
                const rows = auditListDiv.querySelectorAll('tbody tr');
                
                rows.forEach(row => {
                    const text = row.innerText.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                });
            });
        }
    }





    // (AUTH) GATEKEEPERS
    if(!window.location.pathname.endsWith('index.html')) {
        checkSession();

        if(!localStorage.getItem('token')) {
            alert('You must be logged in to view this page. Redirecting..')
            window.location.href = 'index.html'
        }
    }
    if(window.location.pathname.endsWith('index.html') && localStorage.getItem('token')) {
        alert("You have an existing session. Logging in.");
        location.href = 'dashboard.html';
    }
})