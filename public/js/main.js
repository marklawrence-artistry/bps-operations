import * as render from './render.js'
import * as api from './api.js'

document.addEventListener('DOMContentLoaded', () => {

    // CONSTANTS
    const loginForm = document.querySelector('#login-form')
    const contentDiv = document.querySelector('#content')
    const navWrapper = document.querySelector('.nav-wrapper')


    // GENERAL VARIABLES
    // Pag may bagong page, 1. DAGDAG mo sa switch case
    const router = async () => {
        const hash = window.location.hash || '#dashboard';

        // Update Sidebar Active State
        updateActiveSidebar(hash);

        contentDiv.innerHTML = '<div>Loading data..</div>';

        try {
            switch(hash) {
                case '#dashboard':
                    render.renderDashboard(contentDiv);
                    break;
                case '#accounts':
                    const token = JSON.parse(localStorage.getItem('token'))
                    const users = await api.getAllUsers(token)
                    render.renderManageUsers(contentDiv, users)
                    break;
                default:
                    contentDiv.innerHTML = `<h1>Not Found 404</h1>`
            }
        } catch(err) {
            console.error(err)
            if(err.message.includes("Unauthorized") || err.message.includes("token")) {
                alert("Session expired. Please login again.")
                localStorage.removeItem('token')
                location.href = 'index.html'
            } else {
                contentDiv.innerHTML = `<p>Error loading data ${err.message}</p>`
            }
        }
    }

    const updateActiveSidebar = (hash) => {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));

        const hashToId = {
            '#dashboard': 'nav-dashboard',
            '#accounts': 'nav-accounts',
            '#audit': 'nav-audit',
            '#inventory': 'nav-inventory',
            '#inventory-cat': 'nav-inventory-cat',
            '#sellers': 'nav-sellers',
            '#rts': 'nav-rts',
            '#documents': 'nav-documents',
            '#sales': 'nav-sales'
        };

        const activeId = hashToId[hash];
        if (activeId) {
            const activeItem = document.getElementById(activeId);
            if (activeItem) activeItem.classList.add('active');
        }
    }

    window.addEventListener('hashchange', router)
    router();


    // (NAVIGATION)
    if(navWrapper) {
        navWrapper.addEventListener('click', (e) => {
            e.preventDefault();

            const navItem = e.target.closest('.nav-item')
            console.log(navItem)

            // 2. dagdag mo rito pangalawa
            if(navItem) {
                const idToHash = {
                    'nav-dashboard': 'dashboard',
                    'nav-audit': 'audit',
                    'nav-inventory': 'inventory',
                    'nav-inventory-cat': 'inventory-cat',
                    'nav-sellers': 'sellers',
                    'nav-rts': 'rts',
                    'nav-documents': 'documents',
                    'nav-sales': 'sales',
                    'nav-accounts': 'accounts'
                }

                const targetHash = idToHash[navItem.id]
                if(targetHash) {
                    window.location.hash = targetHash
                }
            }
        })
    }

    // (HELPERS)
    






	

    // (AUTH) Login
	if(loginForm) {
		loginForm.addEventListener('submit', async (e) => {
			e.preventDefault()
			
			const credentials = {
				username: document.querySelector('#account-username').value.trim(),
				password: document.querySelector('#account-password').value.trim()
			}
			
			try {
				const data = await api.login(credentials)
				alert('Logged in successfully!')
				
                localStorage.setItem('token', JSON.stringify(data.token));
				loginForm.reset()
                location.href = "dashboard.html"
			}
			catch(err) {
				console.error(err)
			} 
		})
	}

    // (AUTH) Gatekeeper
    if(!(window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('login.html')) && !localStorage.getItem('token')) {
        alert('You must be logged in to view this page. Redirecting..')
        window.location.href = 'index.html'
    }
})