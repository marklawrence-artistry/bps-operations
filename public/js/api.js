// (AUTH) Login
export async function loginAccount(credentials) {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
    })

    const result = await response.json();
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}
// (AUTH) Create Account
export async function createAccount(data, token) {
    const response = await fetch('/api/auth/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    })

    const result = await response.json();
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}
// (AUTH) Get All Accounts
export async function getAllAccounts(token) {
    const response = await fetch('/api/auth', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization' : `Bearer ${token}`
        }
    })

    const result = await response.json()
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}
// (AUTH) Get Account
export async function getAccount(id, token) {
    const response = await fetch(`/api/auth/${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization' : `Bearer ${token}`
        }
    })

    const result = await response.json()
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}
// (AUTH) Update Account
export async function updateAccount(data, token, id) {
    const response = await fetch(`/api/auth/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    })

    const result = await response.json()
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}
// (AUTH) Delete Account
export async function deleteAccount(id, token) {
    const response = await fetch(`/api/auth/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })

    const result = await response.json()
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}
// (AUTH) Disable Account
export async function disableAccount(id, token) {
    const response = await fetch(`/api/auth/disable/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })

    const result = await response.json()
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}
// (AUTH) Check Session
export async function checkSession(token) {
    const response = await fetch(`/api/auth/me`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })

    const result = await response.json()
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}






// -----------------------------------------------------------
// (INVENTORY) Get All Inventory Categories
export async function getAllInventoryCategories(token) {
    const response = await fetch('/api/inventory/category', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization' : `Bearer ${token}`
        }
    })

    const result = await response.json()
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}
// (INVENTORY) Create Inventory Category
export async function createInventoryCategory(data, token) {
    const response = await fetch('/api/inventory/category', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    })

    const result = await response.json();
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}
// (INVENTORY) Delete Inventory Category
export async function deleteInventoryCategory(id, token) {
    const response = await fetch(`/api/inventory/category/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })

    const result = await response.json()
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}

// (INVENTORY) Get All Inventory
export async function getAllInventory(token) {
    const response = await fetch('/api/inventory/', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization' : `Bearer ${token}`
        }
    })

    const result = await response.json()
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}
// (INVENTORY) Create Inventory
export async function createInventory(formData, token) {
    const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
            'Authorization' : `Bearer ${token}`
        },
        body: formData
    })

    const result = await response.json()
    if(!result.success) {
        throw new Error(result.data)
    }

    return result.data
}
// (INVENTORY) Delete Inventory Category
export async function deleteInventory(id, token) {
    const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })

    const result = await response.json()
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}
// (INVENTORY) Delete Inventory Category
export async function getInventory(id, token) {
    const response = await fetch(`/api/inventory/${id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })

    const result = await response.json()
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}
// (INVENTORY) Update Inventory
export async function updateInventory(formData, id, token) {
    const response = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization' : `Bearer ${token}`
        },
        body: formData
    })

    const result = await response.json()
    if(!result.success) {
        throw new Error(result.data)
    }

    return result.data
}