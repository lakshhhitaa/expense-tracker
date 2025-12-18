-- Web3 Expense Tracker Database Schema
-- Created for expense tracking with Web3 aesthetics

-- Create database
CREATE DATABASE IF NOT EXISTS web3_expense_tracker;
USE web3_expense_tracker;

-- Categories table
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(10) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods table
CREATE TABLE payment_methods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(10) NOT NULL,
    is_crypto BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (for future multi-user support)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    wallet_address VARCHAR(42), -- Ethereum wallet address
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT DEFAULT 1, -- Default user for single-user mode
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    type ENUM('Income', 'Expense') NOT NULL,
    category_id INT NOT NULL,
    payment_method_id INT NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    transaction_hash VARCHAR(66), -- For blockchain transactions
    block_number BIGINT, -- For blockchain transactions
    gas_fee DECIMAL(15, 8), -- For crypto transactions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    INDEX idx_user_date (user_id, transaction_date),
    INDEX idx_type (type),
    INDEX idx_category (category_id),
    INDEX idx_payment_method (payment_method_id)
);

-- Budget table for tracking spending limits
CREATE TABLE budgets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT DEFAULT 1,
    category_id INT NOT NULL,
    monthly_limit DECIMAL(15, 2) NOT NULL,
    current_spent DECIMAL(15, 2) DEFAULT 0.00,
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    UNIQUE KEY unique_user_category_month (user_id, category_id, month_year)
);

-- Crypto wallet transactions for Web3 integration
CREATE TABLE crypto_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id INT NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    token_symbol VARCHAR(10) DEFAULT 'ETH',
    token_amount DECIMAL(25, 8),
    usd_value DECIMAL(15, 2),
    network VARCHAR(20) DEFAULT 'ethereum',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Insert default categories
INSERT INTO categories (name, icon, color) VALUES
('Food', '🍔', '#ef4444'),
('Transport', '🚗', '#3b82f6'),
('Shopping', '🛍️', '#ec4899'),
('Bills', '💡', '#f59e0b'),
('Entertainment', '🎮', '#8b5cf6'),
('Health', '🏥', '#10b981'),
('Education', '📚', '#06b6d4'),
('Salary', '💼', '#22c55e'),
('Investment', '📊', '#6366f1'),
('Other', '📦', '#6b7280');

-- Insert default payment methods
INSERT INTO payment_methods (name, icon, is_crypto) VALUES
('Cash', '💵', FALSE),
('Card', '💳', FALSE),
('UPI', '📱', FALSE),
('Crypto Wallet', '₿', TRUE);

-- Insert default user
INSERT INTO users (username, email, wallet_address) VALUES
('default_user', 'user@web3tracker.com', NULL);

-- Sample transactions for testing
INSERT INTO transactions (title, amount, type, category_id, payment_method_id, description, transaction_date) VALUES
('Lunch at Restaurant', 450.00, 'Expense', 1, 2, 'Team lunch meeting', '2024-12-15'),
('Monthly Salary', 75000.00, 'Income', 8, 2, 'December salary credit', '2024-12-01'),
('Uber Ride', 180.00, 'Expense', 2, 3, 'Office to home', '2024-12-14'),
('Grocery Shopping', 2500.00, 'Expense', 3, 1, 'Weekly groceries', '2024-12-13'),
('Electricity Bill', 1200.00, 'Expense', 4, 3, 'Monthly electricity payment', '2024-12-10'),
('Movie Tickets', 600.00, 'Expense', 5, 2, 'Weekend entertainment', '2024-12-12'),
('Crypto Investment', 5000.00, 'Expense', 9, 4, 'Bought ETH', '2024-12-08');

-- Views for easy data retrieval

-- Monthly summary view
CREATE VIEW monthly_summary AS
SELECT 
    DATE_FORMAT(transaction_date, '%Y-%m') as month_year,
    SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END) as total_expense,
    SUM(CASE WHEN type = 'Income' THEN amount ELSE -amount END) as net_balance,
    COUNT(*) as transaction_count
FROM transactions 
GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
ORDER BY month_year DESC;

-- Category-wise spending view
CREATE VIEW category_spending AS
SELECT 
    c.name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    SUM(CASE WHEN t.type = 'Expense' THEN t.amount ELSE 0 END) as total_spent,
    COUNT(CASE WHEN t.type = 'Expense' THEN 1 END) as expense_count,
    AVG(CASE WHEN t.type = 'Expense' THEN t.amount END) as avg_expense
FROM categories c
LEFT JOIN transactions t ON c.id = t.category_id
GROUP BY c.id, c.name, c.icon, c.color
ORDER BY total_spent DESC;

-- Recent transactions view
CREATE VIEW recent_transactions AS
SELECT 
    t.id,
    t.title,
    t.amount,
    t.type,
    c.name as category_name,
    c.icon as category_icon,
    pm.name as payment_method,
    pm.icon as payment_icon,
    t.description,
    t.transaction_date,
    t.created_at
FROM transactions t
JOIN categories c ON t.category_id = c.id
JOIN payment_methods pm ON t.payment_method_id = pm.id
ORDER BY t.transaction_date DESC, t.created_at DESC
LIMIT 50;

-- Stored procedures for common operations

DELIMITER //

-- Add new transaction procedure
CREATE PROCEDURE AddTransaction(
    IN p_title VARCHAR(255),
    IN p_amount DECIMAL(15,2),
    IN p_type ENUM('Income', 'Expense'),
    IN p_category_name VARCHAR(50),
    IN p_payment_method VARCHAR(50),
    IN p_description TEXT,
    IN p_transaction_date DATE
)
BEGIN
    DECLARE v_category_id INT;
    DECLARE v_payment_id INT;
    
    -- Get category ID
    SELECT id INTO v_category_id FROM categories WHERE name = p_category_name;
    
    -- Get payment method ID
    SELECT id INTO v_payment_id FROM payment_methods WHERE name = p_payment_method;
    
    -- Insert transaction
    INSERT INTO transactions (title, amount, type, category_id, payment_method_id, description, transaction_date)
    VALUES (p_title, p_amount, p_type, v_category_id, v_payment_id, p_description, p_transaction_date);
    
    SELECT LAST_INSERT_ID() as transaction_id;
END //

-- Get balance summary procedure
CREATE PROCEDURE GetBalanceSummary()
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE -amount END), 0) as current_balance
    FROM transactions;
END //

DELIMITER ;

-- Triggers for maintaining data integrity

-- Update budget spending when transaction is added
DELIMITER //
CREATE TRIGGER update_budget_on_insert 
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    IF NEW.type = 'Expense' THEN
        INSERT INTO budgets (category_id, monthly_limit, current_spent, month_year)
        VALUES (NEW.category_id, 0, NEW.amount, DATE_FORMAT(NEW.transaction_date, '%Y-%m'))
        ON DUPLICATE KEY UPDATE current_spent = current_spent + NEW.amount;
    END IF;
END //

-- Update budget spending when transaction is updated
CREATE TRIGGER update_budget_on_update
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    IF OLD.type = 'Expense' THEN
        UPDATE budgets 
        SET current_spent = current_spent - OLD.amount
        WHERE category_id = OLD.category_id 
        AND month_year = DATE_FORMAT(OLD.transaction_date, '%Y-%m');
    END IF;
    
    IF NEW.type = 'Expense' THEN
        INSERT INTO budgets (category_id, monthly_limit, current_spent, month_year)
        VALUES (NEW.category_id, 0, NEW.amount, DATE_FORMAT(NEW.transaction_date, '%Y-%m'))
        ON DUPLICATE KEY UPDATE current_spent = current_spent + NEW.amount;
    END IF;
END //

DELIMITER ;

-- Indexes for better performance
CREATE INDEX idx_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_amount ON transactions(amount);
CREATE INDEX idx_created_at ON transactions(created_at);

-- Sample queries for the application

-- Get all transactions with category and payment method details
-- SELECT t.*, c.name as category, c.icon as category_icon, pm.name as payment_method, pm.icon as payment_icon
-- FROM transactions t
-- JOIN categories c ON t.category_id = c.id
-- JOIN payment_methods pm ON t.payment_method_id = pm.id
-- ORDER BY t.transaction_date DESC;

-- Get monthly spending by category
-- SELECT c.name, c.icon, SUM(t.amount) as total_spent
-- FROM transactions t
-- JOIN categories c ON t.category_id = c.id
-- WHERE t.type = 'Expense' 
-- AND DATE_FORMAT(t.transaction_date, '%Y-%m') = '2024-12'
-- GROUP BY c.id, c.name, c.icon
-- ORDER BY total_spent DESC;

-- Get balance summary
-- CALL GetBalanceSummary();
