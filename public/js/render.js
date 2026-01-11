


// ACCOUNTS/AUTHENTICATION
export function renderAccountsTable(result, container) {
    container.innerHTML = ``;

    const table = document.createElement('table')
	table.className = 'accounts table'
    table.innerHTML = `
        <thead>
            <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Active</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    result.forEach(element => {
        const row = document.createElement('tr');
        row.dataset.id = element.id;
        row.classname = 'account-item';

        let roleVal = '';
        if(element.role_id === 1) {
            roleVal = 'Admin';
        } else if(element.role_id === 2) {
            roleVal = 'Staff';
        }

        let isActiveVal = '';
        if(element.is_active === 1) {
            isActiveVal = 'yes';
        } else if(element.is_active === 0) {
            isActiveVal = 'no';
        }

        row.innerHTML = `
            <td>${element.username}</td>
            <td>${element.email}</td>
            <td>${roleVal}</td>
            <td>${isActiveVal}</td>
            <td>
                <div class="action-buttons">
                    <button class='btn edit-btn'>Edit</button>
                    <button class='btn delete-btn'>Delete</button>
                    <button class='btn disable-btn'>Disable</button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
    if(result.length < 1) {
        tbody.innerHTML = `
            <td colspan="4" class="no-data" style="text-align:center;">There is no data here..</td>
        `
    }

    container.appendChild(table)
}