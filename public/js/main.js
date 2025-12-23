import * as render from './render.js'
import * as api from './api.js'

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('#login-form')
	
	if(loginForm) {
		loginForm.addEventListener('submit', async (e) => {
			e.preventDefault()
			
			const credentials = {
				username: document.querySelector('#account-username').value.trim(),
				password: document.querySelector('#account-password').value.trim()
			}
			
			try {
				await api.login(credentials)
				alert('Logged in successfully!')
				
				loginForm.reset()
                location.href = "index.html"
			}
			catch(err) {
				console.error(err)
			} 
		})
	}
})