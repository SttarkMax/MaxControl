import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { testConnection } from './database.js';

const app = express();
const PORT = process.env['PORT'] || 3001;

// Configuração de CORS
const corsOptions = {
  origin: process.env['NODE_ENV'] === 'production' 
    ? ['https://maxcontrol.f13design.com.br', 'https://maxcontrol.f13design.com.br'] // ⚠️ SUBSTITUIR pelo seu domínio
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware para parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy para Render
app.set('trust proxy', 1);

// Configuração de sessão
app.use(session({
  secret: process.env['SESSION_SECRET'] || 'your-super-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env['NODE_ENV'] === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
    sameSite: process.env['NODE_ENV'] === 'production' ? 'none' : 'lax'
  }
}));

// Middleware para logs
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] || 'development'
  });
});

// Endpoint de teste de banco
app.get('/api/test-db', async (req, res) => {
  try {
    const connected = await testConnection();
    res.json({ 
      database: connected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Preflight para todas as rotas
app.options('*', cors(corsOptions));

// Aqui você adicionará suas rotas quando estiverem prontas
/*
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/accounts-payable', accountsPayableRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/company-info', companyInfoRoutes);
*/

// Middleware de tratamento de erros
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(500).json({ 
    message: 'Erro interno do servidor',
    ...(process.env['NODE_ENV'] === 'development' && { details: err.message })
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

// Inicializar banco e servidor
const startServer = async () => {
  try {
    // Testar conexão com banco
    await testConnection();
    console.log('✅ Banco de dados conectado');
    
    // Iniciar servidor
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌍 Ambiente: ${process.env['NODE_ENV'] || 'development'}`);
      console.log(`🔗 Health: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM recebido, fechando servidor...');
      server.close(() => {
        console.log('Servidor fechado');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT recebido, fechando servidor...');
      server.close(() => {
        console.log('Servidor fechado');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Iniciar aplicação
startServer();

export default app;