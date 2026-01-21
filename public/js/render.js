


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
        if(element.role_id == 1) {
            roleVal = 'Admin';
        } else if(element.role_id == 2) {
            roleVal = 'Staff';
        }

        let isActiveVal = '';
        if(element.is_active === 1) {
            isActiveVal = 'Yes';
        } else if(element.is_active === 0) {
            isActiveVal = 'No';
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


// INVENTORY CATEGORIES
export function renderInventoryCategoriesTable(result, container) {
    container.innerHTML = ``;

    const table = document.createElement('table')
	table.className = 'inventory_categories table'
    table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    result.forEach(element => {
        const row = document.createElement('tr');
        row.dataset.id = element.id;
        row.classname = 'inventory-category-item';

        row.innerHTML = `
            <td>${element.id}</td>
            <td>${element.name}</td>
            <td>${element.description}</td>
            <td>
                <div class="action-buttons">
                    <button class='btn delete-btn'>Delete</button>
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
// INVENTORY
export function renderInventoryTable(result, container) {
    container.innerHTML = ``;

    const table = document.createElement('table')
	table.className = 'inventory table'
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Min. Stock Level</th>
                <th>Image</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    result.forEach(element => {
        const row = document.createElement('tr');
        row.dataset.id = element.id;
        row.classname = 'inventory-item';

        row.innerHTML = `
            <td>${element.id}</td>
            <td>${element.name}</td>
            <td>${element.category_id}</td>
            <td>${element.quantity}</td>
            <td>${element.min_stock_level}</td>
            <td>
                <img src=${element.image_url} style="height: 100px;">
            </td>
            <td>
                <div class="action-buttons">
                    <button class='btn edit-btn'>Edit</button>
                    <button class='btn delete-btn'>Delete</button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
    if(result.length < 1) {
        tbody.innerHTML = `
            <td colspan="7" class="no-data" style="text-align:center;">There is no data here..</td>
        `
    }

    container.appendChild(table)
}