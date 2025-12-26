import * as api from './api.js'

export function renderManageUsers(contentDiv, data) {
    contentDiv.innerHTML = ''

    let content = '';

    data.forEach(item => {
        if(item.is_active === 0) {
            return
        } else {
            content += `
                <tr data-id=${item.id}>
                    <td>${item.id}</td>
                    <td>${item.username}</td>
                    <td>${item.email}</td>
                    <td>${item.role_id}</td>
                    <td>${item.created_at}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="edit-btn">Edit</button>
                            <button class="delete-btn">Delete</button>
                        </div>
                    </td>
                </tr>
            `
        }
        
    })

    contentDiv.innerHTML = `
        <div class="header-content">
            <h1>Manage Users</h1>
            <button id="add-new-user">Add new user</button>
        </div>

        <div class="main-content">
            <div class="form-area">
                <form id="user-form">
                    <h2 class="form-title">Manage User</h2>
                    <input type="text" class="user-id" style="display: none;">
                    <div class="form-item">
                        <label>Username</label>
                        <input type="text" class="user-username" placeholder="Enter your username..">
                    </div>
                    <div class="form-item">
                        <label>Email</label>
                        <input type="email" class="user-email" placeholder="Enter your email..">
                    </div>
                    <div class="form-item">
                        <label>Password</label>
                        <input type="password" class="user-password" placeholder="Enter your password..">
                    </div>
                    <div class="form-item">
                        <label>Role (select tag to dapat)</label>
                        <input type="text" class="user-role" placeholder="Enter your role..">
                    </div>
                    <button type="submit">Submit</button>
                    <a id="cancel-user">Cancel</a>
                </form>
            </div>
            <div class="table-area">
                <table id="users-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role ID</th>
                            <th>Created At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${content}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="footer-content">

        </div>
    `
    let userForm = contentDiv.querySelector('#user-form')
    let usersTable = contentDiv.querySelector('#users-table')

    let addNewUserBtn = contentDiv.querySelector('#add-new-user')
    let cancelBtn = contentDiv.querySelector('#cancel-user')

    let updateUserForm = contentDiv.querySelector('#user-update-form')
    let cancelUpdateBtn = contentDiv.querySelector('#cancel-update')

    if(usersTable) {
        usersTable.addEventListener('click', async (e) => {
            e.preventDefault();

            const row = e.target.closest('tr')
            const user_id = row.dataset.id
            const editBtn = e.target.closest('.edit-btn')
            const deleteBtn = e.target.closest('.delete-btn')

            // For Edit
            if(editBtn) {
                userForm.reset()
                userForm.style.display = "block";

                const token = JSON.parse(localStorage.getItem('token'));
                const user = await api.getUser(token, user_id)
                userForm.querySelector('.form-title').innerText = "Update user";

                userForm.querySelector('.user-id').value = user_id;
                userForm.querySelector('.user-username').value = user.username;
                userForm.querySelector('.user-email').value = user.email;
                userForm.querySelector('.user-password').value = ""
                userForm.querySelector('.user-role').value = user.role_id;
            }

            if(deleteBtn) {
                if(confirm("Are you sure you want to delete this user?")) {
                    try {
                        const token = JSON.parse(localStorage.getItem('token'));
                        await api.deleteUser(token, user_id)
                        
                        alert("Deleted user successfully.")
                        location.reload()
                    } catch(err) {
                        alert(`Error: ${err.message}`)
                    }
                }
            }
        })
    }
    if(userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault()
            
            const data = {
                username: userForm.querySelector('.user-username').value.trim() || null,
                email: userForm.querySelector('.user-email').value.trim() || null,
                password: userForm.querySelector('.user-password').value.trim() || null,
                role_id: userForm.querySelector('.user-role').value.trim() || null
            }

            const token = JSON.parse(localStorage.getItem('token'));
            const id = document.querySelector('.user-id').value;
            console.log(id)
            if (id) {
                alert("Updated user successfully.")
                await api.updateUser(token, data, id);
            } else {
                alert("Created user successfully.")
                await api.createUser(token, data);
            }

            location.reload()
        })
    }
    if(addNewUserBtn){
        addNewUserBtn.addEventListener('click', (e) => {
            userForm.style.display = "block";
            userForm.querySelector('.user-id').value = "";
            userForm.querySelector('.form-title').innerText = "Add new user";
            userForm.reset()
        })
    }
    if(cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            userForm.style.display = "none";
            userForm.reset()
        })
    }
}

export function renderDashboard(contentDiv) {
    contentDiv.innerHTML = '';

    contentDiv.innerHTML = `
        <h1>Dashboard</h1>

        yo
    `
}