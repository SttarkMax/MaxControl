import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage'; 
import CreateQuotePage from './pages/CreateQuotePage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import OrdersPage from './pages/OrdersPage';
import CashFlowPage from './pages/CashFlowPage';
import CustomersPage from './pages/CustomersPage'; 
import UsersPage from './pages/UsersPage';
import AllQuotesPage from './pages/AllQuotesPage'; 
import UserSalesPerformancePage from './pages/UserSalesPerformancePage';
import SuppliersPage from './pages/SuppliersPage';
import AccountsPayablePage from './pages/AccountsPayablePage';
import ViewQuoteDetailsModal from './components/ViewQuoteDetailsModal'; 
import { UserAccessLevel, CompanyInfo, Quote, LoggedInUser } from './types'; 
import { apiLogin, apiLogout, apiCheckAuth, apiGetCompanyInfo } from './utils';
import Spinner from './components/common/Spinner';

// Componente para debug de rotas
const LocationDebug: React.FC = () => {
  const location = useLocation();
  
  useEffect(() => {
    console.log('📍 Rota atual:', {
      pathname: location.pathname,
      hash: location.hash,
      search: location.search,
      state: location.state
    });
  }, [location]);
  
  return null;
};

// Componente de erro para rotas não encontradas
const NotFoundPage: React.FC = () => {
  const location = useLocation();
  
  return (
    <div className="p-6 text-center bg-gray-800 rounded-lg mx-4">
      <h2 className="text-2xl font-bold text-white mb-4">Página não encontrada</h2>
      <p className="text-gray-400 mb-4">
        A rota <code className="bg-gray-700 px-2 py-1 rounded text-yellow-400">{location.pathname}</code> não existe.
      </p>
      <div className="mb-4 text-sm text-gray-500">
        <p>Hash: {location.hash || 'nenhum'}</p>
        <p>Search: {location.search || 'nenhum'}</p>
      </div>
      <button 
        onClick={() => {
          console.log('🏠 Redirecionando para home');
          window.location.hash = '/';
        }}
        className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded font-semibold"
      >
        Voltar ao Início
      </button>
      <div className="mt-4 text-left bg-gray-700 p-4 rounded">
        <h3 className="text-white font-semibold mb-2">Rotas Disponíveis:</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <code>/</code> - Dashboard</li>
          <li>• <code>/products</code> - Produtos</li>
          <li>• <code>/customers</code> - Clientes</li>
          <li>• <code>/categories</code> - Categorias</li>
          <li>• <code>/quotes/new</code> - Novo Orçamento</li>
          <li>• <code>/quotes/all</code> - Todos Orçamentos</li>
          <li>• <code>/users</code> - Usuários (Admin)</li>
          <li>• <code>/settings</code> - Configurações (Admin)</li>
        </ul>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [companyDetails, setCompanyDetails] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [selectedQuoteForGlobalView, setSelectedQuoteForGlobalView] = useState<Quote | null>(null);
  const [isViewDetailsModalOpenForGlobal, setIsViewDetailsModalOpenForGlobal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Log informações do ambiente
    console.log('🌐 Ambiente:', {
      hostname: window.location.hostname,
      href: window.location.href,
      hash: window.location.hash,
      userAgent: navigator.userAgent.substring(0, 100)
    });
    
    const checkSessionAndData = async () => {
        setIsLoading(true);
        try {
            console.log('🔍 Verificando sessão de usuário...');
            const user = await apiCheckAuth();
            if (user) {
                console.log('✅ Usuário autenticado:', user.username, 'Role:', user.role);
                
                // User is authenticated, now get company info.
                const companyInfo = await apiGetCompanyInfo().catch(err => {
                    console.error("❌ Failed to fetch company info, but continuing.", err);
                    return null; // Don't let company info failure block login
                });
                
                setCurrentUser(user);
                setIsAuthenticated(true);
                setCompanyDetails(companyInfo);
                
                console.log('✅ Sessão restaurada com sucesso');
            } else {
                console.log('❌ Nenhum usuário autenticado');
                setIsAuthenticated(false);
                setCurrentUser(null);
                setCompanyDetails(null);
            }
        } catch (error) {
            console.info('ℹ️ Nenhuma sessão ativa encontrada:', error);
            setIsAuthenticated(false);
            setCurrentUser(null);
            setCompanyDetails(null);
        } finally {
            setIsLoading(false);
        }
    };
    
    checkSessionAndData();
}, []);

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Tentando fazer login com:', username);
      const user = await apiLogin(username, password);
      if (user) {
        console.log('✅ Login bem-sucedido:', user.username, 'Role:', user.role);
        setCurrentUser(user);
        setIsAuthenticated(true);
        
        // Fetch company details after successful login
        apiGetCompanyInfo()
          .then(info => {
            setCompanyDetails(info);
            console.log('✅ Informações da empresa carregadas');
          })
          .catch(err => console.error('⚠️ Erro ao carregar info da empresa:', err));
        
        return true;
      }
      console.log('❌ Login falhou para:', username);
      return false;
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Fazendo logout...');
      await apiLogout();
      console.log('✅ Logout bem-sucedido');
    } catch (error) {
      console.error("❌ Logout failed:", error);
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setCompanyDetails(null);
      
      // Forçar redirecionamento
      window.location.hash = '/login';
    }
  };
  
  const handleOpenViewDetailsForGlobal = (quote: Quote) => {
    setSelectedQuoteForGlobalView(quote);
    setIsViewDetailsModalOpenForGlobal(true);
  };
  
  const handleCloseViewDetailsForGlobal = () => {
    setIsViewDetailsModalOpenForGlobal(false);
    setSelectedQuoteForGlobalView(null);
  };

  const handleCompanyInfoUpdate = () => {
     apiGetCompanyInfo().then(setCompanyDetails).catch(console.error);
  }

  const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: UserAccessLevel | UserAccessLevel[] }> = ({ children, requiredRole }) => {
    console.log('🛡️ ProtectedRoute verificando:', {
      authenticated: isAuthenticated,
      user: currentUser?.username,
      role: currentUser?.role,
      requiredRole
    });
    
    if (!isAuthenticated) {
      console.log('🔒 Usuário não autenticado, redirecionando para login');
      return <Navigate to="/login" replace />;
    }
    
    if (requiredRole && currentUser) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(currentUser.role)) {
        console.log('🚫 Usuário sem permissão suficiente. Tem:', currentUser.role, 'Precisa:', roles);
        return <Navigate to="/" replace />;
      }
    }
    
    console.log('✅ Acesso autorizado à rota protegida');
    return <>{children}</>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-300">Carregando aplicação...</p>
          <p className="mt-2 text-gray-500 text-sm">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  console.log('🎨 Renderizando App. Autenticado:', isAuthenticated, 'Usuário:', currentUser?.username);

  return (
    <HashRouter>
      <LocationDebug />
      {!isAuthenticated ? (
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Acesso Negado</h2>
                <p className="text-gray-400 mb-4">Você precisa fazer login para acessar esta página.</p>
                <button 
                  onClick={() => window.location.hash = '/login'}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded font-semibold"
                >
                  Ir para Login
                </button>
              </div>
            </div>
          } />
        </Routes>
      ) : (
        currentUser && (
          <div className="flex flex-col min-h-screen bg-gray-950">
            <Header 
              userName={currentUser.username} 
              userFullName={currentUser.fullName}
              userRole={currentUser.role} 
              onLogout={handleLogout} 
              companyInfo={companyDetails}
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
            <div className="flex flex-1 pt-16"> 
              <Sidebar currentRole={currentUser.role} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
              <main className="flex-1 p-4 md:p-6 bg-gray-950 md:ml-64 overflow-y-auto"> 
                <Routes>
                  <Route path="/login" element={<Navigate to="/" replace />} />
                  
                  {/* Rota principal */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <DashboardPage 
                        userName={currentUser.fullName || currentUser.username} 
                        userRole={currentUser.role}
                        openGlobalViewDetailsModal={handleOpenViewDetailsForGlobal} 
                      />
                    </ProtectedRoute>
                  } />
                  
                  {/* Rotas protegidas */}
                  <Route path="/products" element={
                    <ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}>
                      <ProductsPage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/categories" element={
                    <ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}>
                      <CategoriesPage />
                    </ProtectedRoute>
                  } /> 
                  
                  <Route path="/customers" element={
                    <ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}>
                      <CustomersPage openGlobalViewDetailsModal={handleOpenViewDetailsForGlobal} />
                    </ProtectedRoute>
                  } /> 
                  
                  <Route path="/quotes/new" element={
                    <ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}>
                      <CreateQuotePage currentUser={currentUser} />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/quotes/edit/:quoteId" element={
                    <ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}>
                      <CreateQuotePage currentUser={currentUser} />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/quotes/all" element={
                    <ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES, UserAccessLevel.VIEWER]}>
                      <AllQuotesPage openGlobalViewDetailsModal={handleOpenViewDetailsForGlobal} />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/suppliers" element={
                    <ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}>
                      <SuppliersPage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/accounts-payable" element={
                    <ProtectedRoute requiredRole={UserAccessLevel.ADMIN}>
                      <AccountsPayablePage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/sales/user-performance" element={
                    <ProtectedRoute requiredRole={UserAccessLevel.ADMIN}>
                      <UserSalesPerformancePage currentUser={currentUser} />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/users" element={
                    <ProtectedRoute requiredRole={UserAccessLevel.ADMIN}>
                      <UsersPage loggedInUser={currentUser} />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/settings" element={
                    <ProtectedRoute requiredRole={UserAccessLevel.ADMIN}>
                      <CompanySettingsPage onSettingsSaved={handleCompanyInfoUpdate} />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/orders" element={
                    <ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}>
                      <OrdersPage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/cashflow" element={
                    <ProtectedRoute requiredRole={UserAccessLevel.ADMIN}>
                      <CashFlowPage />
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch-all route para páginas não encontradas */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>
            </div>
            <ViewQuoteDetailsModal
              isOpen={isViewDetailsModalOpenForGlobal}
              onClose={handleCloseViewDetailsForGlobal}
              quote={selectedQuoteForGlobalView}
            />
          </div>
        )
      )}
    </HashRouter>
  );
};

export default App;