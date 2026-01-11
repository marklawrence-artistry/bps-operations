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