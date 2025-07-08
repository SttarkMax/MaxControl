import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { notFound, errorHandler } from './src/middleware/errorMiddleware.js';

// Route imports
import authRoutes from './src/routes/authRoutes.js';
import productRoutes from './src/routes/productRoutes.js';
import categoryRoutes from './src/routes/categoryRoutes.js';
import customerRoutes from './src/routes/customerRoutes.js';
import quoteRoutes from './src/routes/quoteRoutes.js';
import settingsRoutes from './src/routes/settingsRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import supplierRoutes from './src/routes/supplierRoutes.js';
import accountsPayableRoutes from './src/routes/accountsPayableRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import aiRoutes from './src/routes/aiRoutes.js';


dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' })); // for base64 logos
app.use(express.urlencoded({ extended: true }));

// Security Middleware
// In a real production environment, you would restrict the origin.
// For Render/cPanel setup, you'd put your cPanel URL here.
app.use(cors()); 
app.use(helmet());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/accounts-payable', accountsPayableRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);


// Health Check
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));
