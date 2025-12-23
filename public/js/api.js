

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