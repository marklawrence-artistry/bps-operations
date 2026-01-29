// --- HELPER: Renders Pagination Controls ---
export function renderPagination(meta, container, onPageClick) {
    container.innerHTML = '';
    
    if (!meta || meta.totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-arrow prev';
    prevBtn.innerHTML = '&lt;';
    prevBtn.disabled = meta.current === 1;
    prevBtn.onclick = () => onPageClick(meta.current - 1);
    container.appendChild(prevBtn);

    // Page Numbers
    const spanContainer = document.createElement('span');
    spanContainer.className = 'page-numbers';
    
    // Logic to show limited page numbers if there are too many
    let startPage = Math.max(1, meta.current - 2);
    let endPage = Math.min(meta.totalPages, meta.current + 2);

    if (startPage > 1) {
        const span = document.createElement('span');
        span.className = 'page-num';
        span.innerText = '1';
        span.onclick = () => onPageClick(1);
        spanContainer.appendChild(span);
        if (startPage > 2) spanContainer.appendChild(document.createTextNode('...'));
    }

    for (let i = startPage; i <= endPage; i++) {
        const span = document.createElement('span');
        span.className = `page-num ${i === meta.current ? 'active' : ''}`;
        span.innerText = i;
        span.onclick = () => onPageClick(i);
        spanContainer.appendChild(span);
    }

    if (endPage < meta.totalPages) {
        if (endPage < meta.totalPages - 1) spanContainer.appendChild(document.createTextNode('...'));
        const span = document.createElement('span');
        span.className = 'page-num';
        span.innerText = meta.totalPages;
        span.onclick = () => onPageClick(meta.totalPages);
        spanContainer.appendChild(span);
    }

    container.appendChild(spanContainer);

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-arrow next';
    nextBtn.innerHTML = '&gt;';
    nextBtn.disabled = meta.current === meta.totalPages;
    nextBtn.onclick = () => onPageClick(meta.current + 1);
    container.appendChild(nextBtn);
}

// --- HELPER: Renders Empty State ---
function renderEmptyState(tbody, colSpan, message) {
    tbody.innerHTML = `
        <tr>
            <td colspan="${colSpan}" class="no-data" style="text-align:center; padding: 2rem; color: #6b7280;">
                ${message}
            </td>
        </tr>
    `;
}

// 1. ACCOUNTS TABLE
export function renderAccountsTable(data, container) {
    container.innerHTML = ``;
    const table = document.createElement('table');
    table.className = 'accounts table';
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

    if (!data || data.length === 0) {
        renderEmptyState(tbody, 5, "No accounts found.");
    } else {
        data.forEach(element => {
            const row = document.createElement('tr');
            row.dataset.id = element.id;
            
            const roleVal = element.role_id === 1 ? 'Admin' : 'Staff';
            const statusBadge = element.is_active === 1 
                ? '<span class="status-badge active">Active</span>' 
                : '<span class="status-badge critical">Disabled</span>';
            
            const toggleBtn = element.is_active === 1 
                ? `<button class='btn disable-btn'>Disable</button>` 
                : `<button class='btn enable-btn'>Enable</button>`;

            row.innerHTML = `
                <td><strong>${element.username}</strong></td>
                <td>${element.email}</td>
                <td>${roleVal}</td>
                <td>${statusBadge}</td>
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
    }
    container.appendChild(table);
}

// 2. INVENTORY CATEGORIES TABLE
export function renderInventoryCategoriesTable(data, container) {
    container.innerHTML = ``;
    const table = document.createElement('table');
    table.className = 'inventory_categories table';
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

    if (!data || data.length === 0) {
        renderEmptyState(tbody, 3, "No categories found.");
    } else {
        data.forEach(element => {
            const row = document.createElement('tr');
            row.dataset.id = element.id;
            row.innerHTML = `
                <td><strong>${element.name}</strong></td>
                <td>${element.description}</td>
                <td>
                    <div class="action-buttons">
                        <button class='btn delete-btn'>Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    container.appendChild(table);
}

// 3. INVENTORY TABLE
export function renderInventoryTable(data, container) {
    container.innerHTML = ``;
    const table = document.createElement('table');
    table.className = 'inventory table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Min. Level</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    if (!data || data.length === 0) {
        renderEmptyState(tbody, 7, "No inventory items found.");
    } else {
        data.forEach(element => {
            const row = document.createElement('tr');
            row.dataset.id = element.id;
            
            const imgDisplay = element.image_url 
                ? `<img src="${element.image_url}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">` 
                : `<span style="color:#ccc; font-size:0.8rem;">No Img</span>`;

            const statusClass = element.quantity <= element.min_stock_level ? 'critical' : 'active';
            const statusText = element.quantity <= element.min_stock_level ? 'Low Stock' : 'Good';

            row.innerHTML = `
                <td>${imgDisplay}</td>
                <td><strong>${element.name}</strong></td>
                <td>${element.category_name || 'Uncategorized'}</td>
                <td>${element.quantity}</td>
                <td>${element.min_stock_level}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class='btn edit-btn'>Edit</button>
                        <button class='btn delete-btn'>Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    container.appendChild(table);
}

// 4. SELLERS TABLE
export function renderSellersTable(data, container) {
    container.innerHTML = ``;
    const table = document.createElement('table');
    table.className = 'seller table';
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

    if (!data || data.length === 0) {
        renderEmptyState(tbody, 6, "No sellers found.");
    } else {
        data.forEach(element => {
            const row = document.createElement('tr');
            row.dataset.id = element.id;
            
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
    }
    container.appendChild(table);
}

// 5. RTS TABLE
export function renderRTSTable(data, container) {
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

    if (!data || data.length === 0) {
        renderEmptyState(tbody, 6, "No returned items found.");
    } else {
        data.forEach(element => {
            const row = document.createElement('tr');
            row.dataset.id = element.id;

            let statusColor = element.status === 'pending' ? 'low' : 'active';

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
    }
    container.appendChild(table);
}

// 6. SALES TABLE
export function renderSalesTable(data, container) {
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

    if (!data || data.length === 0) {
        renderEmptyState(tbody, 4, "No sales records found.");
    } else {
        data.forEach(element => {
            const row = document.createElement('tr');
            row.dataset.id = element.id;
            
            // Store data for edits
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
    }
    container.appendChild(table);
}

// 7. DOCUMENTS TABLE
export function renderDocumentsTable(data, container) {
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

    if (!data || data.length === 0) {
        renderEmptyState(tbody, 5, "No documents uploaded.");
    } else {
        data.forEach(element => {
            const row = document.createElement('tr');
            row.dataset.id = element.id;

            const expiryDate = new Date(element.expiry_date);
            const today = new Date();
            today.setHours(0,0,0,0);

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
                        <a href="${element.file_path}" target="_blank" class="btn" style="background:#e0f2fe; color:#0369a1; text-decoration:none;">View</a>
                        <button class='btn real-edit-btn' style="background-color: #f3f4f6; color: #1f2937;">Edit</button>
                        <button class='btn delete-btn'>Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    container.appendChild(table);
}

// 8. AUDIT LOG TABLE
export function renderAuditLogTable(data, container) {
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

    if (!data || data.length === 0) {
        renderEmptyState(tbody, 6, "No activity recorded yet.");
    } else {
        data.forEach(element => {
            const row = document.createElement('tr');
            const dateObj = new Date(element.created_at);
            const dateString = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            let badgeClass = 'low';
            if (element.action_type === 'CREATE') badgeClass = 'active';
            if (element.action_type === 'DELETE') badgeClass = 'critical';

            row.innerHTML = `
                <td style="font-size:0.85rem; color:#6b7280;">${dateString}</td>
                <td><strong>${element.username || 'Unknown'}</strong></td>
                <td><span class="status-badge ${badgeClass}">${element.action_type}</span></td>
                <td>${element.table_name} <span style="font-size:0.8rem; color:#999;">(ID: ${element.record_id || '-'})</span></td>
                <td>${element.description}</td>
                <td style="font-family: monospace; font-size: 0.8rem;">${element.ip_address || '::1'}</td>
            `;
            tbody.appendChild(row);
        });
    }
    container.appendChild(table);
}

// 9. DASHBOARD LOW STOCK WIDGET
export function renderLowStockWidget(data, container) {
    const tbody = container.querySelector('tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        renderEmptyState(tbody, 4, "All items are well-stocked!");
    } else {
        data.forEach(item => {
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
}