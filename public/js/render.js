


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
                <th>Status</th>
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
            isActiveVal = '<span class="status-badge active">Active</span>';
        } else if(element.is_active === 0) {
            isActiveVal = '<span class="status-badge critical">Disabled</span>';
        }

        let toggleBtn = '';
        if(element.is_active === 1) {
            toggleBtn = `<button class='btn disable-btn'>Disable</button>`;
        } else {
            toggleBtn = `<button class='btn enable-btn'>Enable</button>`;
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
                    ${toggleBtn}
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
                <th>ID</th>
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



// SELLERS TABLE
export function renderSellersTable(result, container) {
    container.innerHTML = ``;

    const table = document.createElement('table');
    table.className = 'seller table'; // Consistent class name
    table.innerHTML = `
        <thead>
            <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Platform</th>
                <th>Contact Info</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    result.forEach(element => {
        const row = document.createElement('tr');
        row.dataset.id = element.id;
        
        // Handle image: check if path exists or use a placeholder if needed
        const imgDisplay = element.image_path 
            ? `<img src="${element.image_path}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">` 
            : `<span style="font-size:0.8rem; color:#ccc;">No Img</span>`;

        row.innerHTML = `
            <td>${imgDisplay}</td>
            <td><strong>${element.name}</strong></td>
            <td>${element.category}</td>
            <td><span class="status-badge" style="background:#e0f2fe; color:#0369a1;">${element.platform_name}</span></td>
            <td>
                <div style="font-size: 0.85rem;">
                    <div>📞 ${element.contact_num}</div>
                    <div style="color: #6b7280;">✉️ ${element.email}</div>
                </div>
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
            <td colspan="6" class="no-data" style="text-align:center; padding: 2rem;">No sellers found.</td>
        `;
    }

    container.appendChild(table);
}



// RTS (Returned-to-Seller) TABLE
export function renderRTSTable(result, container) {
    container.innerHTML = ``;

    const table = document.createElement('table');
    table.className = 'rts table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Tracking No.</th>
                <th>Seller</th>
                <th>Product</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    result.forEach(element => {
        const row = document.createElement('tr');
        row.dataset.id = element.id;

        // Styling status based on text
        let statusColor = element.status === 'pending' ? 'low' : 'active'; // reusing your CSS classes

        row.innerHTML = `
            <td><strong>${element.tracking_no}</strong></td>
            <td>${element.seller_name || 'Unknown ID: ' + element.seller_id}</td>
            <td>
                <div style="font-size: 0.9rem; font-weight: 600;">${element.product_name}</div>
                <div style="font-size: 0.8rem; color: #888;">${element.description || ''}</div>
            </td>
            <td>${element.customer_name}</td>
            <td><span class="status-badge ${statusColor}">${element.status}</span></td>
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
            <td colspan="6" class="no-data" style="text-align:center; padding: 2rem;">No returned items found.</td>
        `;
    }

    container.appendChild(table);
}




// SALES TABLE
export function renderSalesTable(result, container) {
    container.innerHTML = ``;
    const table = document.createElement('table');
    table.className = 'sales table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Week Period</th>
                <th>Total Amount (PHP)</th>
                <th>Notes</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    result.forEach(element => {
        const row = document.createElement('tr');
        row.dataset.id = element.id;

        // Store full data for editing
        row.dataset.startDate = element.week_start_date;
        row.dataset.endDate = element.week_end_date;
        row.dataset.amount = element.total_amount;
        row.dataset.notes = element.notes || '';

        const formattedAmount = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(element.total_amount);

        row.innerHTML = `
            <td>${element.week_start_date} to ${element.week_end_date}</td>
            <td><strong>${formattedAmount}</strong></td>
            <td>${element.notes || 'N/A'}</td>
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
        tbody.innerHTML = `<td colspan="4" class="no-data" style="text-align:center; padding: 2rem;">No sales records found.</td>`;
    }
    container.appendChild(table);
}








// DOCUMENTS TABLE
export function renderDocumentsTable(result, container) {
    container.innerHTML = ``;
    const table = document.createElement('table');
    table.className = 'documents table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Document Title</th>
                <th>Category</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    result.forEach(element => {
        const row = document.createElement('tr');
        row.dataset.id = element.id;

        const expiryDate = new Date(element.expiry_date);
        const today = new Date();
        today.setHours(0,0,0,0); // Normalize today's date

        let statusBadge = '<span class="status-badge active">Active</span>';
        if (expiryDate < today) {
            statusBadge = '<span class="status-badge critical">Expired</span>';
        } else if ((expiryDate - today) / (1000 * 3600 * 24) <= 30) {
            statusBadge = '<span class="status-badge low">Expires Soon</span>';
        }

        row.innerHTML = `
            <td><strong>${element.title}</strong></td>
            <td>${element.category}</td>
            <td>${element.expiry_date}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="action-buttons">
                    <a href="${element.file_path}" target="_blank" class="btn edit-btn" style="text-decoration:none;">View</a>
                    <button class='btn delete-btn'>Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    if(result.length < 1) {
        tbody.innerHTML = `<td colspan="5" class="no-data" style="text-align:center; padding: 2rem;">No documents uploaded.</td>`;
    }
    container.appendChild(table);
}








// DASHBOARD - LOW STOCK WIDGET
export function renderLowStockWidget(result, container) {
    const tbody = container.querySelector('tbody');
    tbody.innerHTML = ''; // Clear existing rows

    if (result.length < 1) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 1rem;">All items are well-stocked!</td></tr>`;
        return;
    }

    result.slice(0, 5).forEach(item => { // Show max 5 items
        const row = document.createElement('tr');
        const statusClass = item.quantity === 0 ? 'critical' : 'low';
        const statusText = item.quantity === 0 ? 'Out of Stock' : 'Low';
        
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.category_name || 'N/A'}</td>
            <td>${item.quantity}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        `;
        tbody.appendChild(row);
    });
}







// AUDIT LOGS TABLE
export function renderAuditLogTable(result, container) {
    container.innerHTML = ``;
    const table = document.createElement('table');
    table.className = 'audit table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Date & Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Target</th>
                <th>Description</th>
                <th>IP Address</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    result.forEach(element => {
        const row = document.createElement('tr');
        
        // Format Date
        const dateObj = new Date(element.created_at);
        const dateString = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        // Badge Color Logic
        let badgeClass = 'low'; // Default yellow
        if (element.action_type === 'CREATE') badgeClass = 'active'; // Green
        if (element.action_type === 'DELETE') badgeClass = 'critical'; // Red
        if (element.action_type === 'LOGIN') badgeClass = ''; // Default gray-ish (custom style below if needed)

        // Custom style for badge if it's LOGIN (since you only have low/active/critical in CSS)
        let badgeStyle = '';
        if (element.action_type === 'LOGIN') badgeStyle = 'style="background-color:#e5e7eb; color:#374151;"';
        if (element.action_type === 'UPDATE') badgeStyle = 'style="background-color:#dbeafe; color:#1e40af;"';

        row.innerHTML = `
            <td style="font-size:0.85rem; color:#6b7280;">${dateString}</td>
            <td><strong>${element.username || 'Unknown'}</strong></td>
            <td><span class="status-badge ${badgeClass}" ${badgeStyle}>${element.action_type}</span></td>
            <td>${element.table_name} <span style="font-size:0.8rem; color:#999;">(ID: ${element.record_id || '-'})</span></td>
            <td>${element.description}</td>
            <td style="font-family: monospace; font-size: 0.8rem;">${element.ip_address || '::1'}</td>
        `;
        tbody.appendChild(row);
    });

    if(result.length < 1) {
        tbody.innerHTML = `<td colspan="6" class="no-data" style="text-align:center; padding: 2rem;">No activity recorded yet.</td>`;
    }
    container.appendChild(table);
}