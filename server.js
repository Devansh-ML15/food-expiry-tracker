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

// CORS configuration
const corsOptions = {
    origin: ['https://famous-paletas-4d48d3.netlify.app', 'http://localhost:3000', 'http://localhost:3001'],
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

// Add security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Handle preflight requests
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://famous-paletas-4d48d3.netlify.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.json({ status: 'ok', message: 'Server is running' });
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
transporter.verify(function(error, success) {
    if (error) {
        console.error('Error verifying email configuration:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Helper function to generate email content
function generateEmailContent(foodItems, notificationTypes) {
    let content = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4ade80; text-align: center;">Food Expiry Tracker Notification</h2>
            <p style="color: #666;">Here's your food expiry update:</p>
    `;

    // Filter items based on notification types
    if (notificationTypes.includes('expiringSoon')) {
        const expiringSoonItems = foodItems.filter(item => {
            const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
            return daysUntilExpiry > 0 && daysUntilExpiry <= 2;
        });

        if (expiringSoonItems.length > 0) {
            content += `
                <h3 style="color: #4ade80; margin-top: 20px;">Items Expiring Soon (within 2 days)</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Item</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Category</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Expiry Date</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Days Left</th>
                    </tr>
            `;

            expiringSoonItems.forEach(item => {
                const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
                content += `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.name || 'Unknown Item'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.category || 'Uncategorized'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.expiryDate || 'No date'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${daysUntilExpiry}</td>
                    </tr>
                `;
            });

            content += `</table>`;
        } else {
            content += `<p style="color: #666;">No items are expiring soon.</p>`;
        }
    }

    if (notificationTypes.includes('expired')) {
        const expiredItems = foodItems.filter(item => {
            const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
            return daysUntilExpiry <= 0;
        });

        if (expiredItems.length > 0) {
            content += `
                <h3 style="color: #ef4444; margin-top: 20px;">Expired Items</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Item</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Category</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Expiry Date</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Days Overdue</th>
                    </tr>
            `;

            expiredItems.forEach(item => {
                const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
                content += `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.name || 'Unknown Item'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.category || 'Uncategorized'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.expiryDate || 'No date'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${Math.abs(daysUntilExpiry)}</td>
                    </tr>
                `;
            });

            content += `</table>`;
        } else {
            content += `<p style="color: #666;">No items have expired.</p>`;
        }
    }

    if (notificationTypes.includes('summary')) {
        const allItems = foodItems.map(item => {
            const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
            return {
                ...item,
                daysUntilExpiry
            };
        }).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

        if (allItems.length > 0) {
            content += `
                <h3 style="color: #3b82f6; margin-top: 20px;">Weekly Summary</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr style="background-color: #f8f9fa;">
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Item</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Category</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Expiry Date</th>
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Status</th>
                    </tr>
            `;

            allItems.forEach(item => {
                let status = '';
                let statusColor = '';
                
                if (item.daysUntilExpiry <= 0) {
                    status = 'Expired';
                    statusColor = '#ef4444';
                } else if (item.daysUntilExpiry <= 2) {
                    status = 'Expiring Soon';
                    statusColor = '#f59e0b';
                } else {
                    status = 'Good';
                    statusColor = '#4ade80';
                }

                content += `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.name || 'Unknown Item'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.category || 'Uncategorized'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.expiryDate || 'No date'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; color: ${statusColor};">${status}</td>
                    </tr>
                `;
            });

            content += `</table>`;
        } else {
            content += `<p style="color: #666;">No items in your inventory.</p>`;
        }
    }

    content += `
            <p style="color: #666; margin-top: 20px;">Thank you for using Food Expiry Tracker!</p>
        </div>
    `;

    return content;
}

// Helper function to calculate next notification time
function calculateNextNotificationTime() {
    const now = new Date();
    // Set for next day at the same time
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

// Store notification schedules
const notificationSchedules = new Map();

// Endpoint to send notifications
app.post('/send-notifications', async (req, res) => {
    try {
        const { email, foodItems, types } = req.body;

        if (!email || !foodItems || !types) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        // Calculate next notification time (24 hours from now)
        const nextNotificationTime = calculateNextNotificationTime();
        
        // Store the schedule
        notificationSchedules.set(email, {
            nextNotificationTime,
            types,
            foodItems
        });

        // Send initial notification
        const mailOptions = {
            from: `"Food Expiry Tracker" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Food Expiry Tracker Notification',
            html: generateEmailContent(foodItems, types)
        };

        await transporter.sendMail(mailOptions);
        
        return res.json({ 
            success: true,
            nextNotificationTime: nextNotificationTime.toISOString()
        });
    } catch (error) {
        console.error('Error sending notification:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to send notification' 
        });
    }
});

// Function to check and send scheduled notifications
async function checkAndSendNotifications() {
    const now = new Date();
    
    for (const [email, schedule] of notificationSchedules.entries()) {
        if (now >= schedule.nextNotificationTime) {
            try {
                const mailOptions = {
                    from: `"Food Expiry Tracker" <${process.env.EMAIL_USER}>`,
                    to: email,
                    subject: 'Food Expiry Tracker Notification',
                    html: generateEmailContent(schedule.foodItems, schedule.types)
                };

                await transporter.sendMail(mailOptions);
                
                // Update next notification time (24 hours from now)
                const nextTime = calculateNextNotificationTime();
                notificationSchedules.set(email, {
                    ...schedule,
                    nextNotificationTime: nextTime
                });
                
                console.log(`Notification sent to ${email}. Next notification scheduled for ${nextTime}`);
            } catch (error) {
                console.error(`Error sending notification to ${email}:`, error);
            }
        }
    }
}

// Check for notifications every minute
setInterval(checkAndSendNotifications, 60000);

// Initial check
checkAndSendNotifications();

function getDaysUntilExpiry(expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.error('Error starting server:', err);
        process.exit(1);
    }
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 