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

// script.js
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap components
    const addItemModal = new bootstrap.Modal(document.getElementById('addItemModal'), {
        backdrop: 'static',
        keyboard: false
    });
    
    // Navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.dashboard-content section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetSection = link.dataset.section;
            
            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Show target section
            sections.forEach(section => {
                section.style.display = section.id === targetSection ? 'block' : 'none';
            });
            
            // Initialize charts if showing insights
            if (targetSection === 'insights') {
                initializeInsights();
            }
        });
    });
    
    // Initialize Charts
    function initializeCharts() {
        // Expiry Timeline Chart
        const expiryCtx = document.getElementById('expiryChart').getContext('2d');
        new Chart(expiryCtx, {
            type: 'line',
            data: {
                labels: ['Today', '3 days', '1 week', '2 weeks', '1 month'],
                datasets: [{
                    label: 'Items Expiring',
                    data: [2, 5, 8, 12, 15],
                    borderColor: '#0d6efd',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // Category Distribution Chart
        const categoryCtx = document.getElementById('categoryChart').getContext('2d');
        new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: ['Fruits & Vegetables', 'Dairy', 'Meat', 'Pantry'],
                datasets: [{
                    data: [30, 20, 25, 25],
                    backgroundColor: [
                        '#198754',
                        '#0dcaf0',
                        '#dc3545',
                        '#ffc107'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Food Item Management
    const foodForm = document.getElementById('foodForm');
    const foodList = document.getElementById('foodList');
    
    // Add Item Button Functionality
    const addItemBtn = document.getElementById('addItemBtn');
    
    addItemBtn.addEventListener('click', () => {
        addItemModal.show();
    });
    
    // Enhanced Form Handling
    foodForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const foodItem = {
            name: document.getElementById('foodName').value,
            category: document.getElementById('foodCategory').value,
            expiryDate: document.getElementById('expiryDate').value,
            quantity: document.getElementById('quantity').value,
            addedDate: new Date().toISOString().split('T')[0]
        };
        
        addFoodItem(foodItem);
        addItemModal.hide();
        foodForm.reset();
        
        // Show success message
        showNotification('Item added successfully!', 'success');
    });
    
    function addFoodItem(item) {
        const foodItems = getFoodItems();
        foodItems.push(item);
        localStorage.setItem('foodItems', JSON.stringify(foodItems));
        loadFoodItems();
        updateDashboardStats();
    }
    
    function getFoodItems() {
        return JSON.parse(localStorage.getItem('foodItems') || '[]');
    }
    
    function loadFoodItems() {
        const foodItems = getFoodItems();
        foodList.innerHTML = '';
        
        foodItems.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
        
        foodItems.forEach(item => {
            const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
            const itemElement = createFoodItemElement(item, daysUntilExpiry);
            foodList.appendChild(itemElement);
        });
    }
    
    function createFoodItemElement(item, daysUntilExpiry) {
        const div = document.createElement('div');
        div.className = `food-item ${getExpiryClass(daysUntilExpiry)}`;
        
        div.innerHTML = `
            <div class="food-item-info">
                <div class="food-item-name">${item.name}</div>
                <div class="food-item-meta">
                    <span class="category"><i class="bi bi-tag"></i> ${item.category}</span>
                    <span class="quantity"><i class="bi bi-box"></i> ${item.quantity} units</span>
                    <span class="expiry"><i class="bi bi-calendar"></i> ${formatDate(item.expiryDate)}</span>
                </div>
            </div>
            <div class="food-item-status">
                <span class="badge bg-${getStatusBadgeColor(daysUntilExpiry)}">
                    ${getExpiryStatus(daysUntilExpiry)}
                </span>
                <button class="btn btn-sm btn-outline-danger ms-2 delete-btn" 
                        onclick="removeFoodItem('${item.name}', '${item.expiryDate}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        return div;
    }
    
    function updateDashboardStats() {
        const foodItems = getFoodItems();
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        const totalItems = foodItems.length;
        const expiringSoon = foodItems.filter(item => {
            const days = getDaysUntilExpiry(item.expiryDate);
            return days > 0 && days <= 2;
        }).length;
        const expired = foodItems.filter(item => {
            const days = getDaysUntilExpiry(item.expiryDate);
            return days <= 0;
        }).length;
        
        // Update stats in the UI
        document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = totalItems;
        document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = expiringSoon;
        document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = expired;
    }
    
    // Utility Functions
    function getDaysUntilExpiry(expiryDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate + 'T00:00:00');
        const diffTime = expiry - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    function getExpiryClass(days) {
        if (days < 0) return 'expired';
        if (days === 0) return 'expired-today';
        if (days <= 2) return 'expiring-soon';
        return '';
    }
    
    function getStatusBadgeColor(days) {
        if (days < 0) return 'danger';
        if (days === 0) return 'danger';
        if (days <= 2) return 'warning';
        return 'success';
    }
    
    function getExpiryStatus(days) {
        if (days < 0) return 'Expired';
        if (days === 0) return 'Expired today';
        if (days === 1) return '1 day left';
        if (days === 2) return '2 days left';
        return `${days} days left`;
    }
    
    function formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    // Initial load
    loadFoodItems();
    updateDashboardStats();
    
    // Show first section by default
    sections.forEach(section => {
        section.style.display = section.id === 'inventory' ? 'block' : 'none';
    });

    // Add this function for notifications
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} notification`;
        notification.innerHTML = message;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Notification Management
    function initializeNotifications() {
        const notificationsList = document.querySelector('.notifications-list');
        const filterButtons = document.querySelectorAll('.notification-filters button');

        // Load and display notifications
        loadNotifications();

        // Add filter button listeners
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                filterNotifications(button.dataset.filter);
            });
        });

        // Reposition Delete All Notifications button beside System Notifications
        const systemButton = document.querySelector('.notification-filters button[data-filter="system"]');
        const deleteAllBtn = document.createElement('button');
        deleteAllBtn.className = 'btn btn-outline-danger';
        deleteAllBtn.textContent = 'Delete All Notifications';
        deleteAllBtn.addEventListener('click', deleteAllNotifications);
        systemButton.parentElement.insertBefore(deleteAllBtn, systemButton.nextSibling);
    }

    function deleteAllNotifications() {
        // Clear notifications from localStorage
        localStorage.removeItem('notifications');
        
        // Clear notifications list in the UI
        const notificationsList = document.querySelector('.notifications-list');
        notificationsList.innerHTML = `
            <div class="notifications-empty">
                <i class="bi bi-bell-slash"></i>
                <p>No notifications to display</p>
            </div>
        `;

        // Update notification badge
        updateNotificationBadge();

        // Store the current time as the last cleared time
        localStorage.setItem('lastClearedTime', new Date().toISOString());

        // Reload notifications for new items only
        loadNotifications();
    }

    function loadNotifications() {
        // Get food items and generate notifications
        const foodItems = JSON.parse(localStorage.getItem('foodItems') || '[]');
        const notifications = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get the last cleared time
        const lastClearedTime = new Date(localStorage.getItem('lastClearedTime') || 0);

        foodItems.forEach(item => {
            const expiryDate = new Date(item.expiryDate);
            expiryDate.setHours(0, 0, 0, 0);
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

            // Only generate notifications for items added after the last cleared time
            if (new Date(item.addedDate) > lastClearedTime && (daysUntilExpiry <= 0 || daysUntilExpiry <= 2)) {
                notifications.push({
                    id: `expiring-${item.id}`,
                    type: daysUntilExpiry <= 0 ? 'expired' : 'expiring',
                    title: daysUntilExpiry <= 0 ? 'Item Expired' : 'Expiring Soon',
                    message: `${item.name} ${daysUntilExpiry <= 0 ? 'has expired' : `will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`}.`,
                    icon: daysUntilExpiry <= 0 ? 'bi-exclamation-circle' : 'bi-clock',
                    timestamp: new Date().toISOString(),
                    unread: true
                });
            }
        });

        // Save notifications to localStorage
        localStorage.setItem('notifications', JSON.stringify(notifications));
        
        // Display notifications
        displayNotifications(notifications);
        updateNotificationBadge();
    }

    function displayNotifications(notifications) {
        const notificationsList = document.querySelector('.notifications-list');
        
        if (!notifications.length) {
            notificationsList.innerHTML = `
                <div class="notifications-empty">
                    <i class="bi bi-bell-slash"></i>
                    <p>No notifications to display</p>
                </div>
            `;
            return;
        }

        notificationsList.innerHTML = notifications
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(notification => createNotificationElement(notification))
            .join('');

        // Add green dot to notification icon if there are unread notifications
        const unreadCount = notifications.filter(n => n.unread).length;
        const notificationIcon = document.querySelector('.nav-links li[data-section="notifications"] i');
        if (unreadCount > 0) {
            notificationIcon.classList.add('has-unread');
        } else {
            notificationIcon.classList.remove('has-unread');
        }
    }

    function createNotificationElement(notification) {
        return `
            <div class="notification-item ${notification.type} ${notification.unread ? 'unread' : ''}" 
                 data-id="${notification.id}">
                <div class="notification-icon ${getNotificationIconClass(notification.type)}">
                    <i class="bi ${notification.icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-meta">
                        <span>${formatNotificationDate(notification.timestamp)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    function getNotificationIconClass(type) {
        switch (type) {
            case 'expired': return 'danger';
            case 'expiring': return 'warning';
            default: return 'system';
        }
    }

    function formatNotificationDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
        }
    }

    function markNotificationAsRead(notificationId) {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const notificationIndex = notifications.findIndex(n => n.id === notificationId);
        
        if (notificationIndex !== -1) {
            notifications[notificationIndex].unread = false;
            localStorage.setItem('notifications', JSON.stringify(notifications));
            displayNotifications(notifications);
            updateNotificationBadge();
        }
    }

    function filterNotifications(filterType) {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        let filteredNotifications;

        if (filterType === 'all') {
            filteredNotifications = notifications;
        } else {
            filteredNotifications = notifications.filter(n => n.type === filterType);
        }

        displayNotifications(filteredNotifications);
    }

    function updateNotificationBadge() {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const unreadCount = notifications.filter(n => n.unread).length;
        const badge = document.querySelector('.nav-links li[data-section="notifications"] .badge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Initialize notifications when the page loads
    initializeNotifications();

    // Add this to your existing DOMContentLoaded event listener
    const aboutAddItemBtn = document.getElementById('aboutAddItemBtn');
    if (aboutAddItemBtn) {
        aboutAddItemBtn.addEventListener('click', () => {
            addItemModal.show();
        });
    }

    // Logo refresh functionality
    document.getElementById('logoLink').addEventListener('click', () => {
        window.location.reload();
    });

    // Add event listener to remove green dot when notifications page is visited
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (link.dataset.section === 'notifications') {
                const notificationIcon = document.querySelector('.nav-links li[data-section="notifications"] i');
                notificationIcon.classList.remove('has-unread');
            }
        });
    });

    // Add CSS for green dot
    const style = document.createElement('style');
    style.textContent = `
        .nav-links li[data-section="notifications"] i.has-unread::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 8px;
            height: 8px;
            background-color: green;
            border-radius: 50%;
        }
    `;
    document.head.appendChild(style);

    // Add this to your existing DOMContentLoaded event listener
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        document.getElementById('userFullName').textContent = currentUser.fullName;
    }

    // Add logout button event listener
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Check authentication when page loads
    checkAuth();

    // Define categories once and use them everywhere
    const FOOD_CATEGORIES = {
        "Fresh Products": ["Fruits", "Vegetables", "Fresh Herbs"],
        "Dairy & Eggs": ["Milk & Cream", "Cheese", "Yogurt", "Eggs", "Butter & Margarine"],
        "Meat & Protein": ["Chicken & Poultry", "Beef", "Pork", "Fish & Seafood", "Tofu & Meat Alternatives"],
        "Pantry": ["Rice & Grains", "Pasta & Noodles", "Canned Foods", "Sauces & Condiments", "Spices & Seasonings", "Cooking Oils"],
        "Bakery": ["Bread", "Pastries", "Baking Ingredients"],
        "Snacks & Beverages": ["Snacks", "Beverages", "Juices"],
        "Frozen": ["Frozen Meals", "Frozen Vegetables", "Ice Cream & Desserts"]
    };

    // Function to populate category selects
    function populateCategorySelect(selectElement, includeAllOption = false) {
        if (includeAllOption) {
            selectElement.innerHTML = '<option value="All Categories">All Categories</option>';
        } else {
            selectElement.innerHTML = '<option value="">Select Category</option>';
        }

        for (const [group, categories] of Object.entries(FOOD_CATEGORIES)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group;

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                optgroup.appendChild(option);
            });

            selectElement.appendChild(optgroup);
        }
    }

    // When the document loads, populate both selects
    document.addEventListener('DOMContentLoaded', () => {
        // Populate category filters
        const categoryFilter = document.getElementById('categoryFilter');
        const addItemCategory = document.getElementById('foodCategory');

        if (categoryFilter) {
            populateCategorySelect(categoryFilter, true); // true for including "All Categories" option
        }
        if (addItemCategory) {
            populateCategorySelect(addItemCategory, false); // false for add item form
        }
    });

    // Initialize Charts.js
    function initializeInsights() {
        // Load Chart.js if not already loaded
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => {
                updateInsights();
            };
            document.head.appendChild(script);
        } else {
            updateInsights();
        }
    }

    function updateInsights() {
        const foodItems = JSON.parse(localStorage.getItem('foodItems') || '[]');
        updateBasicStats(foodItems);
        updateCharts(foodItems);
        updateAdditionalStats(foodItems);
    }

    function updateBasicStats(foodItems) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Total Items
        document.getElementById('totalItemsCount').textContent = foodItems.length;

        // Expiring Soon (within 2 days)
        const expiringSoon = foodItems.filter(item => {
            const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
            return daysUntilExpiry > 0 && daysUntilExpiry <= 2;
        }).length;
        document.getElementById('expiringSoonCount').textContent = expiringSoon;

        // Expired
        const expired = foodItems.filter(item => {
            const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
            return daysUntilExpiry <= 0;
        }).length;
        document.getElementById('expiredCount').textContent = expired;
    }

    function updateCharts(foodItems) {
        updateStatusChart(foodItems);
        updateCategoryChart(foodItems);
    }

    function updateStatusChart(foodItems) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const expired = foodItems.filter(item => {
            const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
            return daysUntilExpiry <= 0;
        }).length;
        
        const expiringSoon = foodItems.filter(item => {
            const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
            return daysUntilExpiry > 0 && daysUntilExpiry <= 2;
        }).length;
        
        const fresh = foodItems.length - expired - expiringSoon;

        const ctx = document.getElementById('statusChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Fresh', 'Expiring Soon', 'Expired'],
                datasets: [{
                    data: [fresh, expiringSoon, expired],
                    backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    function updateCategoryChart(foodItems) {
        const categoryCount = {};
        foodItems.forEach(item => {
            categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
        });

        const ctx = document.getElementById('categoryChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(categoryCount),
                datasets: [{
                    label: 'Items per Category',
                    data: Object.values(categoryCount),
                    backgroundColor: '#4F46E5',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    function updateAdditionalStats(foodItems) {
        const today = new Date();

        // Most Common Category
        const categoryCount = {};
        foodItems.forEach(item => {
            categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
        });
        const mostCommonCategory = Object.entries(categoryCount)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || '-';
        document.getElementById('commonCategory').textContent = mostCommonCategory;

        // Newest and Oldest Items
        const sortedByDate = [...foodItems].sort((a, b) => 
            new Date(b.dateAdded) - new Date(a.dateAdded)
        );
        document.getElementById('newestItem').textContent = 
            sortedByDate[0]?.name || '-';
        document.getElementById('oldestItem').textContent = 
            sortedByDate[sortedByDate.length - 1]?.name || '-';

        // Fresh Items Percentage
        const freshItems = foodItems.filter(item => {
            const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
            return daysUntilExpiry > 2; // Items with more than 2 days until expiry are considered fresh
        }).length;
        const freshPercentage = foodItems.length ? 
            Math.round((freshItems / foodItems.length) * 100) : 0;
        document.getElementById('freshPercentage').textContent = `${freshPercentage}%`;
    }

    // Initialize insights when the page loads
    document.addEventListener('DOMContentLoaded', () => {
        initializeInsights();
    });

    // Hamburger Menu Functionality
    const hamburger = document.getElementById('navToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const navOverlay = document.createElement('div');
    navOverlay.className = 'nav-overlay';
    document.body.appendChild(navOverlay);

    function toggleMenu() {
        hamburger.classList.toggle('active');
        sidebar.classList.toggle('active');
        navOverlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    }

    if (hamburger) {
        hamburger.addEventListener('click', toggleMenu);
    }
    
    if (navOverlay) {
        navOverlay.addEventListener('click', toggleMenu);
    }

    // Close menu when clicking a nav link
    document.querySelectorAll('.nav-links li').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                toggleMenu();
            }
        });
    });

    // Close menu on window resize if screen becomes larger
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            if (hamburger) hamburger.classList.remove('active');
            if (sidebar) sidebar.classList.remove('active');
            if (navOverlay) navOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// Global function for removing items
function removeFoodItem(name, expiryDate) {
    let foodItems = JSON.parse(localStorage.getItem('foodItems') || '[]');
    foodItems = foodItems.filter(item => !(item.name === name && item.expiryDate === expiryDate));
    localStorage.setItem('foodItems', JSON.stringify(foodItems));
    location.reload();
}

// Logout handler function
function handleLogout() {
    // Show confirmation dialog
    if (confirm('Are you sure you want to logout?')) {
        // Clear user data
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
        
        // Redirect to login page
        window.location.href = 'login.html';
    }
}

// Check authentication when page loads
function checkAuth() {
    if (!localStorage.getItem('isLoggedIn')) {
        window.location.href = 'login.html';
    }
}

// Run auth check when page loads
checkAuth();

// Update all fetch calls to use API_URL
async function sendNotificationSettings() {
    try {
        const response = await fetch(`${API_URL}/send-notifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: document.getElementById('email').value,
                foodItems: JSON.parse(localStorage.getItem('foodItems') || '[]'),
                types: getSelectedNotificationTypes()
            })
        });
        // ... rest of the function
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to save settings', 'error');
    }
}