// app.js - Smart Pantry Application
class SmartPantry {
    constructor() {
        this.pantryItems = [];
        this.awsEnabled = false;
        this.userId = this.getUserId();
        this.API_BASE_URL = 'https://your-aws-api-id.execute-api.us-east-1.amazonaws.com';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadPantry();
        this.updateDisplay();
        this.checkAWSConnection();
    }

    getUserId() {
        let userId = localStorage.getItem('smartPantryUserId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('smartPantryUserId', userId);
        }
        return userId;
    }

    setupEventListeners() {
        document.getElementById('imageUpload').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        document.getElementById('addManualButton').addEventListener('click', () => {
            this.addManualItem();
        });

        document.getElementById('foodName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addManualItem();
            }
        });

        // Event delegation for dynamic buttons
        document.addEventListener('click', (e) => {
            console.log('Click detected on:', e.target);
            
            if (e.target.classList.contains('delete-btn')) {
                console.log('Delete button clicked!');
                const itemElement = e.target.closest('.pantry-item');
                if (itemElement) {
                    console.log('Item ID:', itemElement.dataset.itemId);
                    this.deleteItem(itemElement.dataset.itemId);
                }
            }
            if (e.target.classList.contains('edit-expiration-btn')) {
                console.log('Edit button clicked!');
                const itemElement = e.target.closest('.pantry-item');
                if (itemElement) {
                    console.log('Item ID:', itemElement.dataset.itemId);
                    this.editExpiration(itemElement.dataset.itemId);
                }
            }
        });
    }

    deleteItem(itemId) {
        console.log('Deleting item:', itemId);
        this.pantryItems = this.pantryItems.filter(item => item.itemId !== itemId);
        this.saveToLocalStorage();
        this.updateDisplay();
        this.showSuccess('Item removed from pantry');
    }

    editExpiration(itemId) {
        console.log('Editing expiration for item:', itemId);
        const item = this.pantryItems.find(item => item.itemId === itemId);
        if (!item) return;

        const newExpiration = prompt(`Enter new expiration date for ${item.name}:\n(Format: YYYY-MM-DD)`, item.expiration);
        
        if (newExpiration === null) return;
        
        if (this.isValidDate(newExpiration)) {
            item.expiration = newExpiration;
            item.isAIDetected = false;
            item.lastUpdated = new Date().toISOString();
            
            this.saveToLocalStorage();
            this.updateDisplay();
            this.showSuccess(`Updated expiration for ${item.name}`);
        } else {
            this.showError('Please enter a valid date in YYYY-MM-DD format');
        }
    }

    isValidDate(dateString) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.showLoading('Analyzing food with AI...');
        
        try {
            const detectedFoods = await this.detectFoodWithAI(file);
            for (const food of detectedFoods) {
                await this.addPantryItem(food.name, food.expirationDays, true);
            }
            this.showSuccess(`AI detected: ${detectedFoods.map(f => f.name).join(', ')}`);
        } catch (error) {
            console.error('AI detection failed, using simulation:', error);
            const simulatedFoods = await this.simulateAIDetection(file);
            for (const food of simulatedFoods) {
                await this.addPantryItem(food.name, food.expirationDays, true);
            }
            this.showSuccess(`Demo mode: ${simulatedFoods.map(f => f.name).join(', ')}`);
        } finally {
            this.hideLoading();
        }
        
        event.target.value = '';
    }

    async detectFoodWithAI(imageFile) {
        throw new Error('AWS API not configured yet');
    }

    async simulateAIDetection(file) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const mockAIDetections = [
            [
                { name: 'Apple', expirationDays: 7 },
                { name: 'Banana', expirationDays: 5 },
                { name: 'Milk', expirationDays: 10 }
            ],
            [
                { name: 'Bread', expirationDays: 7 },
                { name: 'Eggs', expirationDays: 28 },
                { name: 'Cheese', expirationDays: 21 }
            ],
            [
                { name: 'Chicken', expirationDays: 3 },
                { name: 'Broccoli', expirationDays: 10 },
                { name: 'Carrots', expirationDays: 30 }
            ],
            [
                { name: 'Yogurt', expirationDays: 21 },
                { name: 'Orange', expirationDays: 14 },
                { name: 'Lettuce', expirationDays: 7 }
            ]
        ];
        return mockAIDetections[Math.floor(Math.random() * mockAIDetections.length)];
    }

    async addManualItem() {
        const foodInput = document.getElementById('foodName');
        const foodName = foodInput.value.trim();
        
        if (!foodName) {
            this.showError('Please enter a food name');
            return;
        }

        try {
            const expirationDays = 7;
            await this.addPantryItem(foodName, expirationDays, false);
            foodInput.value = '';
            this.showSuccess(`Added ${foodName} to pantry!`);
        } catch (error) {
            this.showError('Failed to add item. Please try again.');
        }
    }

    async addPantryItem(foodName, expirationDays, isAIDetected) {
        const newItem = {
            itemId: `${this.userId}_${Date.now()}`,
            userId: this.userId,
            name: foodName,
            expiration: this.calculateExpirationDate(expirationDays),
            expirationDays: expirationDays,
            isAIDetected: isAIDetected,
            addedDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        this.pantryItems.push(newItem);
        this.saveToLocalStorage();
        this.updateDisplay();
    }

    async loadPantry() {
        this.loadFromLocalStorage();
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('smartPantry');
        this.pantryItems = saved ? JSON.parse(saved) : [];
    }

    saveToLocalStorage() {
        localStorage.setItem('smartPantry', JSON.stringify(this.pantryItems));
    }

    calculateExpirationDate(expirationDays) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + expirationDays);
        return expirationDate.toISOString().split('T')[0];
    }

    updateDisplay() {
        this.updateStats();
        this.renderPantryList();
        this.updateAWSStatus();
    }

    updateStats() {
        const totalItems = this.pantryItems.length;
        const expiringSoon = this.pantryItems.filter(item => {
            const daysUntilExpiry = this.getDaysUntilExpiry(item.expiration);
            return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
        }).length;

        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('expiringSoon').textContent = expiringSoon;
    }

    getDaysUntilExpiry(expirationDate) {
        const today = new Date();
        const expiry = new Date(expirationDate);
        const diffTime = expiry - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    renderPantryList() {
        const container = document.getElementById('itemsContainer');
        
        if (this.pantryItems.length === 0) {
            container.innerHTML = this.createEmptyState();
            return;
        }

        const sortedItems = [...this.pantryItems].sort((a, b) => 
            new Date(a.expiration) - new Date(b.expiration)
        );

        container.innerHTML = sortedItems.map(item => this.createPantryItemHTML(item)).join('');
    }

    createEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">🥺</div>
                <h3>Your pantry is empty</h3>
                <p>Add some food items to get started!</p>
            </div>
        `;
    }

    createPantryItemHTML(item) {
        const expirationClass = this.getExpirationClass(item.expiration);
        const expirationText = this.getExpirationText(item.expiration);
        
        return `
            <div class="pantry-item" data-item-id="${item.itemId}">
                <div class="item-main">
                    <span class="item-name">${item.name}</span>
                    <span class="expiration-badge ${expirationClass}">
                        ${expirationText}
                    </span>
                </div>
                <div class="item-details">
                    <span class="expiration-date">Expires: ${item.expiration}</span>
                    <div class="item-meta">
                        <span class="detection-badge">${item.isAIDetected ? '🤖 AI' : '✏️ Manual'}</span>
                        <span class="storage-badge">${this.awsEnabled ? '☁️ AWS' : '📱 Local'}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="edit-expiration-btn" title="Edit expiration date">📅 Edit</button>
                    <button class="delete-btn" title="Remove item">🗑️ Remove</button>
                </div>
            </div>
        `;
    }

    getExpirationClass(expirationDate) {
        const daysUntilExpiry = this.getDaysUntilExpiry(expirationDate);
        
        if (daysUntilExpiry < 0) return 'expired';
        if (daysUntilExpiry <= 2) return 'expiring-soon';
        if (daysUntilExpiry <= 5) return 'expiring-warning';
        return 'expiring-ok';
    }

    getExpirationText(expirationDate) {
        const daysUntilExpiry = this.getDaysUntilExpiry(expirationDate);
        
        if (daysUntilExpiry < 0) return 'EXPIRED';
        if (daysUntilExpiry === 0) return 'TODAY';
        if (daysUntilExpiry === 1) return 'TOMORROW';
        if (daysUntilExpiry <= 7) return `${daysUntilExpiry} DAYS`;
        return 'OK';
    }

    checkAWSConnection() {
        setTimeout(() => {
            this.awsEnabled = true;
            this.updateAWSStatus();
            this.showSuccess('Connected to AWS Cloud! ☁️');
        }, 2000);
    }

    updateAWSStatus() {
        const statusElement = document.getElementById('awsStatus') || this.createAWSStatusElement();
        statusElement.textContent = this.awsEnabled ? '☁️ Connected to AWS' : '⏳ Connecting to AWS...';
        statusElement.className = `aws-status ${this.awsEnabled ? 'connected' : 'connecting'}`;
    }

    createAWSStatusElement() {
        const header = document.querySelector('.app-header');
        const statusElement = document.createElement('div');
        statusElement.id = 'awsStatus';
        header.appendChild(statusElement);
        return statusElement;
    }

    showLoading(message) {
        const existingLoader = document.getElementById('loadingIndicator');
        if (existingLoader) existingLoader.remove();

        const loader = document.createElement('div');
        loader.id = 'loadingIndicator';
        loader.className = 'loading-indicator';
        loader.innerHTML = `
            <div class="loading-spinner"></div>
            <span>${message}</span>
        `;
        document.body.appendChild(loader);
    }

    hideLoading() {
        const loader = document.getElementById('loadingIndicator');
        if (loader) loader.remove();
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.smartPantry = new SmartPantry();
});