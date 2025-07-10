-- MaxControl Database Schema
-- This file creates the complete database structure for the MaxControl ERP system

-- Create database (run this separately if needed)
-- CREATE DATABASE IF NOT EXISTS maxcontrol_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE maxcontrol_db;

-- Company Information Table
CREATE TABLE IF NOT EXISTS company_info (
    id INT PRIMARY KEY DEFAULT 1,
    name VARCHAR(255) NOT NULL,
    logoUrlDarkBg TEXT,
    logoUrlLightBg TEXT,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    cnpj VARCHAR(20),
    instagram VARCHAR(255),
    website VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default company info
INSERT IGNORE INTO company_info (id, name, address, phone, email) 
VALUES (1, 'MaxControl ERP', 'Rua Exemplo, 123 - Centro', '(11) 99999-9999', 'contato@maxcontrol.com.br');

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    fullName VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'sales', 'viewer') NOT NULL DEFAULT 'sales',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (id, username, fullName, password, role) 
VALUES (
    'admin-001', 
    'admin', 
    'Administrador do Sistema', 
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
    'admin'
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    pricingModel ENUM('unidade', 'm2') NOT NULL DEFAULT 'unidade',
    basePrice DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(50) DEFAULT 'un',
    customCashPrice DECIMAL(10,2) NULL,
    customCardPrice DECIMAL(10,2) NULL,
    supplierCost DECIMAL(10,2) NULL,
    categoryId VARCHAR(36) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    documentType ENUM('CPF', 'CNPJ', 'N/A') DEFAULT 'CPF',
    documentNumber VARCHAR(20),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    postalCode VARCHAR(10),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Down Payments Table
CREATE TABLE IF NOT EXISTS down_payments (
    id VARCHAR(36) PRIMARY KEY,
    customerId VARCHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
);

-- Quotes Table
CREATE TABLE IF NOT EXISTS quotes (
    id VARCHAR(36) PRIMARY KEY,
    quoteNumber VARCHAR(50) UNIQUE NOT NULL,
    customerId VARCHAR(36) NULL,
    clientName VARCHAR(255) NOT NULL,
    clientContact VARCHAR(255),
    items JSON NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discountType ENUM('percentage', 'fixed', 'none') DEFAULT 'none',
    discountValue DECIMAL(10,2) DEFAULT 0.00,
    discountAmountCalculated DECIMAL(10,2) DEFAULT 0.00,
    subtotalAfterDiscount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    totalCash DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    totalCard DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    downPaymentApplied DECIMAL(10,2) DEFAULT 0.00,
    selectedPaymentMethod VARCHAR(100),
    paymentDate DATE,
    deliveryDeadline DATE,
    notes TEXT,
    status ENUM('draft', 'sent', 'accepted', 'rejected', 'converted_to_order', 'cancelled') DEFAULT 'draft',
    companyInfoSnapshot JSON NOT NULL,
    salespersonUsername VARCHAR(50) NOT NULL,
    salespersonFullName VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE SET NULL
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Supplier Debts Table
CREATE TABLE IF NOT EXISTS supplier_debts (
    id VARCHAR(36) PRIMARY KEY,
    supplierId VARCHAR(36) NOT NULL,
    description TEXT,
    totalAmount DECIMAL(10,2) NOT NULL,
    dateAdded DATE NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- Supplier Credits Table
CREATE TABLE IF NOT EXISTS supplier_credits (
    id VARCHAR(36) PRIMARY KEY,
    supplierId VARCHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- Accounts Payable Table
CREATE TABLE IF NOT EXISTS accounts_payable (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    dueDate DATE NOT NULL,
    isPaid BOOLEAN DEFAULT FALSE,
    notes TEXT,
    seriesId VARCHAR(36),
    totalInstallmentsInSeries INT,
    installmentNumberOfSeries INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(categoryId);
CREATE INDEX IF NOT EXISTS idx_products_pricing ON products(pricingModel);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customerId);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(createdAt);
CREATE INDEX IF NOT EXISTS idx_down_payments_customer ON down_payments(customerId);
CREATE INDEX IF NOT EXISTS idx_supplier_debts_supplier ON supplier_debts(supplierId);
CREATE INDEX IF NOT EXISTS idx_supplier_credits_supplier ON supplier_credits(supplierId);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due ON accounts_payable(dueDate);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_series ON accounts_payable(seriesId);

-- Insert some sample categories
INSERT IGNORE INTO categories (id, name) VALUES 
('cat-001', 'Impressão Digital'),
('cat-002', 'Sinalização'),
('cat-003', 'Material Promocional'),
('cat-004', 'Acabamentos');

-- Insert some sample products
INSERT IGNORE INTO products (id, name, description, pricingModel, basePrice, unit, categoryId) VALUES 
('prod-001', 'Cartão de Visita - Pacote 500un', 'Cartões de visita em papel couché 300g, impressão colorida frente e verso', 'unidade', 45.00, 'pacote c/ 500', 'cat-001'),
('prod-002', 'Banner em Lona', 'Banner personalizado em lona vinílica, impressão digital de alta qualidade', 'm2', 25.00, 'm²', 'cat-002'),
('prod-003', 'Flyer A5', 'Flyers em papel couché 150g, impressão colorida', 'unidade', 0.15, 'unidade', 'cat-003'),
('prod-004', 'Adesivo Vinil', 'Adesivo em vinil branco, corte eletrônico', 'm2', 18.00, 'm²', 'cat-002');