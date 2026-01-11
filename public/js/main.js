import * as api from './api.js'
import * as render from './render.js'

document.addEventListener('DOMContentLoaded', () => {


    // *********** CONSTANTS *************
    const loginForm = document.querySelector('#login-form');
    const accountForm = document.querySelector('#account-form');

    const logoutBtn = document.querySelector('#logout-button');
    const createAccountBtn = document.querySelector('#create-account-btn');
    const cancelAccountBtn = document.querySelector('#cancel-account-btn');

    const accountListDiv = document.querySelector('#account-list');



    // *********** RENDERERS *************
    async function loadAccounts() {
        try {
            const token = JSON.parse(localStorage.getItem('token'));
			const result = await api.getAllAccounts(token);
			render.renderAccountsTable(result, accountListDiv);
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
            e.preventDefault()

            accountForm.reset();
            accountForm.style.display = "block"
            cancelAccountBtn.style.display = "block"
            accountForm.querySelector('#form-title').innerText = "Create New Account"
        })
    }
    if(cancelAccountBtn) {
        cancelAccountBtn.addEventListener('click', (e) => {
            e.preventDefault()

            accountForm.reset();
            accountForm.style.display = "none"
            cancelAccountBtn.style.display = "none"
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
        loadAccounts();

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
    


    // (AUTH) Gatekeepers
    if(!(window.location.pathname.endsWith('index.html'))) {
        // TODO: create a api/controller that checks if the token is verified/valid and put it on else statement.

        if(!localStorage.getItem('token')) {
            alert('You must be logged in to view this page. Redirecting..')
            window.location.href = 'index.html'
        } else {

        }
    }
    if(window.location.pathname.endsWith('index.html') && localStorage.getItem('token')) {
        alert("You have an existing session. Logging in.");
        location.href = 'dashboard.html';
    }
})