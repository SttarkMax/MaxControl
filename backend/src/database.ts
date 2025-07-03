import mysql from 'mysql2/promise';

// Configuração do banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'maxcontrol',
  port: parseInt(process.env.DB_PORT || '3306'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4'
};

// Pool de conexões
const pool = mysql.createPool(dbConfig);

// Função para testar conexão
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexão com banco de dados estabelecida');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com banco de dados:', error);
    return false;
  }
};

// Função para executar queries
export const executeQuery = async (query: string, params?: any[]) => {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Erro ao executar query:', error);
    throw error;
  }
};

// Função para executar transações
export const executeTransaction = async (queries: Array<{query: string, params?: any[]}>) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Inicialização do banco
export const initializeDatabase = async () => {
  try {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Não foi possível conectar ao banco de dados');
    }

    // Verificar se as tabelas existem
    const [tables] = await pool.execute('SHOW TABLES');
    console.log(`📊 Tabelas encontradas: ${(tables as any[]).length}`);

    // Aqui você pode adicionar lógica para criar tabelas se necessário
    // ou executar migrações
    
    return true;
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    throw error;
  }
};

export default pool;