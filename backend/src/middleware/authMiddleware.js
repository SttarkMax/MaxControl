import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import db from '../config/db.js';

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from the token
      const [rows] = await db.execute('SELECT id, username, fullName, role FROM users WHERE id = ?', [decoded.id]);
      
      if (rows.length === 0) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }
      
      req.user = rows[0];

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as an admin');
    }
};

export { protect, admin };
