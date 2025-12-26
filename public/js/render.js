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
        <h1>Manage Users</h1>

        <button id="add-user">Add New</button>
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
    `

    let usersTable = contentDiv.querySelector('#users-table')
    if(usersTable) {
        usersTable.addEventListener('click', async (e) => {
            e.preventDefault();

            const row = e.target.closest('tr')
            const user_id = row.dataset.id
            const editBtn = e.target.closest('.edit-btn')
            const deleteBtn = e.target.closest('.delete-btn')

            if(editBtn) {
                console.log(user_id)
            }

            if(deleteBtn) {
                if(confirm("Are you sure you want to delete this user?")) {
                    try {
                        const token = JSON.parse(localStorage.getItem('token'));
                        const data = await api.deleteUser(token, user_id)
                        console.log(data)

                        alert("Deleted user successfully.")
                        location.reload()
                    } catch(err) {
                        alert(`Error: ${err.message}`)
                    }
                }
            }
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