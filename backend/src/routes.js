// backend/src/routes.js
const express = require('express');
const router = express.Router();
const pool = require('./db');
const { generateId } = require('./utils');

// --------------------- CLIENTES ---------------------
router.get('/api/customers', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM customers');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/customers', async (req, res) => {
  try {
    const customer = req.body;
    customer.id = generateId();
    await pool.execute('INSERT INTO customers (id, name, contact, email) VALUES (?, ?, ?, ?)', [
      customer.id,
      customer.name,
      customer.contact,
      customer.email,
    ]);
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const customer = req.body;
    await pool.execute('UPDATE customers SET name = ?, contact = ?, email = ? WHERE id = ?', [
      customer.name,
      customer.contact,
      customer.email,
      id,
    ]);
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api/customers/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------- PRODUTOS ---------------------
router.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/products', async (req, res) => {
  try {
    const product = req.body;
    product.id = generateId();
    await pool.execute('INSERT INTO products (id, name, price, categoryId) VALUES (?, ?, ?, ?)', [
      product.id,
      product.name,
      product.price,
      product.categoryId,
    ]);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = req.body;
    await pool.execute('UPDATE products SET name = ?, price = ?, categoryId = ? WHERE id = ?', [
      product.name,
      product.price,
      product.categoryId,
      id,
    ]);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------- CATEGORIAS ---------------------
router.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM categories');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/categories', async (req, res) => {
  try {
    const category = req.body;
    category.id = generateId();
    await pool.execute('INSERT INTO categories (id, name) VALUES (?, ?)', [
      category.id,
      category.name,
    ]);
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const category = req.body;
    await pool.execute('UPDATE categories SET name = ? WHERE id = ?', [
      category.name,
      id,
    ]);
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api/categories/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------- FORNECEDORES ---------------------
router.get('/api/suppliers', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM suppliers');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/suppliers', async (req, res) => {
  try {
    const supplier = req.body;
    supplier.id = generateId();
    await pool.execute('INSERT INTO suppliers (id, name, email, phone) VALUES (?, ?, ?, ?)', [
      supplier.id,
      supplier.name,
      supplier.email,
      supplier.phone,
    ]);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = req.body;
    await pool.execute('UPDATE suppliers SET name = ?, email = ?, phone = ? WHERE id = ?', [
      supplier.name,
      supplier.email,
      supplier.phone,
      id,
    ]);
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api/suppliers/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------- CONTAS A PAGAR ---------------------
router.get('/api/accounts-payable', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM accounts_payable');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/accounts-payable', async (req, res) => {
  try {
    const item = req.body;
    item.id = generateId();
    await pool.execute('INSERT INTO accounts_payable (id, name, amount, dueDate, isPaid) VALUES (?, ?, ?, ?, ?)', [
      item.id,
      item.name,
      item.amount,
      item.dueDate,
      item.isPaid || false,
    ]);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/accounts-payable/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = req.body;
    await pool.execute('UPDATE accounts_payable SET name = ?, amount = ?, dueDate = ?, isPaid = ? WHERE id = ?', [
      item.name,
      item.amount,
      item.dueDate,
      item.isPaid,
      id,
    ]);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api/accounts-payable/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM accounts_payable WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------- USUÁRIOS ---------------------
router.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, username, fullName, role FROM users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/users', async (req, res) => {
  try {
    const user = req.body;
    user.id = generateId();
    await pool.execute('INSERT INTO users (id, username, fullName, password, role) VALUES (?, ?, ?, ?, ?)', [
      user.id,
      user.username,
      user.fullName,
      user.password,
      user.role,
    ]);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.body;
    await pool.execute('UPDATE users SET username = ?, fullName = ?, password = ?, role = ? WHERE id = ?', [
      user.username,
      user.fullName,
      user.password,
      user.role,
      id,
    ]);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------- ORÇAMENTOS ---------------------
router.get('/api/quotes', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM quotes');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/quotes', async (req, res) => {
  try {
    const quote = req.body;
    quote.id = generateId();
    await pool.execute('INSERT INTO quotes (id, customerId, items, total, createdAt) VALUES (?, ?, ?, ?, ?)', [
      quote.id,
      quote.customerId,
      JSON.stringify(quote.items),
      quote.total,
      quote.createdAt,
    ]);
    res.status(201).json(quote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api/quotes/:id', async (req, res) => {
  try {
    await pool.execute('DELETE FROM quotes WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------- VENDAS POR USUÁRIO ---------------------
router.get('/api/sales/user-performance', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT u.username, COUNT(s.id) AS salesCount, SUM(s.total) AS totalSales
      FROM sales s
      JOIN users u ON u.id = s.userId
      GROUP BY u.username
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------- CONFIGURAÇÕES DA EMPRESA ---------------------
router.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM settings LIMIT 1');
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    await pool.execute('UPDATE settings SET name = ?, email = ?, phone = ?, address = ?', [
      settings.name,
      settings.email,
      settings.phone,
      settings.address,
    ]);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
