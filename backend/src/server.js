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

// ✅ CONFIGURAÇÃO CORS CORRIGIDA
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      // Desenvolvimento
      'http://localhost:5173',
      'http://localhost:3000', 
      'https://localhost:5173',
      'https://localhost:3000',
      
      // ✅ PRODUÇÃO - Corrigido (remover barra final)
      'https://maxcontrol.f13design.com.br',
      'http://maxcontrol.f13design.com.br',
      
      // Versões com www (se aplicável)
      'https://www.maxcontrol.f13design.com.br',
      'http://www.maxcontrol.f13design.com.br'
    ];
    
    console.log('🔍 CORS Check - Origin:', origin);
    
    // Permitir requests sem origin (mobile, postman, etc.)
    if (!origin) {
      console.log('✅ CORS: Request sem origin permitido');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Origin permitido:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS: Origin bloqueado:', origin);
      console.log('📋 Origins permitidos:', allowedOrigins);
      // EM PRODUÇÃO: Bloquear origins não autorizados
      // callback(new Error('Not allowed by CORS'));
      
      // TEMPORÁRIO para debug: permitir todos
      console.log('⚠️ CORS: Permitindo temporariamente para debug');
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Cache-Control',
    'Pragma'
  ],
  optionsSuccessStatus: 200
};

// Aplicar CORS antes de outros middlewares
app.use(cors(corsOptions));

// Middleware para logs detalhados
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log(`🌐 ${req.method} ${req.path} from ${origin || 'no-origin'}`);
  console.log('📨 Headers:', {
    origin: req.headers.origin,
    host: req.headers.host,
    userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
  });
  
  // Headers CORS manuais como fallback
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,Cache-Control,Pragma');
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Respondendo OPTIONS preflight');
    return res.sendStatus(200);
  }
  next();
});

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
    secure: process.env.NODE_ENV === 'production', // HTTPS em produção
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // 'none' para CORS cross-origin
  }
}));

// Schema MySQL automático
const createAllTables = async () => {
  try {
    console.log('🔧 Criando schema MySQL...');
    
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
    console.error('❌ Erro ao inserir dados MySQL:', error);
  }
};

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
    
    // Verificar se já existe
    const [existing] = await pool.execute('SELECT id FROM company_info LIMIT 1');
    
    if (existing.length > 0) {
      // Update
      await pool.execute(`
        UPDATE company_info 
        SET name = ?, address = ?, phone = ?, email = ?, cnpj = ?, instagram = ?, website = ?
        WHERE id = ?
      `, [name, address, phone, email, cnpj, instagram, website, existing[0].id]);
    } else {
      // Insert
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

// ===== CATEGORIES ROUTES =====
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== CUSTOMERS ROUTES =====
app.get('/api/customers', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM customers ORDER BY name');
    res.json(rows);
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

// ===== QUOTES ROUTES =====
app.get('/api/quotes', async (req, res) => {
  try {
    console.log('📋 Buscando quotes...');
    const [rows] = await pool.execute(`
      SELECT q.*, 
             c.name as customerName,
             GROUP_CONCAT(
               JSON_OBJECT(
                 'id', qi.id,
                 'productId', qi.productId,
                 'productName', qi.productName,
                 'quantity', qi.quantity,
                 'unitPrice', qi.unitPrice,
                 'totalPrice', qi.totalPrice,
                 'pricingModel', qi.pricingModel,
                 'width', qi.width,
                 'height', qi.height,
                 'itemCountForAreaCalc', qi.itemCountForAreaCalc
               )
             ) as items_json
      FROM quotes q
      LEFT JOIN customers c ON q.customerId = c.id
      LEFT JOIN quote_items qi ON q.id = qi.quoteId
      GROUP BY q.id
      ORDER BY q.createdAt DESC
    `).catch(() => [[]]);

    // Se não existir tabela, retornar array vazio
    if (!rows || rows.length === 0) {
      console.log('⚠️ Nenhum quote encontrado ou tabela não existe');
      return res.json([]);
    }

    // Processar os resultados
    const quotes = rows.map(row => {
      let items = [];
      if (row.items_json) {
        try {
          const itemsStr = row.items_json.replace(/\]\[/g, ',');
          items = JSON.parse(`[${itemsStr}]`);
        } catch (e) {
          console.error('Erro ao parsear items:', e);
          items = [];
        }
      }

      // Snapshot da empresa (mock para compatibilidade)
      const companyInfoSnapshot = {
        name: 'MaxControl Demo',
        address: 'Rua Demo, 123',
        phone: '(11) 99999-9999',
        email: 'demo@maxcontrol.com'
      };

      return {
        id: row.id,
        quoteNumber: row.quoteNumber,
        customerId: row.customerId,
        clientName: row.clientName,
        clientContact: row.clientContact,
        items: items,
        subtotal: parseFloat(row.subtotal) || 0,
        discountType: row.discountType || 'none',
        discountValue: parseFloat(row.discountValue) || 0,
        discountAmountCalculated: parseFloat(row.discountAmountCalculated) || 0,
        subtotalAfterDiscount: parseFloat(row.subtotalAfterDiscount) || 0,
        totalCash: parseFloat(row.totalCash) || 0,
        totalCard: parseFloat(row.totalCard) || 0,
        downPaymentApplied: parseFloat(row.downPaymentApplied) || 0,
        selectedPaymentMethod: row.selectedPaymentMethod,
        paymentDate: row.paymentDate,
        deliveryDeadline: row.deliveryDeadline,
        status: row.status || 'draft',
        notes: row.notes,
        salespersonUsername: row.salespersonUsername,
        salespersonFullName: row.salespersonFullName,
        createdAt: row.createdAt,
        companyInfoSnapshot: companyInfoSnapshot
      };
    });

    console.log(`✅ Retornando ${quotes.length} quotes`);
    res.json(quotes);
  } catch (error) {
    console.error('❌ Erro ao buscar quotes:', error);
    // Em caso de erro, retornar array vazio para não quebrar o frontend
    res.json([]);
  }
});

app.get('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📋 Buscando quote por ID:', id);
    
    const [rows] = await pool.execute(`
      SELECT q.*, 
             c.name as customerName,
             GROUP_CONCAT(
               JSON_OBJECT(
                 'id', qi.id,
                 'productId', qi.productId,
                 'productName', qi.productName,
                 'quantity', qi.quantity,
                 'unitPrice', qi.unitPrice,
                 'totalPrice', qi.totalPrice,
                 'pricingModel', qi.pricingModel,
                 'width', qi.width,
                 'height', qi.height,
                 'itemCountForAreaCalc', qi.itemCountForAreaCalc
               )
             ) as items_json
      FROM quotes q
      LEFT JOIN customers c ON q.customerId = c.id
      LEFT JOIN quote_items qi ON q.id = qi.quoteId
      WHERE q.id = ?
      GROUP BY q.id
    `, [id]).catch(() => [[]]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Quote não encontrado' });
    }

    const row = rows[0];
    let items = [];
    if (row.items_json) {
      try {
        const itemsStr = row.items_json.replace(/\]\[/g, ',');
        items = JSON.parse(`[${itemsStr}]`);
      } catch (e) {
        console.error('Erro ao parsear items:', e);
        items = [];
      }
    }

    const companyInfoSnapshot = {
      name: 'MaxControl Demo',
      address: 'Rua Demo, 123',
      phone: '(11) 99999-9999',
      email: 'demo@maxcontrol.com'
    };

    const quote = {
      id: row.id,
      quoteNumber: row.quoteNumber,
      customerId: row.customerId,
      clientName: row.clientName,
      clientContact: row.clientContact,
      items: items,
      subtotal: parseFloat(row.subtotal) || 0,
      discountType: row.discountType || 'none',
      discountValue: parseFloat(row.discountValue) || 0,
      discountAmountCalculated: parseFloat(row.discountAmountCalculated) || 0,
      subtotalAfterDiscount: parseFloat(row.subtotalAfterDiscount) || 0,
      totalCash: parseFloat(row.totalCash) || 0,
      totalCard: parseFloat(row.totalCard) || 0,
      downPaymentApplied: parseFloat(row.downPaymentApplied) || 0,
      selectedPaymentMethod: row.selectedPaymentMethod,
      paymentDate: row.paymentDate,
      deliveryDeadline: row.deliveryDeadline,
      status: row.status || 'draft',
      notes: row.notes,
      salespersonUsername: row.salespersonUsername,
      salespersonFullName: row.salespersonFullName,
      createdAt: row.createdAt,
      companyInfoSnapshot: companyInfoSnapshot
    };

    res.json(quote);
  } catch (error) {
    console.error('❌ Erro ao buscar quote:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quotes', async (req, res) => {
  try {
    const quote = req.body;
    console.log('💾 Criando novo quote...');

    // Gerar ID e número do quote
    const quoteId = Date.now().toString();
    const quoteNumber = `ORC-${Date.now()}`;

    // Inserir quote principal
    await pool.execute(`
      INSERT INTO quotes (
        id, quoteNumber, customerId, clientName, clientContact,
        subtotal, discountType, discountValue, discountAmountCalculated,
        subtotalAfterDiscount, totalCash, totalCard, downPaymentApplied,
        selectedPaymentMethod, paymentDate, deliveryDeadline, status,
        notes, salespersonUsername, salespersonFullName
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      quoteId,
      quoteNumber,
      quote.customerId || null,
      quote.clientName,
      quote.clientContact || null,
      quote.subtotal || 0,
      quote.discountType || 'none',
      quote.discountValue || 0,
      quote.discountAmountCalculated || 0,
      quote.subtotalAfterDiscount || 0,
      quote.totalCash || 0,
      quote.totalCard || 0,
      quote.downPaymentApplied || 0,
      quote.selectedPaymentMethod || null,
      quote.paymentDate || null,
      quote.deliveryDeadline || null,
      quote.status || 'draft',
      quote.notes || null,
      quote.salespersonUsername || 'admin',
      quote.salespersonFullName || 'Administrador'
    ]);

    // Inserir items se existirem
    if (quote.items && quote.items.length > 0) {
      for (const item of quote.items) {
        const itemId = `${quoteId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await pool.execute(`
          INSERT INTO quote_items (
            id, quoteId, productId, productName, quantity, unitPrice,
            totalPrice, pricingModel, width, height, itemCountForAreaCalc
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId,
          quoteId,
          item.productId,
          item.productName,
          item.quantity || 0,
          item.unitPrice || 0,
          item.totalPrice || 0,
          item.pricingModel || 'unidade',
          item.width || null,
          item.height || null,
          item.itemCountForAreaCalc || null
        ]);
      }
    }

    console.log('✅ Quote criado:', quoteNumber);
    res.json({ id: quoteId, quoteNumber, ...quote });
  } catch (error) {
    console.error('❌ Erro ao criar quote:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const quote = req.body;
    console.log('✏️ Atualizando quote:', id);

    // Atualizar quote principal
    await pool.execute(`
      UPDATE quotes SET
        clientName = ?, clientContact = ?, subtotal = ?, discountType = ?,
        discountValue = ?, discountAmountCalculated = ?, subtotalAfterDiscount = ?,
        totalCash = ?, totalCard = ?, downPaymentApplied = ?, selectedPaymentMethod = ?,
        paymentDate = ?, deliveryDeadline = ?, status = ?, notes = ?
      WHERE id = ?
    `, [
      quote.clientName,
      quote.clientContact || null,
      quote.subtotal || 0,
      quote.discountType || 'none',
      quote.discountValue || 0,
      quote.discountAmountCalculated || 0,
      quote.subtotalAfterDiscount || 0,
      quote.totalCash || 0,
      quote.totalCard || 0,
      quote.downPaymentApplied || 0,
      quote.selectedPaymentMethod || null,
      quote.paymentDate || null,
      quote.deliveryDeadline || null,
      quote.status || 'draft',
      quote.notes || null,
      id
    ]);

    // Remover items antigos e inserir novos
    await pool.execute('DELETE FROM quote_items WHERE quoteId = ?', [id]);
    
    if (quote.items && quote.items.length > 0) {
      for (const item of quote.items) {
        const itemId = `${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await pool.execute(`
          INSERT INTO quote_items (
            id, quoteId, productId, productName, quantity, unitPrice,
            totalPrice, pricingModel, width, height, itemCountForAreaCalc
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          itemId,
          id,
          item.productId,
          item.productName,
          item.quantity || 0,
          item.unitPrice || 0,
          item.totalPrice || 0,
          item.pricingModel || 'unidade',
          item.width || null,
          item.height || null,
          item.itemCountForAreaCalc || null
        ]);
      }
    }

    console.log('✅ Quote atualizado:', id);
    res.json(quote);
  } catch (error) {
    console.error('❌ Erro ao atualizar quote:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deletando quote:', id);

    // Deletar items primeiro (por causa da foreign key)
    await pool.execute('DELETE FROM quote_items WHERE quoteId = ?', [id]);
    
    // Deletar quote
    await pool.execute('DELETE FROM quotes WHERE id = ?', [id]);

    console.log('✅ Quote deletado:', id);
    res.status(204).send();
  } catch (error) {
    console.error('❌ Erro ao deletar quote:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== MOCK ROUTES para desenvolvimento =====
app.get('/api/accounts-payable', (req, res) => {
  res.json([]);
});

app.get('/api/suppliers', (req, res) => {
  res.json([]);
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

// ============= MIDDLEWARE =============

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
      console.log(`🔗 Health: https://maxcontrol.onrender.com/health`);
      console.log(`🔐 Auth: https://maxcontrol.onrender.com/api/auth/me`);
      console.log(`🔍 Debug: https://maxcontrol.onrender.com/api/debug`);
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