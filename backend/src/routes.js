// backend/src/routes.js
const express = require('express');
const router = express.Router();

// Função para gerar IDs únicos
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

// Middleware para injetar dependências nas rotas
let pool = null;

// Função para configurar as dependências
const setupRoutes = (mysqlPool) => {
  pool = mysqlPool;
  return router;
};

// ============= HEALTH CHECK E DEBUG =============

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'mysql-cpanel'
  });
});

// Test DB
router.get('/test-db', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL conectado para teste');
    const [rows] = await connection.execute('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = ?', [process.env.DB_NAME || 'maxcontrol']);
    connection.release();
    
    res.json({ 
      database: 'connected',
      type: 'mysql-cpanel',
      timestamp: new Date().toISOString(),
      tables: rows[0].table_count,
      config: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        database: process.env.DB_NAME || 'maxcontrol',
        port: parseInt(process.env.DB_PORT || '3306')
      }
    });
  } catch (error) {
    console.error('❌ Erro no teste do banco:', error);
    res.status(500).json({ 
      database: 'error',
      error: error.message
    });
  }
});

// Debug endpoint
router.get('/debug', (req, res) => {
  res.json({
    session: req.session.user || 'none',
    timestamp: new Date().toISOString(),
    database: 'mysql-cpanel',
    config: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      database: process.env.DB_NAME || 'maxcontrol',
      port: parseInt(process.env.DB_PORT || '3306')
    },
    headers: {
      origin: req.headers.origin,
      userAgent: req.headers['user-agent']
    }
  });
});

// ============= AUTH ROUTES =============

router.post('/auth/login', async (req, res) => {
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

router.get('/auth/me', (req, res) => {
  console.log('🔍 Check auth, session:', req.session.user ? 'exists' : 'none');
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: 'Não autenticado' });
  }
});

router.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Erro no logout:', err);
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
    res.json({ message: 'Logout realizado com sucesso' });
  });
});

// ============= COMPANY INFO ROUTES =============

router.get('/company-info', async (req, res) => {
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

router.post('/company-info', async (req, res) => {
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

// ============= PRODUCTS ROUTES =============

router.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products', async (req, res) => {
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

router.put('/products/:id', async (req, res) => {
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

router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM products WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= CATEGORIES ROUTES =============

router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const category = req.body;
    const id = generateId();
    
    await pool.execute('INSERT INTO categories (id, name) VALUES (?, ?)', [id, category.name]);
    res.json({ id, ...category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const category = req.body;
    
    await pool.execute('UPDATE categories SET name = ? WHERE id = ?', [category.name, id]);
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= CUSTOMERS ROUTES =============

router.get('/customers', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM customers ORDER BY name');
    
    // Buscar down payments para cada cliente
    for (let customer of rows) {
      const [downPayments] = await pool.execute(
        'SELECT * FROM customer_down_payments WHERE customerId = ? ORDER BY date DESC',
        [customer.id]
      );
      customer.downPayments = downPayments;
    }
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const customer = req.body;
    const id = generateId();
    
    await pool.execute(`
      INSERT INTO customers (id, name, documentType, documentNumber, phone, email, address, city, postalCode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, customer.name, customer.documentType, customer.documentNumber, customer.phone, customer.email, customer.address, customer.city, customer.postalCode]);
    
    // Salvar down payments se existirem
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

router.put('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const customer = req.body;
    
    await pool.execute(`
      UPDATE customers 
      SET name = ?, documentType = ?, documentNumber = ?, phone = ?, email = ?, address = ?, city = ?, postalCode = ?
      WHERE id = ?
    `, [customer.name, customer.documentType, customer.documentNumber, customer.phone, customer.email, customer.address, customer.city, customer.postalCode, id]);
    
    // Atualizar down payments (remover os antigos e inserir os novos)
    await pool.execute('DELETE FROM customer_down_payments WHERE customerId = ?', [id]);
    
    if (customer.downPayments && customer.downPayments.length > 0) {
      for (let dp of customer.downPayments) {
        const dpId = generateId();
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

router.delete('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // O CASCADE na FK já vai deletar os down payments
    await pool.execute('DELETE FROM customers WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= QUOTES ROUTES =============

router.get('/quotes', async (req, res) => {
  try {
    const [quotes] = await pool.execute('SELECT * FROM quotes ORDER BY createdAt DESC');
    
    // Para cada quote, buscar os itens
    for (let quote of quotes) {
      const [items] = await pool.execute('SELECT * FROM quote_items WHERE quoteId = ?', [quote.id]);
      quote.items = items;
      
      // Buscar informações da empresa (snapshot)
      const [companyInfo] = await pool.execute('SELECT * FROM company_info LIMIT 1');
      quote.companyInfoSnapshot = companyInfo[0] || { name: 'MaxControl', address: '', phone: '', email: '' };
    }
    
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [quotes] = await pool.execute('SELECT * FROM quotes WHERE id = ?', [id]);
    
    if (quotes.length === 0) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }
    
    const quote = quotes[0];
    
    // Buscar itens do orçamento
    const [items] = await pool.execute('SELECT * FROM quote_items WHERE quoteId = ?', [id]);
    quote.items = items;
    
    // Buscar informações da empresa (snapshot)
    const [companyInfo] = await pool.execute('SELECT * FROM company_info LIMIT 1');
    quote.companyInfoSnapshot = companyInfo[0] || { name: 'MaxControl', address: '', phone: '', email: '' };
    
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/quotes', async (req, res) => {
  try {
    const quote = req.body;
    const id = generateId();
    const quoteNumber = `ORC-${Date.now()}`;
    
    // Buscar informações da empresa para snapshot
    const [companyInfo] = await pool.execute('SELECT * FROM company_info LIMIT 1');
    const companySnapshot = companyInfo[0] || { name: 'MaxControl', address: '', phone: '', email: '' };
    
    // Inserir o orçamento
    await pool.execute(`
      INSERT INTO quotes (
        id, quoteNumber, customerId, clientName, clientContact, subtotal, 
        discountType, discountValue, discountAmountCalculated, subtotalAfterDiscount,
        totalCash, totalCard, downPaymentApplied, selectedPaymentMethod, 
        paymentDate, deliveryDeadline, status, notes, salespersonUsername, 
        salespersonFullName, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, quoteNumber, quote.customerId, quote.clientName, quote.clientContact, quote.subtotal,
      quote.discountType, quote.discountValue, quote.discountAmountCalculated, quote.subtotalAfterDiscount,
      quote.totalCash, quote.totalCard, quote.downPaymentApplied, quote.selectedPaymentMethod,
      quote.paymentDate, quote.deliveryDeadline, quote.status, quote.notes, 
      quote.salespersonUsername, quote.salespersonFullName, new Date().toISOString()
    ]);
    
    // Inserir os itens do orçamento
    for (let item of quote.items) {
      const itemId = generateId();
      await pool.execute(`
        INSERT INTO quote_items (
          id, quoteId, productId, productName, quantity, unitPrice, totalPrice,
          pricingModel, width, height, itemCountForAreaCalc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        itemId, id, item.productId, item.productName, item.quantity, item.unitPrice, 
        item.totalPrice, item.pricingModel, item.width, item.height, item.itemCountForAreaCalc
      ]);
    }
    
    const responseQuote = {
      id,
      quoteNumber,
      ...quote,
      companyInfoSnapshot: companySnapshot,
      createdAt: new Date().toISOString()
    };
    
    res.json(responseQuote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const quote = req.body;
    
    // Atualizar o orçamento
    await pool.execute(`
      UPDATE quotes SET 
        customerId = ?, clientName = ?, clientContact = ?, subtotal = ?,
        discountType = ?, discountValue = ?, discountAmountCalculated = ?, subtotalAfterDiscount = ?,
        totalCash = ?, totalCard = ?, downPaymentApplied = ?, selectedPaymentMethod = ?,
        paymentDate = ?, deliveryDeadline = ?, status = ?, notes = ?,
        salespersonUsername = ?, salespersonFullName = ?
      WHERE id = ?
    `, [
      quote.customerId, quote.clientName, quote.clientContact, quote.subtotal,
      quote.discountType, quote.discountValue, quote.discountAmountCalculated, quote.subtotalAfterDiscount,
      quote.totalCash, quote.totalCard, quote.downPaymentApplied, quote.selectedPaymentMethod,
      quote.paymentDate, quote.deliveryDeadline, quote.status, quote.notes,
      quote.salespersonUsername, quote.salespersonFullName, id
    ]);
    
    // Remover itens antigos e inserir novos
    await pool.execute('DELETE FROM quote_items WHERE quoteId = ?', [id]);
    
    for (let item of quote.items) {
      const itemId = generateId();
      await pool.execute(`
        INSERT INTO quote_items (
          id, quoteId, productId, productName, quantity, unitPrice, totalPrice,
          pricingModel, width, height, itemCountForAreaCalc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        itemId, id, item.productId, item.productName, item.quantity, item.unitPrice,
        item.totalPrice, item.pricingModel, item.width, item.height, item.itemCountForAreaCalc
      ]);
    }
    
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // O CASCADE na FK já vai deletar os itens
    await pool.execute('DELETE FROM quotes WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= USERS ROUTES =============

router.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, username, fullName, role FROM users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users', async (req, res) => {
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

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.body;
    
    // Se não forneceu senha, não atualizar a senha
    if (user.password) {
      await pool.execute(`
        UPDATE users SET username = ?, fullName = ?, password = ?, role = ? WHERE id = ?
      `, [user.username, user.fullName, user.password, user.role, id]);
    } else {
      await pool.execute(`
        UPDATE users SET username = ?, fullName = ?, role = ? WHERE id = ?
      `, [user.username, user.fullName, user.role, id]);
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ACCOUNTS PAYABLE ROUTES =============

router.get('/accounts-payable', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM accounts_payable ORDER BY dueDate');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/accounts-payable', async (req, res) => {
  try {
    const entry = req.body;
    const id = generateId();
    
    await pool.execute(`
      INSERT INTO accounts_payable (id, name, amount, dueDate, isPaid, notes, seriesId, totalInstallmentsInSeries, installmentNumberOfSeries)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, entry.name, entry.amount, entry.dueDate, entry.isPaid || false, entry.notes, entry.seriesId, entry.totalInstallmentsInSeries, entry.installmentNumberOfSeries]);
    
    res.json({ id, ...entry, createdAt: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/accounts-payable/:id', async (req, res) => {
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

router.delete('/accounts-payable/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM accounts_payable WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= SUPPLIERS ROUTES =============

router.get('/suppliers', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM suppliers ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/suppliers', async (req, res) => {
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

router.put('/suppliers/:id', async (req, res) => {
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

router.delete('/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM suppliers WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= SUPPLIER DEBTS ROUTES =============

router.get('/suppliers/debts', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM supplier_debts ORDER BY dateAdded DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/suppliers/debts', async (req, res) => {
  try {
    const debt = req.body;
    const id = generateId();
    
    await pool.execute(`
      INSERT INTO supplier_debts (id, supplierId, description, totalAmount, dateAdded)
      VALUES (?, ?, ?, ?, ?)
    `, [id, debt.supplierId, debt.description, debt.totalAmount, debt.dateAdded]);
    
    res.json({ id, ...debt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/suppliers/debts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM supplier_debts WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= SUPPLIER CREDITS ROUTES =============

router.get('/suppliers/supplier-credits', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM supplier_credits ORDER BY date DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/suppliers/supplier-credits', async (req, res) => {
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