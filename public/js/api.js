// --- CENTRAL FETCH WRAPPER ---
async function request(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errText = await response.text();
            let errorMessage = "An error occurred.";
            try {
                // Safely try to extract backend message
                const errJson = JSON.parse(errText);
                errorMessage = errJson.data || errJson.message || errorMessage;
            } catch (e) {
                // If it's HTML (like 502 Bad Gateway), grab the first 50 chars
                errorMessage = "Server error: " + errText.substring(0, 50);
            }
            throw new Error(errorMessage); // Throw clean error
        }
        return response;
    } catch (err) {
        // DETECT OFFLINE OR SERVER DOWN
        if (!navigator.onLine || err.message === 'Failed to fetch' || err.message.includes('unreachable')) {
            if (window.ConnectivityManager) window.ConnectivityManager.handleOffline();

            // OFFLINE OUTBOX LOGIC
            if (options.method && options.method !== 'GET') {
                if (options.body instanceof FormData) throw new Error("File uploads are disabled while offline.");
                const outbox = JSON.parse(localStorage.getItem('bps_outbox')) || [];
                outbox.push({ url, method: options.method, body: options.body, token: options.headers?.Authorization });
                localStorage.setItem('bps_outbox', JSON.stringify(outbox));
                return { json: async () => ({ success: true, data: "Saved offline. Will sync when connection is restored." }) };
            }
        }
        throw new Error(err.message || "Server unreachable. Please check your connection.");
    }
}

// (AUTH) Login
export async function loginAccount(credentials) {
    const response = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (AUTH) Create Account
export async function createAccount(data, token) {
    const response = await request('/api/auth/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (AUTH) Get All Accounts (Paginated)
export async function getAllAccounts(token, page = 1, search = '', role = '', sort = 'DESC') {
    const response = await request(`/api/auth?page=${page}&limit=10&search=${encodeURIComponent(search)}&role=${role}&sort=${sort}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization' : `Bearer ${token}` }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result;
}

// (AUTH) Get Account
export async function getAccount(id, token) {
    const response = await request(`/api/auth/${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization' : `Bearer ${token}`
        }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (AUTH) Update Account
export async function updateAccount(data, token, id) {
    const response = await request(`/api/auth/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (AUTH) Delete Account
export async function deleteAccount(id, token, reason = "No reason provided") {
    const response = await request(`/api/auth/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason }) // Send reason in the body
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (AUTH) Disable Account
export async function disableAccount(id, token) {
    const response = await request(`/api/auth/disable/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (AUTH) Enable Account
export async function enableAccount(id, token) {
    const response = await request(`/api/auth/enable/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (AUTH) Check Session
export async function checkSession(token) {
    const response = await request(`/api/auth/me`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (AUTH) Forgot Password - Get Question
export async function getSecurityQuestion(email) {
    const response = await request('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (AUTH) Reset Password
export async function resetPassword(data) {
    const response = await request('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

export async function changePassword(data, token) {
    const response = await request('/api/auth/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// -----------------------------------------------------------

// (INVENTORY) Get All Inventory Categories
export async function getAllInventoryCategories(token, page = 1, fetchAll = false) {
    let url = `/api/inventory/category?page=${page}&limit=10`;
    if(fetchAll) url = `/api/inventory/category?all=true`;

    const response = await request(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization' : `Bearer ${token}`
        }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result;
}

// (INVENTORY) Create Inventory Category
export async function createInventoryCategory(data, token) {
    const response = await request('/api/inventory/category', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (INVENTORY) Delete Inventory Category
export async function deleteInventoryCategory(id, token) {
    const response = await request(`/api/inventory/category/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

export async function updateInventoryCategory(id, data, token) {
    const response = await request(`/api/inventory/category/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

export async function createInventory(formData, token) {
    const response = await request('/api/inventory/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

export async function deleteInventory(id, token, reason = "No reason provided") {
    const response = await request(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json', // MUST add this line
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason }) // MUST add this line
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

export async function getAllInventory(token, page = 1, search = '', category = '', sort = 'newest') {
    const url = `/api/inventory?page=${page}&limit=10&search=${encodeURIComponent(search)}&category=${category}&sort=${sort}`;
    const response = await request(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization' : `Bearer ${token}` }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result;
}

// (INVENTORY) Get Single Inventory
export async function getInventory(id, token) {
    const response = await request(`/api/inventory/${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (INVENTORY) Update Inventory
export async function updateInventory(formData, id, token) {
    const response = await request(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Authorization' : `Bearer ${token}` },
        body: formData
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// -----------------------------------------------------------

// (SELLER) Get All Sellers
export async function getAllSellers(token, page = 1, search = '', category = '', sort = 'DESC') {
    const url = `/api/seller?page=${page}&limit=10&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&sort=${sort}`;
    const response = await request(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result; 
}

export async function getSellerDropdown(token) {
    const response = await request(`/api/seller?all=true`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result; 
}

// (SELLER) Get One
export async function getSeller(id, token) {
    const response = await request(`/api/seller/${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (SELLER) Create
export async function createSeller(formData, token) {
    const response = await request('/api/seller', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (SELLER) Update
export async function updateSeller(id, formData, token) {
    const response = await request(`/api/seller/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (SELLER) Delete
export async function deleteSeller(id, token, reason = "No reason provided") {
    const response = await request(`/api/seller/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// -----------------------------------------------------------

// (RTS) Get All (Paginated)
export async function getAllRTS(token, page = 1, search = '', status = '', sort = 'DESC') {
    const url = `/api/rts?page=${page}&limit=10&search=${encodeURIComponent(search)}&status=${status}&sort=${sort}`;
    const response = await request(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result;
}

// (RTS) Create
export async function createRTS(data, token) {
    const response = await request('/api/rts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (RTS) Update
export async function updateRTS(id, data, token) {
    const response = await request(`/api/rts/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (RTS) Delete
export async function deleteRTS(id, token, reason = "No reason provided") {
    const response = await request(`/api/rts/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (RTS) Get Single Item
export async function getRTS(id, token) {
    const response = await request(`/api/rts/${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// -----------------------------------------------------------

// (DASHBOARD) Get Stats
export async function getDashboardStats(token) {
    const response = await request('/api/dashboard/stats', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (DASHBOARD) Low Stock
export async function getLowStockItems(token) {
    const response = await request('/api/dashboard/low-stock', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// -----------------------------------------------------------

// (SALES) Get All (Paginated)
export async function getAllSales(token, page = 1, search = '', sort = 'newest') {
    const url = `/api/sales?page=${page}&limit=10&search=${encodeURIComponent(search)}&sort=${sort}`;
    const response = await request(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result; 
}

// (SALES) Create
export async function createSale(data, token) {
    const response = await request('/api/sales', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (SALES) Update
export async function updateSale(id, data, token) {
    const response = await request(`/api/sales/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (SALES) Delete
export async function deleteSale(id, token) {
    const response = await request(`/api/sales/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// -----------------------------------------------------------

// (DOCUMENTS) Get All (Paginated)
export async function getAllDocuments(token, page = 1, search = '', category = '', sort = 'DESC') {
    const url = `/api/documents?page=${page}&limit=10&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&sort=${sort}`;
    const response = await request(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result; 
}

// (DOCUMENTS) Create
export async function createDocument(formData, token) {
    const response = await request('/api/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (DOCUMENTS) Update
export async function updateDocument(id, data, token) {
    const response = await request(`/api/documents/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (DOCUMENTS) Delete
export async function deleteDocument(id, token, reason = "No reason provided") {
    const response = await request(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason }) 
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// (AUDIT) Get All Logs (Paginated)
export async function getAuditLogs(token, page = 1, search = '', action = '', sort = 'DESC') {
    const url = `/api/audit?page=${page}&limit=10&search=${encodeURIComponent(search)}&action=${action}&sort=${sort}`;
    const response = await request(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result; 
}

// (REPORTS) Download
export async function downloadReport(token, type, start = '', end = '') {
    const url = `/api/reports/download?type=${type}&startDate=${start}&endDate=${end}`;
    
    const response = await request(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status !== 200) {
        const errorText = await response.text();
        console.error("Download Failed:", errorText);
        throw new Error(errorText || "Failed to generate report");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${type}_report.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
}

// (REPORTS) Get Preview Data
export async function getReportPreview(token, type, start = '', end = '') {
    const url = `/api/reports/preview?type=${type}&startDate=${start}&endDate=${end}`;
    const response = await request(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    // Check if the request actually worked before trying to parse JSON
    if (!response.ok) {
        const text = await response.text();
        console.error("Preview API Error:", text);
        throw new Error(`Server Error (${response.status}): ${text}`);
    }

    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

export async function getArchive(token, module) {
    const response = await request(`/api/archive/${module}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

export async function restoreArchive(token, module, id) {
    const response = await request(`/api/archive/restore/${module}/${id}`, { 
        method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } 
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}

// Special function to handle PDF download
export async function hardDeleteArchive(token, module, id, reason) {
    const response = await fetch(`/api/archive/hard-delete/${module}/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reason })
    });
    if(!response.ok) throw new Error("Failed to process hard delete.");
    
    // Download the PDF file trigger
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Deleted_${module}_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
}