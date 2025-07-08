import asyncHandler from 'express-async-handler';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';

// @desc    Fetch all products
// @route   GET /api/products
// @access  Private
const getProducts = asyncHandler(async (req, res) => {
  const [products] = await db.execute('SELECT * FROM products ORDER BY name ASC');
  res.json(products);
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Private
const getProductById = asyncHandler(async (req, res) => {
  const [products] = await db.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);

  if (products.length > 0) {
    res.json(products[0]);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, pricingModel, basePrice, unit, customCashPrice, customCardPrice, supplierCost, categoryId } = req.body;
  const id = uuidv4();

  const sql = `
    INSERT INTO products (id, name, description, pricingModel, basePrice, unit, customCashPrice, customCardPrice, supplierCost, categoryId) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await db.execute(sql, [id, name, description, pricingModel, basePrice, unit, customCashPrice || null, customCardPrice || null, supplierCost || null, categoryId || null]);

  const [newProduct] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);
  res.status(201).json(newProduct[0]);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const { name, description, pricingModel, basePrice, unit, customCashPrice, customCardPrice, supplierCost, categoryId } = req.body;
  
  const sql = `
    UPDATE products 
    SET name = ?, description = ?, pricingModel = ?, basePrice = ?, unit = ?, customCashPrice = ?, customCardPrice = ?, supplierCost = ?, categoryId = ?
    WHERE id = ?
  `;

  const [result] = await db.execute(sql, [name, description, pricingModel, basePrice, unit, customCashPrice || null, customCardPrice || null, supplierCost || null, categoryId || null, req.params.id]);

  if (result.affectedRows === 0) {
    res.status(404);
    throw new Error('Product not found');
  }

  const [updatedProduct] = await db.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
  res.json(updatedProduct[0]);
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const [result] = await db.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
  
  if (result.affectedRows > 0) {
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
