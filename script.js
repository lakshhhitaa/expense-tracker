// ==================== Global Variables ====================
let transactions = [];
let editingId = null;

// ==================== Initialize App ====================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadFromLocalStorage();
    setupEventListeners();
    renderSummary();
    renderTransactions();
    drawCharts();
    setDefaultDate();
    init3DTilt();
}

// ==================== Event Listeners ====================
function setupEventListeners() {
    document.getElementById('transactionForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('searchInput').addEventListener('input', filterTransactions);
    document.getElementById('filterCategory').addEventListener('change', filterTransactions);
    document.getElementById('filterType').addEventListener('change', filterTransactions);
    document.getElementById('filterPayment').addEventListener('change', filterTransactions);
    document.getElementById('exportCSV').addEventListener('click', exportCSV);
    document.getElementById('exportJSON').addEventListener('click', exportJSON);
}

// ==================== Form Handling ====================
function setDefaultDate() {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const transaction = {
        id: editingId || Date.now(),
        title: document.getElementById('title').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        date: document.getElementById('date').value,
        description: document.getElementById('description').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        type: document.getElementById('type').value
    };
    
    if (editingId) {
        updateTransaction(transaction);
        showNotification('✅ Transaction updated successfully!');
    } else {
        addTransaction(transaction);
        showNotification('✨ Transaction added successfully!');
    }
    
    document.getElementById('transactionForm').reset();
    setDefaultDate();
    editingId = null;
    document.getElementById('submitBtn').innerHTML = '<span class="btn-glow"></span>Add Transaction';
}

// ==================== Transaction Operations ====================
function addTransaction(transaction) {
    transactions.push(transaction);
    saveToLocalStorage();
    renderSummary();
    renderTransactions();
    drawCharts();
}

function updateTransaction(updatedTransaction) {
    const index = transactions.findIndex(t => t.id === updatedTransaction.id);
    if (index !== -1) {
        transactions[index] = updatedTransaction;
        saveToLocalStorage();
        renderSummary();
        renderTransactions();
        drawCharts();
    }
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveToLocalStorage();
    renderSummary();
    renderTransactions();
    drawCharts();
    showNotification('🗑️ Transaction deleted!');
}

function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
        document.getElementById('title').value = transaction.title;
        document.getElementById('amount').value = transaction.amount;
        document.getElementById('category').value = transaction.category;
        document.getElementById('date').value = transaction.date;
        document.getElementById('description').value = transaction.description;
        document.getElementById('paymentMethod').value = transaction.paymentMethod;
        document.getElementById('type').value = transaction.type;
        
        editingId = id;
        document.getElementById('submitBtn').innerHTML = '<span class="btn-glow"></span>Update Transaction';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ==================== Rendering ====================
function renderSummary() {
    const income = transactions
        .filter(t => t.type === 'Income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'Expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = income - expense;
    
    document.getElementById('totalIncome').textContent = `₹${income.toFixed(2)}`;
    document.getElementById('totalExpense').textContent = `₹${expense.toFixed(2)}`;
    document.getElementById('currentBalance').textContent = `₹${balance.toFixed(2)}`;
}

function renderTransactions() {
    const container = document.getElementById('transactionsList');
    const filteredTransactions = getFilteredTransactions();
    
    if (filteredTransactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💸</div>
                <div class="empty-state-text">No transactions found</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(transaction => `
            <div class="transaction-card" data-id="${transaction.id}">
                <div class="transaction-info">
                    <div class="transaction-header">
                        <div class="transaction-title">${transaction.title}</div>
                        <span class="transaction-type-badge ${transaction.type === 'Income' ? 'income-badge' : 'expense-badge'}">
                            ${transaction.type}
                        </span>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-detail">📅 ${formatDate(transaction.date)}</div>
                        <div class="transaction-detail">🏷️ ${transaction.category}</div>
                        <div class="transaction-detail">💳 ${transaction.paymentMethod}</div>
                    </div>
                    ${transaction.description ? `<div class="transaction-detail" style="margin-top: 8px;">📝 ${transaction.description}</div>` : ''}
                </div>
                <div class="transaction-right">
                    <div class="transaction-amount ${transaction.type === 'Income' ? 'income-amount' : 'expense-amount'}">
                        ${transaction.type === 'Income' ? '+' : '-'}₹${transaction.amount.toFixed(2)}
                    </div>
                    <div class="transaction-actions">
                        <button class="action-btn edit-btn" onclick="editTransaction(${transaction.id})">✏️</button>
                        <button class="action-btn delete-btn" onclick="deleteTransaction(${transaction.id})">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');
}

// ==================== Filtering ====================
function getFilteredTransactions() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('filterCategory').value;
    const typeFilter = document.getElementById('filterType').value;
    const paymentFilter = document.getElementById('filterPayment').value;
    
    return transactions.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchTerm) || 
                            t.description.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || t.category === categoryFilter;
        const matchesType = !typeFilter || t.type === typeFilter;
        const matchesPayment = !paymentFilter || t.paymentMethod === paymentFilter;
        
        return matchesSearch && matchesCategory && matchesType && matchesPayment;
    });
}

function filterTransactions() {
    renderTransactions();
    drawCharts();
}

// ==================== Charts ====================
function drawCharts() {
    drawPieChart();
    drawBarChart();
}

function drawPieChart() {
    const canvas = document.getElementById('pieChart');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get expense data by category
    const expenses = transactions.filter(t => t.type === 'Expense');
    const categoryData = {};
    
    expenses.forEach(t => {
        categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
    });
    
    const categories = Object.keys(categoryData);
    const values = Object.values(categoryData);
    const total = values.reduce((sum, val) => sum + val, 0);
    
    if (total === 0) {
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary');
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No expense data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Colors
    const colors = ['#a855f7', '#3b82f6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];
    
    // Draw pie chart
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 - 20;
    const radius = 120;
    
    let currentAngle = -Math.PI / 2;
    
    categories.forEach((category, index) => {
        const sliceAngle = (values[index] / total) * 2 * Math.PI;
        
        // Draw slice
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.lineTo(centerX, centerY);
        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();
        
        // Add glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = colors[index % colors.length];
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        currentAngle += sliceAngle;
    });
    
    // Draw legend
    const legendX = 20;
    let legendY = canvas.height - 80;
    
    categories.forEach((category, index) => {
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(legendX, legendY, 15, 15);
        
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary');
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${category}: ₹${values[index].toFixed(0)}`, legendX + 20, legendY + 12);
        
        legendY += 20;
    });
}

function drawBarChart() {
    const canvas = document.getElementById('barChart');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 400;
    canvas.height = 400;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate income and expense
    const income = transactions
        .filter(t => t.type === 'Income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'Expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const maxValue = Math.max(income, expense) || 1000;
    
    // Chart dimensions
    const barWidth = 100;
    const spacing = 80;
    const maxHeight = 250;
    const startY = canvas.height - 100;
    
    // Draw Income Bar
    const incomeHeight = (income / maxValue) * maxHeight;
    const incomeX = spacing;
    
    // Gradient for income
    const incomeGradient = ctx.createLinearGradient(0, startY - incomeHeight, 0, startY);
    incomeGradient.addColorStop(0, '#10b981');
    incomeGradient.addColorStop(1, '#059669');
    
    ctx.fillStyle = incomeGradient;
    ctx.fillRect(incomeX, startY - incomeHeight, barWidth, incomeHeight);
    
    // Glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#10b981';
    ctx.fillRect(incomeX, startY - incomeHeight, barWidth, incomeHeight);
    ctx.shadowBlur = 0;
    
    // Draw Expense Bar
    const expenseHeight = (expense / maxValue) * maxHeight;
    const expenseX = incomeX + barWidth + spacing;
    
    // Gradient for expense
    const expenseGradient = ctx.createLinearGradient(0, startY - expenseHeight, 0, startY);
    expenseGradient.addColorStop(0, '#ef4444');
    expenseGradient.addColorStop(1, '#dc2626');
    
    ctx.fillStyle = expenseGradient;
    ctx.fillRect(expenseX, startY - expenseHeight, barWidth, expenseHeight);
    
    // Glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ef4444';
    ctx.fillRect(expenseX, startY - expenseHeight, barWidth, expenseHeight);
    ctx.shadowBlur = 0;
    
    // Labels
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary');
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    
    ctx.fillText('Income', incomeX + barWidth / 2, startY + 30);
    ctx.fillText('Expense', expenseX + barWidth / 2, startY + 30);
    
    // Values
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`₹${income.toFixed(0)}`, incomeX + barWidth / 2, startY - incomeHeight - 10);
    
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`₹${expense.toFixed(0)}`, expenseX + barWidth / 2, startY - expenseHeight - 10);
}

// ==================== Export Functions ====================
function exportCSV() {
    if (transactions.length === 0) {
        showNotification('⚠️ No transactions to export!');
        return;
    }
    
    const headers = ['Title', 'Amount', 'Category', 'Date', 'Description', 'Payment Method', 'Type'];
    const csvContent = [
        headers.join(','),
        ...transactions.map(t => [
            t.title,
            t.amount,
            t.category,
            t.date,
            t.description,
            t.paymentMethod,
            t.type
        ].join(','))
    ].join('\n');
    
    downloadFile(csvContent, 'transactions.csv', 'text/csv');
    showNotification('📥 CSV exported successfully!');
}

function exportJSON() {
    if (transactions.length === 0) {
        showNotification('⚠️ No transactions to export!');
        return;
    }
    
    const jsonContent = JSON.stringify(transactions, null, 2);
    downloadFile(jsonContent, 'transactions.json', 'application/json');
    showNotification('📥 JSON exported successfully!');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ==================== Local Storage ====================
function saveToLocalStorage() {
    localStorage.setItem('web3_transactions', JSON.stringify(transactions));
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem('web3_transactions');
    if (stored) {
        transactions = JSON.parse(stored);
    }
}

// ==================== Theme Toggle ====================
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.querySelector('.theme-icon');
    
    body.classList.toggle('light-mode');
    
    if (body.classList.contains('light-mode')) {
        themeIcon.textContent = '☀️';
    } else {
        themeIcon.textContent = '🌙';
    }
    
    // Redraw charts with new theme
    drawCharts();
}

// ==================== Notifications ====================
function showNotification(message) {
    const container = document.getElementById('notificationContainer');
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">⬡</div>
            <div class="notification-text">${message}</div>
        </div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'notificationSlide 0.5s ease reverse';
        setTimeout(() => {
            container.removeChild(notification);
        }, 500);
    }, 3000);
}

// ==================== Utility Functions ====================
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ==================== 3D Tilt Effect ====================
function init3DTilt() {
    const tiltElements = document.querySelectorAll('[data-tilt]');
    
    tiltElements.forEach(element => {
        element.addEventListener('mousemove', (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            element.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        });
    });
}