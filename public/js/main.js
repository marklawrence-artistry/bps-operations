import * as api from './api.js'
import * as render from './render.js'

let currentAccount = null;

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



    // *********** RENDERERS *************
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