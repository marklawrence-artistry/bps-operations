

// (AUTH) Login
export async function login(credentials) {
	const response = await fetch('/api/auth/login', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(credentials)
	})
	
	if(!response.ok) {
		throw new Error('Error logging in.')
	}
	
	const result = await response.json()
	if(!result.success) {
		throw new Error(result.data)
	}
	
	return result.data
}
// (AUTH) Get all users
export async function getAllUsers(token) {
	const response = await fetch('/api/auth/', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
		}
	})

    if(response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized.')
    }
	
	if(!response.ok) {
		throw new Error('Error getting all users.')
	}
	
	const result = await response.json()
	if(!result.success) {
		throw new Error(result.data)
	}
	
	return result.data
}
// (AUTH) Delete user
export async function deleteUser(token, user_id) {
	const response = await fetch(`/api/auth/${user_id}`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
		}
	})

    if(response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized.')
    }
	
	if(!response.ok) {
		throw new Error('Error deleting user.')
	}
	
	const result = await response.json()
	if(!result.success) {
		throw new Error(result.data)
	}
	
	return result.data
}