require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

// Check for required environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('Error: EMAIL_USER and EMAIL_PASSWORD environment variables are required');
    process.exit(1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOptions = {
    origin: 'https://famous-paletas-4d48d3.netlify.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add security headers middleware
app.use((req, res, next) => {
    // Set CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', 'https://famous-paletas-4d48d3.netlify.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    next();
});

// Handle preflight requests explicitly
app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://famous-paletas-4d48d3.netlify.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://famous-paletas-4d48d3.netlify.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    res.json({ 
        status: 'ok', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('public'));
}

// File-based storage for users
const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize users array from file or create empty array
let users = [];
try {
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
} catch (error) {
    console.error('Error reading users file:', error);
    users = [];
}

// Function to save users to file
function saveUsers() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users file:', error);
    }
}

// Registration endpoint
app.post('/api/register', (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        // Validate input
        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if email already exists
        if (users.some(user => user.email === email)) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            fullName,
            email,
            password // In a real app, you would hash the password
        };

        // Add user to the list and save
        users.push(newUser);
        saveUsers();

        // Return success response
        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: {
                id: newUser.id,
                fullName: newUser.fullName,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred during registration'
        });
    }
});

// Login endpoint
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email and password
        const user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Return success response
        return res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred during login'
        });
    }
});

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verify email configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('Email configuration error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Send notifications endpoint
app.post('/send-notifications', async (req, res) => {
    try {
        const { email, foodItems, types } = req.body;

        if (!email || !foodItems || !types || types.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Prepare email content based on notification types
        let subject = 'Food Expiry Tracker Notification';
        let text = '';

        if (types.includes('expiringSoon')) {
            const expiringSoon = foodItems.filter(item => {
                const daysUntilExpiry = calculateDaysUntilExpiry(item.expiryDate);
                return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
            });
            
            if (expiringSoon.length > 0) {
                text += 'Items expiring soon:\n';
                expiringSoon.forEach(item => {
                    text += `- ${item.name} (${item.quantity}) expires in ${calculateDaysUntilExpiry(item.expiryDate)} days\n`;
                });
                text += '\n';
            }
        }

        if (types.includes('expired')) {
            const expired = foodItems.filter(item => calculateDaysUntilExpiry(item.expiryDate) <= 0);
            
            if (expired.length > 0) {
                text += 'Expired items:\n';
                expired.forEach(item => {
                    text += `- ${item.name} (${item.quantity}) expired ${Math.abs(calculateDaysUntilExpiry(item.expiryDate))} days ago\n`;
                });
                text += '\n';
            }
        }

        if (types.includes('summary')) {
            text += 'Summary of all items:\n';
            foodItems.forEach(item => {
                const daysUntilExpiry = calculateDaysUntilExpiry(item.expiryDate);
                text += `- ${item.name} (${item.quantity}): ${daysUntilExpiry > 0 ? `${daysUntilExpiry} days until expiry` : 'Expired'}\n`;
            });
        }

        if (!text) {
            return res.status(200).json({ message: 'No notifications to send' });
        }

        // Send email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: subject,
            text: text
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);

        // Calculate next notification time (24 hours from now)
        const nextNotificationTime = new Date();
        nextNotificationTime.setHours(nextNotificationTime.getHours() + 24);

        res.json({
            message: 'Notifications sent successfully',
            nextNotificationTime: nextNotificationTime.toISOString()
        });
    } catch (error) {
        console.error('Error sending notifications:', error);
        res.status(500).json({ 
            error: 'Failed to send notifications',
            details: error.message
        });
    }
});

function getDaysUntilExpiry(expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 