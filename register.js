// API Configuration
const API_URL = (() => {
    // Check if we're in production
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return import.meta.env.VITE_API_URL || 'https://food-expiry-tracker-backend.onrender.com';
    }
    return 'http://localhost:3001';
})();

// Log API URL for debugging
console.log('API URL:', API_URL);

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    let originalButtonText = ''; // Store the original button text

    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.querySelector('i').classList.toggle('bi-eye');
        togglePassword.querySelector('i').classList.toggle('bi-eye-slash');
    });

    // Handle form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Only check if passwords match
        if (password !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }

        const submitButton = document.querySelector('button[type="submit"]');
        originalButtonText = submitButton.innerHTML; // Store original text

        try {
            // Show loading state
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registering...';
            submitButton.disabled = true;

            // Send registration request to backend
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fullName,
                    email,
                    password
                })
            });

            if (!response.ok) {
                throw new Error('Registration failed');
            }

            const data = await response.json();
            
            if (data.success) {
                showMessage('Registration successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage(error.message || 'An error occurred during registration', 'error');
        } finally {
            // Reset button state
            submitButton.innerHTML = originalButtonText;
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
}); 