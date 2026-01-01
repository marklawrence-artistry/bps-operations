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
        <div class="content-wrapper manage-user-container">
            <div class="manage-users-header">
                <h1>Manage User Accounts</h1>
            </div>

            <div class="controls-row">
                <div class="filter-group">
                    <button class="filter-pill orange">Staffs</button>
                    <button class="filter-pill dark-orange">Admin</button>
                </div>
                
                <div class="right-controls">
                    <div class="search-box">
                        <img src="icons/Manage User Acc Page/search_icon.png" alt="Search">
                        <input type="text" placeholder="Search">
                    </div>
                    <button id="add-new-user">
                        <img src="icons/Manage User Acc Page/add_account_icon.png" alt="+">
                        <span>Add New Account</span>
                    </button>
                </div>
            </div>

            <div class="manage-content-body">
                <div class="table-card">
                    <div class="table-area">
                        <table id="users-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role ID</th>
                                    <th>Created at</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${content}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="table-pagination">
                        &lt; 1 2 3 4 5 6 &gt;
                    </div>
                </div>

                <!-- Form Side Panel (Directly ID'd for JS toggling) -->
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
                        <label>Role ID</label>
                        <input type="text" class="user-role" placeholder="Enter role ID (e.g. 1)">
                    </div>
                    <button type="submit">Submit</button>
                    <a id="cancel-user">Cancel</a>
                </form>
            </div>
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

export async function renderDashboard(contentDiv) {
    // 1. Inject HTML Structure
    contentDiv.innerHTML = `
        <div class="content-wrapper">
            <!-- Header -->
            <div class="dashboard-header">
                <h1>Overview</h1>
                <div class="user-info">
                    <span class="username">Username</span>
                    <span class="role">Role</span>
                </div>
            </div>

            <!-- Stats Cards -->
            <div class="stats-container">
                <!-- Low Stocks Card -->
                <div class="stat-card">
                    <div>
                        <div class="stat-label">Total no. of</div>
                        <div class="stat-title">Low Stocks</div>
                    </div>
                    <div class="stat-value-area">
                        <div class="stat-value">120+</div>
                        <img src="icons/Dashboard Page/low_stocks_icon.png" class="stat-icon" alt="Icon">
                    </div>
                </div>

                <!-- Sales Card -->
                <div class="stat-card">
                    <div>
                        <div class="stat-label">Total sales of</div>
                        <div class="stat-title">January</div>
                    </div>
                    <div class="stat-value-area">
                        <div class="stat-value">8,475k</div>
                        <img src="icons/Dashboard Page/total_sales_icon.png" class="stat-icon" alt="Icon">
                    </div>
                </div>

                <!-- Sellers Card -->
                <div class="stat-card">
                    <div>
                        <div class="stat-label">Total no. of</div>
                        <div class="stat-title">Sellers</div>
                    </div>
                    <div class="stat-value-area">
                        <div class="stat-value">120+</div>
                        <img src="icons/Dashboard Page/total_sellers_icon.png" class="stat-icon" alt="Icon">
                    </div>
                </div>
            </div>

            <!-- Chart Section -->
            <div class="chart-section">
                <div class="chart-header">
                    <div class="chart-title">
                        <h2>Average Sales per Month</h2>
                        <div class="chart-subtitle">Grand Total: 475k</div>
                    </div>
                    <div class="chart-stat">400k+</div>
                </div>
                
                <div class="chart-container-box">
                    <canvas id="salesChart"></canvas>
                </div>
            </div>
        </div>
    `;

    // 2. Initialize Chart.js
    // Wait for DOM update
    setTimeout(() => {
        const ctx = document.getElementById('salesChart').getContext('2d');
        
        // Gradient for the line fill (optional, if design implies it, otherwise just line)
        // Design shows a simple blue line.

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['100', '200', '300', '400'], // X-axis labels from image
                datasets: [{
                    label: 'Sales',
                    data: [100, 200, 300, 400], // Linear growth data to match line
                    borderColor: '#4FC3F7', // Light Blue color
                    backgroundColor: 'rgba(79, 195, 247, 0.1)',
                    borderWidth: 2,
                    tension: 0, // Straight line
                    pointRadius: 0, // No points visible on the line usually, or small
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // No legend shown in image
                    },
                    tooltip: {
                        enabled: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#e0e0e0',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#9E9E9E',
                            stepSize: 100
                        }
                    },
                    x: {
                        grid: {
                            display: false // No vertical grid lines usually
                        },
                        ticks: {
                            color: '#9E9E9E'
                        }
                    }
                },
                layout: {
                    padding: 0
                }
            }
        });
    }, 0);
}