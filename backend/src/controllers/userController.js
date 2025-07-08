import asyncHandler from 'express-async-handler';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../config/db.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
    const [users] = await db.execute('SELECT id, username, fullName, role, createdAt FROM users ORDER BY fullName ASC');
    res.json(users);
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
    const [users] = await db.execute('SELECT id, username, fullName, role FROM users WHERE id = ?', [req.params.id]);
    if (users.length > 0) {
        res.json(users[0]);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Create a new user
// @route   POST /api/users
// @access  Private/Admin
const createUser = asyncHandler(async (req, res) => {
    const { username, fullName, password, role } = req.body;

    const [userExists] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (userExists.length > 0) {
        res.status(400);
        throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const id = uuidv4();

    await db.execute(
        'INSERT INTO users (id, username, fullName, password, role) VALUES (?, ?, ?, ?, ?)',
        [id, username, fullName, hashedPassword, role]
    );

    const [newUser] = await db.execute('SELECT id, username, fullName, role FROM users WHERE id = ?', [id]);
    res.status(201).json(newUser[0]);
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
    const { fullName, username, password, role } = req.body;
    const userId = req.params.id;
    
    const [user] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (user.length === 0) {
        res.status(404);
        throw new Error('User not found');
    }

    // Prevent demoting the last admin
    if(user[0].role === 'admin' && role !== 'admin') {
        const [admins] = await db.execute('SELECT COUNT(*) as adminCount FROM users WHERE role = "admin"');
        if(admins[0].adminCount <= 1) {
            res.status(400);
            throw new Error('Cannot demote the last admin');
        }
    }

    let hashedPassword;
    if (password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
    }
    
    const sql = `
        UPDATE users
        SET fullName = ?, username = ?, role = ?
        ${password ? ', password = ?' : ''}
        WHERE id = ?
    `;
    const params = password ? [fullName, username, role, hashedPassword, userId] : [fullName, username, role, userId];
    
    await db.execute(sql, params);

    const [updatedUser] = await db.execute('SELECT id, username, fullName, role FROM users WHERE id = ?', [userId]);
    res.json(updatedUser[0]);
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    if (req.user.id === userId) {
        res.status(400);
        throw new Error('You cannot delete your own account');
    }

    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [userId]);
    if(result.affectedRows > 0) {
        res.json({ message: 'User removed' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

export {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
};
