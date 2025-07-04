const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mysql = require('mysql2/promise');
const { setupRoutes } = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

// ============= CONFIGURAÇÃO DO BANCO MYSQL =============

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'maxcontrol',
  port: parseInt(process.env.DB_PORT || '3306'),
  ssl: false,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  charset: 'utf8mb4',
  insecureAuth: true,
  supportBigNumbers: true,
  bigNumberStrings: true
};

// Pool de conexões MySQL
const pool = mysql.createPool(dbConfig);

// Função para testar conexão
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL conectado:', dbConfig.host);
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query teste executada:', rows[0]);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erro MySQL:', {
      message: error.message,
      code: error.code,
      errno: error.errno
    });
    return false;
  }
};

// ============= CONFIGURAÇÃO CORS =============

console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
console.log('🌍 Configurando CORS...');

// Lista de origens permitidas
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000', 
  'https://localhost:5173',
  'https://localhost:3000',
  'https://maxcontrol.f13design.com.br',
  'https://www.maxcontrol.f13design.com.br',
  'http://maxcontrol.f13design.com.br',
  'http://www.maxcontrol.f13design.com.br'
];

const corsOptions = {
  origin: function (origin, callback) {
    console.log('🔍 CORS origin recebida:', origin);
    
    // Permitir requisições sem origin (ex: Postman, mobile apps)
    if (!origin) {
      console.log('✅ CORS: Requisição sem origin permitida');
      return callback(null, true);
    }
    
    // Verificar se a origin está na lista permitida
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Origin permitida:', origin);
      return callback(null, true);
    }
    
    // Em desenvolvimento, permitir qualquer origin
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔧 CORS: Permitindo em desenvolvimento');
      return callback(null, true);
    }
    
    console.log('❌ CORS: Origin BLOQUEADA:', origin);
    return callback(new Error('Não permitido pelo CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Access-Control-Allow-Credentials'
  ],
  optionsSuccessStatus: 200
};

// ============= MIDDLEWARE =============

// Aplicar CORS ANTES de qualquer outro middleware
app.use(cors(corsOptions));

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

// Configuração de sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// ============= SCHEMA MYSQL =============

const createAllTables = async () => {
  try {
    console.log('🔧 Criando schema MySQL completo...');
    
    // Users
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        fullName VARCHAR(100),
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'sales', 'viewer') NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Company Info
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS company_info (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        logoUrlDarkBg TEXT,
        logoUrlLightBg TEXT,
        address TEXT,
        phone VARCHAR(20),
        email VARCHAR(100),
        cnpj VARCHAR(20),
        instagram VARCHAR(100),
        website VARCHAR(100),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Categories
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Products
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        pricingModel ENUM('unidade', 'm2'),
        basePrice DECIMAL(10,2) NOT NULL,
        unit VARCHAR(50),
        customCashPrice DECIMAL(10,2),
        customCardPrice DECIMAL(10,2),
        supplierCost DECIMAL(10,2),
        categoryId VARCHAR(36),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoryId) REFERENCES categories(id)
      )
    `);

    // Customers
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        documentType ENUM('CPF', 'CNPJ', 'N/A') DEFAULT 'N/A',
        documentNumber VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        postalCode VARCHAR(10),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customer Down Payments
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customer_down_payments (
        id VARCHAR(36) PRIMARY KEY,
        customerId VARCHAR(36) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);

    // Quotes
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS quotes (
        id VARCHAR(36) PRIMARY KEY,
        quoteNumber VARCHAR(50) UNIQUE NOT NULL,
        customerId VARCHAR(36),
        clientName VARCHAR(255) NOT NULL,
        clientContact VARCHAR(100),
        subtotal DECIMAL(10,2) NOT NULL,
        discountType ENUM('percentage', 'fixed', 'none') DEFAULT 'none',
        discountValue DECIMAL(10,2) DEFAULT 0,
        discountAmountCalculated DECIMAL(10,2) DEFAULT 0,
        subtotalAfterDiscount DECIMAL(10,2) NOT NULL,
        totalCash DECIMAL(10,2) NOT NULL,
        totalCard DECIMAL(10,2) NOT NULL,
        downPaymentApplied DECIMAL(10,2) DEFAULT 0,
        selectedPaymentMethod VARCHAR(100),
        paymentDate DATE,
        deliveryDeadline DATE,
        status ENUM('draft', 'sent', 'accepted', 'rejected', 'converted_to_order', 'cancelled') DEFAULT 'draft',
        notes TEXT,
        salespersonUsername VARCHAR(50) NOT NULL,
        salespersonFullName VARCHAR(100),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id)
      )
    `);

    // Quote Items
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS quote_items (
        id VARCHAR(36) PRIMARY KEY,
        quoteId VARCHAR(36) NOT NULL,
        productId VARCHAR(36) NOT NULL,
        productName VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unitPrice DECIMAL(10,2) NOT NULL,
        totalPrice DECIMAL(10,2) NOT NULL,
        pricingModel ENUM('unidade', 'm2'),
        width DECIMAL(10,2),
        height DECIMAL(10,2),
        itemCountForAreaCalc INT,
        FOREIGN KEY (quoteId) REFERENCES quotes(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products(id)
      )
    `);

    // Accounts Payable
    await pool.execute(`
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
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Suppliers
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        cnpj VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS supplier_debts (
        id VARCHAR(36) PRIMARY KEY,
        supplierId VARCHAR(36) NOT NULL,
        description TEXT,
        totalAmount DECIMAL(10,2) NOT NULL,
        dateAdded DATE NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS supplier_credits (
        id VARCHAR(36) PRIMARY KEY,
        supplierId VARCHAR(36) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE
      )
    `);

    await insertInitialData();
    console.log('✅ Schema MySQL criado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar schema MySQL:', error);
  }
};

const insertInitialData = async () => {
  try {
    // Admin user
    const [existingAdmin] = await pool.execute(`SELECT id FROM users WHERE username = 'admin'`);
    if (existingAdmin.length === 0) {
      await pool.execute(`
        INSERT INTO users (id, username, fullName, password, role)
        VALUES ('1', 'admin', 'Administrador', 'admin', 'admin')
      `);
      console.log('✅ Usuário admin criado (admin/admin)');
    }

    // Company info
    const [existingCompany] = await pool.execute(`SELECT id FROM company_info LIMIT 1`);
    if (existingCompany.length === 0) {
      await pool.execute(`
        INSERT INTO company_info (name, address, phone, email)
        VALUES ('MaxControl Demo', 'Rua Demo, 123', '(11) 99999-9999', 'demo@maxcontrol.com')
      `);
    }

    // Categoria padrão
    const [existingCategory] = await pool.execute(`SELECT id FROM categories LIMIT 1`);
    if (existingCategory.length === 0) {
      await pool.execute(`
        INSERT INTO categories (id, name)
        VALUES ('cat1', 'Produtos Gerais')
      `);
    }

    // Produto demo
    const [existingProduct] = await pool.execute(`SELECT id FROM products LIMIT 1`);
    if (existingProduct.length === 0) {
      await pool.execute(`
        INSERT INTO products (id, name, description, pricingModel, basePrice, unit, categoryId)
        VALUES ('prod1', 'Cartão de Visita', 'Cartão de visita padrão', 'unidade', 0.50, 'unidade', 'cat1')
      `);
    }

  } catch (error) {
    console.error('❌ Erro ao inserir dados iniciais:', error);
  }
};

// ============= CONFIGURAÇÃO DAS ROTAS =============

// Configurar e usar as rotas CORRETAMENTE
const routes = setupRoutes(pool);
app.use('/api', routes);

// Recreate schema endpoint
app.get('/api/recreate-schema', async (req, res) => {
  try {
    await createAllTables();
    res.json({ message: 'Schema MySQL recriado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ERROR HANDLERS =============

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404:', req.method, req.originalUrl);
  res.status(404).json({ 
    message: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal error'
  });
});

// ============= STARTUP =============

const startServer = async () => {
  try {
    console.log('🚀 Inicializando MaxControl com MySQL...');
    console.log('🔍 Configuração do banco:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port,
      ssl: dbConfig.ssl
    });
    
    // Test connection
    const connected = await testConnection();
    if (connected) {
      console.log('✅ MySQL conectado, criando schema...');
      await createAllTables();
    } else {
      console.log('⚠️ MySQL não conectado, servidor continuará...');
    }
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 MaxControl rodando na porta ${PORT}`);
      console.log(`🗄️ Database: MySQL cPanel`);
      console.log(`👤 Login padrão: admin/admin`);
      console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/me`);
      console.log(`🔍 Debug: http://localhost:${PORT}/api/debug`);
      console.log(`🌍 CORS configurado para:`, allowedOrigins);
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM recebido...');
      server.close(() => process.exit(0));
    });

    process.on('SIGINT', () => {
      console.log('SIGINT recebido...');
      server.close(() => process.exit(0));
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar:', error);
    process.exit(1);
  }
};

startServer();
module.exports = app;