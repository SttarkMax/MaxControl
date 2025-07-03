const express = require('express');
const cors = require('cors');
const session = require('express-session');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do banco MySQL (cPanel)
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

const pool = mysql.createPool(dbConfig);

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

// CORS configuração
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000', 
      'https://localhost:5173',
      'https://localhost:3000',
      'https://maxcontrol.f13design.com.br',
      'https://www.maxcontrol.f13design.com.br',
      'http://seu-dominio.com',
      'http://www.seu-dominio.com'
    ];
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ CORS bloqueado para:', origin);
      callback(null, true); // Permitir para debug
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin');
  
  console.log(`🌐 ${req.method} ${req.path} from ${origin || 'no-origin'}`);
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Session
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

// Schema MySQL completo
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

    // Debts
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS debts (
        id VARCHAR(36) PRIMARY KEY,
        supplierId VARCHAR(36) NOT NULL,
        description TEXT,
        totalAmount DECIMAL(10,2) NOT NULL,
        dateAdded DATE NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE
      )
    `);

    // Supplier Credits
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

    await insertInitialData();
    console.log('✅ Schema MySQL completo criado com sucesso!');
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
    console.error('❌ Erro ao inserir dados MySQL:', error);
  }
};

// Função para gerar UUID simples
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

// ============= ROTAS DA API =============

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'mysql-cpanel'
  });
});

// Test DB
app.get('/api/test-db', async (req, res) => {
  try {
    const connected = await testConnection();
    if (connected) {
      const [rows] = await pool.execute('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = ?', [dbConfig.database]);
      res.json({ 
        database: 'connected',
        type: 'mysql-cpanel',
        timestamp: new Date().toISOString(),
        tables: rows[0].table_count,
        config: {
          host: dbConfig.host,
          user: dbConfig.user,
          database: dbConfig.database,
          port: dbConfig.port
        }
      });
    } else {
      res.status(500).json({ 
        database: 'disconnected',
        type: 'mysql-cpanel',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ 
      database: 'error',
      error: error.message
    });
  }
});

// ===== AUTH ROUTES =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔐 Tentativa de login:', username);
    
    const [rows] = await pool.execute(`
      SELECT * FROM users WHERE username = ? AND password = ?
    `, [username, password]);

    if (rows.length > 0) {
      const user = rows[0];
      req.session.user = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      };
      
      console.log('✅ Login bem-sucedido:', username);
      res.json(req.session.user);
    } else {
      console.log('❌ Login falhou:', username);
      res.status(401).json({ message: 'Credenciais inválidas' });
    }
  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  console.log('🔍 Check auth, session:', req.session.user ? 'exists' : 'none');
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: 'Não autenticado' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Erro no logout:', err);
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
    res.json({ message: 'Logout realizado com sucesso' });
  });
});

// ===== COMPANY INFO ROUTES =====
app.get('/api/company-info', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM company_info LIMIT 1');
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.json({ 
        name: 'MaxControl', 
        address: '', 
        phone: '', 
        email: '' 
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/company-info', async (req, res) => {
  try {
    const { name, address, phone, email, cnpj, instagram, website } = req.body;
    
    const [existing] = await pool.execute('SELECT id FROM company_info LIMIT 1');
    
    if (existing.length > 0) {
      await pool.execute(`
        UPDATE company_info 
        SET name = ?, address = ?, phone = ?, email = ?, cnpj = ?, instagram = ?, website = ?
        WHERE id = ?
      `, [name, address, phone, email, cnpj, instagram, website, existing[0].id]);
    } else {
      await pool.execute(`
        INSERT INTO company_info (name, address, phone, email, cnpj, instagram, website)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [name, address, phone, email, cnpj, instagram, website]);
    }
    
    res.json({ message: 'Informações salvas com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== PRODUCTS ROUTES =====
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = req.body;
    const id = generateId();
    
    await pool.execute(`
      INSERT INTO products (id, name, description, pricingModel, basePrice, unit, customCashPrice, customCardPrice, supplierCost, categoryId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, product.name, product.description, product.pricingModel, product.basePrice, product.unit, product.customCashPrice, product.customCardPrice, product.supplierCost, product.categoryId]);
    
    res.json({ id, ...product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = req.body;
    
    await pool.execute(`
      UPDATE products 
      SET name = ?, description = ?, pricingModel = ?, basePrice = ?, unit = ?, customCashPrice = ?, customCardPrice = ?, supplierCost = ?, categoryId = ?
      WHERE id = ?
    `, [product.name, product.description, product.pricingModel, product.basePrice, product.unit, product.customCashPrice, product.customCardPrice, product.supplierCost, product.categoryId, id]);
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM products WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== CATEGORIES ROUTES =====
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const category = req.body;
    const id = generateId();
    
    await pool.execute('INSERT INTO categories (id, name) VALUES (?, ?)', [id, category.name]);
    res.json({ id, ...category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const category = req.body;
    
    await pool.execute('UPDATE categories SET name = ? WHERE id = ?', [category.name, id]);
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== CUSTOMERS ROUTES =====
app.get('/api/customers', async (req, res) => {
  try {
    const [customers] = await pool.execute('SELECT * FROM customers ORDER BY name');
    
    // Buscar down payments para cada cliente
    for (let customer of customers) {
      const [downPayments] = await pool.execute('SELECT * FROM customer_down_payments WHERE customerId = ? ORDER BY date DESC', [customer.id]);
      customer.downPayments = downPayments;
    }
    
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const customer = req.body;
    const id = generateId();
    
    await pool.execute(`
      INSERT INTO customers (id, name, documentType, documentNumber, phone, email, address, city, postalCode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, customer.name, customer.documentType, customer.documentNumber, customer.phone, customer.email, customer.address, customer.city, customer.postalCode]);
    
    // Inserir down payments se existirem
    if (customer.downPayments && customer.downPayments.length > 0) {
      for (let dp of customer.downPayments) {
        const dpId = generateId();
        await pool.execute(`
          INSERT INTO customer_down_payments (id, customerId, amount, date, description)
          VALUES (?, ?, ?, ?, ?)
        `, [dpId, id, dp.amount, dp.date, dp.description]);
      }
    }
    
    res.json({ id, ...customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const customer = req.body;
    
    await pool.execute(`
      UPDATE customers 
      SET name = ?, documentType = ?, documentNumber = ?, phone = ?, email = ?, address = ?, city = ?, postalCode = ?
      WHERE id = ?
    `, [customer.name, customer.documentType, customer.documentNumber, customer.phone, customer.email, customer.address, customer.city, customer.postalCode, id]);
    
    // Atualizar down payments - remover existentes e inserir novos
    await pool.execute('DELETE FROM customer_down_payments WHERE customerId = ?', [id]);
    
    if (customer.downPayments && customer.downPayments.length > 0) {
      for (let dp of customer.downPayments) {
        const dpId = dp.id || generateId();
        await pool.execute(`
          INSERT INTO customer_down_payments (id, customerId, amount, date, description)
          VALUES (?, ?, ?, ?, ?)
        `, [dpId, id, dp.amount, dp.date, dp.description]);
      }
    }
    
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM customers WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== QUOTES ROUTES =====
app.get('/api/quotes', async (req, res) => {
  try {
    const [quotes] = await pool.execute('SELECT * FROM quotes ORDER BY createdAt DESC');
    
    // Buscar itens para cada quote
    for (let quote of quotes) {
      const [items] = await pool.execute('SELECT * FROM quote_items WHERE quoteId = ?', [quote.id]);
      quote.items = items;
      
      // Buscar company info snapshot (usar current para agora)
      const [companyInfo] = await pool.execute('SELECT * FROM company_info LIMIT 1');
      quote.companyInfoSnapshot = companyInfo[0] || {};
    }
    
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quotes', async (req, res) => {
  try {
    const quote = req.body;
    const id = generateId();
    const quoteNumber = `ORC-${Date.now()}`;
    
    // Buscar company info para snapshot
    const [companyInfo] = await pool.execute('SELECT * FROM company_info LIMIT 1');
    const companySnapshot = companyInfo[0] || {};
    
    await pool.execute(`
      INSERT INTO quotes (id, quoteNumber, customerId, clientName, clientContact, subtotal, discountType, discountValue, discountAmountCalculated, subtotalAfterDiscount, totalCash, totalCard, downPaymentApplied, selectedPaymentMethod, paymentDate, deliveryDeadline, status, notes, salespersonUsername, salespersonFullName)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, quoteNumber, quote.customerId, quote.clientName, quote.clientContact, quote.subtotal, quote.discountType, quote.discountValue, quote.discountAmountCalculated, quote.subtotalAfterDiscount, quote.totalCash, quote.totalCard, quote.downPaymentApplied, quote.selectedPaymentMethod, quote.paymentDate, quote.deliveryDeadline, quote.status, quote.notes, quote.salespersonUsername, quote.salespersonFullName]);
    
    // Inserir itens
    if (quote.items && quote.items.length > 0) {
      for (let item of quote.items) {
        const itemId = generateId();
        await pool.execute(`
          INSERT INTO quote_items (id, quoteId, productId, productName, quantity, unitPrice, totalPrice, pricingModel, width, height, itemCountForAreaCalc)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [itemId, id, item.productId, item.productName, item.quantity, item.unitPrice, item.totalPrice, item.pricingModel, item.width, item.height, item.itemCountForAreaCalc]);
      }
    }
    
    res.json({ id, quoteNumber, companyInfoSnapshot: companySnapshot, ...quote });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [quotes] = await pool.execute('SELECT * FROM quotes WHERE id = ?', [id]);
    
    if (quotes.length === 0) {
      return res.status(404).json({ message: 'Quote não encontrado' });
    }
    
    const quote = quotes[0];
    const [items] = await pool.execute('SELECT * FROM quote_items WHERE quoteId = ?', [id]);
    quote.items = items;
    
    const [companyInfo] = await pool.execute('SELECT * FROM company_info LIMIT 1');
    quote.companyInfoSnapshot = companyInfo[0] || {};
    
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== USERS ROUTES =====
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, username, fullName, role FROM users ORDER BY username');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = req.body;
    const id = generateId();
    
    await pool.execute(`
      INSERT INTO users (id, username, fullName, password, role)
      VALUES (?, ?, ?, ?, ?)
    `, [id, user.username, user.fullName, user.password, user.role]);
    
    res.json({ id, ...user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.body;
    
    if (user.password) {
      await pool.execute(`
        UPDATE users SET fullName = ?, password = ?, role = ? WHERE id = ?
      `, [user.fullName, user.password, user.role, id]);
    } else {
      await pool.execute(`
        UPDATE users SET fullName = ?, role = ? WHERE id = ?
      `, [user.fullName, user.role, id]);
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SUPPLIERS ROUTES =====
app.get('/api/suppliers', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM suppliers ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const supplier = req.body;
    const id = generateId();
    
    await pool.execute(`
      INSERT INTO suppliers (id, name, cnpj, phone, email, address, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, supplier.name, supplier.cnpj, supplier.phone, supplier.email, supplier.address, supplier.notes]);
    
    res.json({ id, ...supplier });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = req.body;
    
    await pool.execute(`
      UPDATE suppliers SET name = ?, cnpj = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?
    `, [supplier.name, supplier.cnpj, supplier.phone, supplier.email, supplier.address, supplier.notes, id]);
    
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM suppliers WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== DEBTS ROUTES =====
app.get('/api/suppliers/debts', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM debts ORDER BY dateAdded DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/suppliers/debts', async (req, res) => {
  try {
    const debt = req.body;
    const id = generateId();
    
    await pool.execute(`
      INSERT INTO debts (id, supplierId, description, totalAmount, dateAdded)
      VALUES (?, ?, ?, ?, ?)
    `, [id, debt.supplierId, debt.description, debt.totalAmount, debt.dateAdded]);
    
    res.json({ id, ...debt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/suppliers/debts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM debts WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SUPPLIER CREDITS ROUTES =====
app.get('/api/suppliers/supplier-credits', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM supplier_credits ORDER BY date DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/suppliers/supplier-credits', async (req, res) => {
  try {
    const credit = req.body;
    const id = generateId();
    
    await pool.execute(`
      INSERT INTO supplier_credits (id, supplierId, amount, date, description)
      VALUES (?, ?, ?, ?, ?)
    `, [id, credit.supplierId, credit.amount, credit.date, credit.description]);
    
    res.json({ id, ...credit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/suppliers/supplier-credits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM supplier_credits WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ACCOUNTS PAYABLE ROUTES =====
app.get('/api/accounts-payable', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM accounts_payable ORDER BY dueDate ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/accounts-payable', async (req, res) => {
  try {
    const entry = req.body;
    const id = generateId();
    
    await pool.execute(`
      INSERT INTO accounts_payable (id, name, amount, dueDate, isPaid, notes, seriesId, totalInstallmentsInSeries, installmentNumberOfSeries)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, entry.name, entry.amount, entry.dueDate, entry.isPaid, entry.notes, entry.seriesId, entry.totalInstallmentsInSeries, entry.installmentNumberOfSeries]);
    
    res.json({ id, ...entry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/accounts-payable/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = req.body;
    
    await pool.execute(`
      UPDATE accounts_payable SET name = ?, amount = ?, dueDate = ?, isPaid = ?, notes = ? WHERE id = ?
    `, [entry.name, entry.amount, entry.dueDate, entry.isPaid, entry.notes, id]);
    
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/accounts-payable/series', async (req, res) => {
  try {
    const { baseEntry, installments, frequency } = req.body;
    const seriesId = generateId();
    const entries = [];
    
    for (let i = 0; i < installments; i++) {
      const id = generateId();
      const installmentAmount = baseEntry.amount / installments;
      
      let dueDate = new Date(baseEntry.dueDate);
      if (frequency === 'monthly') {
        dueDate.setMonth(dueDate.getMonth() + i);
      } else if (frequency === 'weekly') {
        dueDate.setDate(dueDate.getDate() + (i * 7));
      }
      
      const entry = {
        id,
        name: `${baseEntry.name} - Parcela ${i + 1}/${installments}`,
        amount: installmentAmount,
        dueDate: dueDate.toISOString().split('T')[0],
        isPaid: baseEntry.isPaid,
        notes: baseEntry.notes,
        seriesId,
        totalInstallmentsInSeries: installments,
        installmentNumberOfSeries: i + 1
      };
      
      await pool.execute(`
        INSERT INTO accounts_payable (id, name, amount, dueDate, isPaid, notes, seriesId, totalInstallmentsInSeries, installmentNumberOfSeries)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [entry.id, entry.name, entry.amount, entry.dueDate, entry.isPaid, entry.notes, entry.seriesId, entry.totalInstallmentsInSeries, entry.installmentNumberOfSeries]);
      
      entries.push(entry);
    }
    
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/accounts-payable/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM accounts_payable WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/accounts-payable/series/:seriesId', async (req, res) => {
  try {
    const { seriesId } = req.params;
    await pool.execute('DELETE FROM accounts_payable WHERE seriesId = ?', [seriesId]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/accounts-payable/:id/toggle-paid', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('UPDATE accounts_payable SET isPaid = NOT isPaid WHERE id = ?', [id]);
    
    const [rows] = await pool.execute('SELECT * FROM accounts_payable WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  res.json({
    session: req.session.user || 'none',
    timestamp: new Date().toISOString(),
    database: 'mysql-cpanel',
    config: {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port
    },
    headers: {
      origin: req.headers.origin,
      userAgent: req.headers['user-agent']
    }
  });
});

// Recreate schema
app.get('/api/recreate-schema', async (req, res) => {
  try {
    await createAllTables();
    res.json({ message: 'Schema MySQL recriado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
      console.log(`🔗 Health: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/me`);
      console.log(`🔍 Debug: http://localhost:${PORT}/api/debug`);
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