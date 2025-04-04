// API Configuration
const API_URL = (() => {
    // Check if we're in production
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        // In production, use the Render backend URL
        return 'https://food-expiry-tracker-backend.onrender.com';
    }
    // In development, use localhost
    return 'http://localhost:3001';
})();

// Log API URL for debugging
console.log('API URL:', API_URL);

// Test backend connection
async function testBackendConnection() {
    try {
        const response = await fetch(`${API_URL}/health`);
        if (!response.ok) {
            console.error('Backend is not responding:', response.status);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error connecting to backend:', error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const registerForm = document.getElementById('registerForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    let originalButtonText = ''; // Store the original button text

    function showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'} mt-3`;
        messageDiv.textContent = message;
        
        // Remove any existing messages
        const existingMessages = document.querySelectorAll('.alert');
        existingMessages.forEach(msg => msg.remove());
        
        // Insert new message after the form
        registerForm.parentNode.insertBefore(messageDiv, registerForm.nextSibling);
        
        // Auto-remove message after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    // Test backend connection on page load
    const isBackendAvailable = await testBackendConnection();
    if (!isBackendAvailable) {
        showMessage('Unable to connect to the server. Please try again later.', 'error');
    }

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

        // Validate inputs
        if (!fullName || !email || !password || !confirmPassword) {
            showMessage('All fields are required', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }

        const submitButton = document.querySelector('button[type="submit"]');
        originalButtonText = submitButton.innerHTML;

        try {
            // Show loading state
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registering...';
            submitButton.disabled = true;

            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fullName, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            if (data.success) {
                showMessage('Registration successful! Redirecting to login...', 'success');
                // Store user data in localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                // Redirect to login page after 2 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showMessage(data.message || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            if (error.message.includes('Failed to fetch')) {
                showMessage('Unable to connect to the server. Please try again later.', 'error');
            } else {
                showMessage(error.message || 'An error occurred during registration', 'error');
            }
        } finally {
            // Restore button state
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    });
}); 