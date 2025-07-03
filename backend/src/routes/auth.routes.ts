
import { Router } from 'express';
import pool from '../db';
import { comparePassword, hashPassword, generateId } from '../utils';
import { User, LoggedInUser, UserAccessLevel } from '../types';
import { RowDataPacket } from 'mysql2';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const conn = await pool.getConnection();

    // Check if any user exists. If not, create the default admin user.
    const [userRows] = await conn.query<RowDataPacket[]>('SELECT id FROM users LIMIT 1');
    if (userRows.length === 0 && username === 'admin' && password === 'admin') {
      const adminId = generateId();
      const adminHashedPassword = await hashPassword('admin');
      const adminUser: User = {
        id: adminId,
        username: 'admin',
        fullName: 'Administrador',
        password: adminHashedPassword,
        role: UserAccessLevel.ADMIN
      };
      await conn.query('INSERT INTO users SET ?', adminUser);
      console.log('Default admin user created.');
    }

    const [rows] = await conn.query<RowDataPacket[]>('SELECT * FROM users WHERE username = ?', [username]);
    conn.release();

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const user: User = rows[0] as User;
    const passwordMatch = await comparePassword(password, user.password!);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }
    
    // Don't store password in session
    const loggedInUser: LoggedInUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role
    };

    req.session.user = loggedInUser;
    res.json(loggedInUser);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.status(204).send();
  });
});

// GET /api/auth/me (Check session)
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json(req.session.user);
  }
  return res.status(401).json({ message: 'Not authenticated' });
});

export default router;