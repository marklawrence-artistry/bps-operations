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
// (AUTH) Enable Account
export async function enableAccount(id, token) {
    const response = await fetch(`/api/auth/enable/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    const result = await response.json();
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









// -----------------------------------------------------------
// SELLER API (Uses FormData for Image Uploads)

// (SELLER) Get All
export async function getAllSellers(token) {
    const response = await fetch('/api/seller', {
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
// (SELLER) Get One
export async function getSeller(id, token) {
    const response = await fetch(`/api/seller/${id}`, {
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
    const response = await fetch('/api/seller', {
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
// (SELLER) Update
export async function updateSeller(id, formData, token) {
    const response = await fetch(`/api/seller/${id}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}
// (SELLER) Delete
export async function deleteSeller(id, token) {
    const response = await fetch(`/api/seller/${id}`, {
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
// RETURN-TO-SELLER (RTS) API (Uses JSON)

// (RTS) Get All
export async function getAllRTS(token) {
    const response = await fetch('/api/rts', {
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
// (RTS) Create
export async function createRTS(data, token) {
    const response = await fetch('/api/rts', {
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
    const response = await fetch(`/api/rts/${id}`, {
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
export async function deleteRTS(id, token) {
    const response = await fetch(`/api/rts/${id}`, {
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
// (RTS) Get Single Item (For Editing)
export async function getRTS(id, token) {
    const response = await fetch(`/api/rts/${id}`, {
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
// DASHBOARD API

// (DASHBOARD) Get Main Stats (KPIs + Chart)
export async function getDashboardStats(token) {
    const response = await fetch('/api/dashboard/stats', {
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
// SALES API (JSON)

// (SALES) Get All
export async function getAllSales(token) {
    const response = await fetch('/api/sales', {
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
// (SALES) Create
export async function createSale(data, token) {
    const response = await fetch('/api/sales', {
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
    const response = await fetch(`/api/sales/${id}`, {
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
    const response = await fetch(`/api/sales/${id}`, {
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
// DOCUMENTS API (FormData for File Uploads)

// (DOCUMENTS) Get All
export async function getAllDocuments(token) {
    const response = await fetch('/api/documents', {
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
// (DOCUMENTS) Create
export async function createDocument(formData, token) {
    const response = await fetch('/api/documents', {
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
// (DOCUMENTS) Delete
export async function deleteDocument(id, token) {
    const response = await fetch(`/api/documents/${id}`, {
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
// (DOCUMENTS) Update Document (JSON body for metadata updates)
export async function updateDocument(id, data, token) {
    const response = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json', // Important: We are sending JSON, not FormData
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.data);
    return result.data;
}






// (AUDIT) Get All Logs
export async function getAuditLogs(token) {
    const response = await fetch('/api/audit', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    const result = await response.json();
    if(!result.success) {
        throw new Error(result.data);
    }

    return result.data;
}