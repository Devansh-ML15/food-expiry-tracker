document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.querySelector('i').classList.toggle('bi-eye');
        togglePassword.querySelector('i').classList.toggle('bi-eye-slash');
    });

    // Handle form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = passwordInput.value;
        const remember = document.getElementById('remember').checked;

        try {
            // Show loading state
            const submitButton = document.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
            submitButton.disabled = true;

            // Send login request to backend
            const response = await fetch('http://localhost:3001/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Login failed');
            }

            const data = await response.json();

            // Store login state
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            if (remember) {
                localStorage.setItem('rememberedEmail', email);
            }

            // Show success message
            showMessage('Login successful! Redirecting...', 'success');

            // Redirect to main page
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);

        } catch (error) {
            console.error('Login error:', error);
            showMessage(error.message || 'An error occurred. Please try again.', 'error');
        } finally {
            // Reset button state
            const submitButton = document.querySelector('button[type="submit"]');
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    });

    // Show message function
    function showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} message-alert`;
        messageDiv.textContent = message;

        document.querySelector('.login-header').appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // Check login state and auto-fill remembered email
    function checkLoginState() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (isLoggedIn === 'true' && window.location.pathname.includes('login.html')) {
            window.location.href = 'index.html';
        }

        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            document.getElementById('email').value = rememberedEmail;
            document.getElementById('remember').checked = true;
        }
    }

    // Check login state on page load
    checkLoginState();
});