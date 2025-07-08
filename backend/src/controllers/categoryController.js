import asyncHandler from 'express-async-handler';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';

// @desc    Fetch all categories
// @route   GET /api/categories
// @access  Private
const getCategories = asyncHandler(async (req, res) => {
  const [categories] = await db.execute('SELECT * FROM categories ORDER BY name ASC');
  res.json(categories);
});

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400);
    throw new Error('Category name is required');
  }

  const id = uuidv4();
  await db.execute('INSERT INTO categories (id, name) VALUES (?, ?)', [id, name]);
  
  const [newCategory] = await db.execute('SELECT * FROM categories WHERE id = ?', [id]);
  res.status(201).json(newCategory[0]);
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400);
    throw new Error('Category name is required');
  }
  const [result] = await db.execute('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id]);

  if (result.affectedRows === 0) {
    res.status(404);
    throw new Error('Category not found');
  }

  const [updatedCategory] = await db.execute('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  res.json(updatedCategory[0]);
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = asyncHandler(async (req, res) => {
  // Products with this categoryId will have it set to NULL due to FOREIGN KEY constraint
  const [result] = await db.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);

  if (result.affectedRows > 0) {
    res.json({ message: 'Category removed' });
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
});

export {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
