import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { api } from './services/apiService';
import Spinner from './components/common/Spinner';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [companyDetails, setCompanyDetails] = useState<CompanyInfo | null>(null);

  const [selectedQuoteForGlobalView, setSelectedQuoteForGlobalView] = useState<Quote | null>(null);
  const [isViewDetailsModalOpenForGlobal, setIsViewDetailsModalOpenForGlobal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);


  const fetchCompanyInfo = useCallback(async () => {
    try {
      const info = await api.get('/api/settings/company-info');
      setCompanyDetails(info);
    } catch (error) {
      console.error('Failed to fetch company info:', error);
      setCompanyDetails(null);
    }
  }, []);

  const checkLoggedIn = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const user = await api.get('/api/auth/me');
        setCurrentUser(user);
        setIsAuthenticated(true);
        await fetchCompanyInfo();
      } catch (error) {
        console.error("Session check failed:", error);
        handleLogout(); // Clears invalid token
      }
    }
    setIsLoading(false);
  }, [fetchCompanyInfo]);

  useEffect(() => {
    checkLoggedIn();
  }, [checkLoggedIn]);
  
  const handleLogin = (user: LoggedInUser, token: string) => {
    localStorage.setItem('authToken', token);
    setCurrentUser(user);
    setIsAuthenticated(true);
    fetchCompanyInfo();
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const handleOpenViewDetailsForGlobal = (quote: Quote) => {
    setSelectedQuoteForGlobalView(quote);
    setIsViewDetailsModalOpenForGlobal(true);
  };
  const handleCloseViewDetailsForGlobal = () => {
    setIsViewDetailsModalOpenForGlobal(false);
    setSelectedQuoteForGlobalView(null);
  };
  
  // This effect listens for manual changes to company info in another tab
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
       if (event.key === 'companyInfoUpdated') {
         fetchCompanyInfo();
       }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchCompanyInfo]);


  const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: UserAccessLevel | UserAccessLevel[] }> = ({ children, requiredRole }) => {
    if (!currentUser) {
      // Should be caught by the parent route check, but as a safeguard
      return <Navigate to="/login" replace />;
    }
    if (requiredRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(currentUser.role)) {
        alert("Você não tem permissão para acessar esta página.");
        return <Navigate to="/" replace />;
      }
    }
    return <>{children}</>;
  };

  if (isLoading) {
    return (
      <div className="bg-black text-white flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <div className="flex flex-col min-h-screen bg-black">
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
          <main className={`flex-1 p-4 md:p-6 bg-black transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'}`}>
            <Routes>
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <DashboardPage
                    userName={currentUser.fullName || currentUser.username}
                    userRole={currentUser.role}
                    openGlobalViewDetailsModal={handleOpenViewDetailsForGlobal}
                  />
                </ProtectedRoute>
              } />
              <Route path="/products" element={<ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}><ProductsPage /></ProtectedRoute>} />
              <Route path="/categories" element={<ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}><CategoriesPage /></ProtectedRoute>} />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}>
                    <CustomersPage
                      openGlobalViewDetailsModal={handleOpenViewDetailsForGlobal}
                    />
                  </ProtectedRoute>
                }
              />
              <Route path="/quotes/new" element={<ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}><CreateQuotePage currentUser={currentUser} /></ProtectedRoute>} />
              <Route path="/quotes/edit/:quoteId" element={<ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}><CreateQuotePage currentUser={currentUser} /></ProtectedRoute>} />
              <Route
                path="/quotes/all"
                element={
                  <ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES, UserAccessLevel.VIEWER]}>
                    <AllQuotesPage openGlobalViewDetailsModal={handleOpenViewDetailsForGlobal} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/suppliers"
                element={
                  <ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}>
                    <SuppliersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/accounts-payable"
                element={
                  <ProtectedRoute requiredRole={UserAccessLevel.ADMIN}>
                    <AccountsPayablePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales/user-performance"
                element={
                  <ProtectedRoute requiredRole={UserAccessLevel.ADMIN}>
                    <UserSalesPerformancePage currentUser={currentUser} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredRole={UserAccessLevel.ADMIN}>
                    <UsersPage loggedInUser={currentUser} />
                  </ProtectedRoute>
                }
              />
              <Route path="/settings" element={<ProtectedRoute requiredRole={UserAccessLevel.ADMIN}><CompanySettingsPage onUpdate={fetchCompanyInfo} /></ProtectedRoute>} />
              
              {/* Fallback routes for pages not yet fully implemented but kept in navigation */}
              <Route path="/orders" element={<ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}><OrdersPage /></ProtectedRoute>} />
              <Route path="/cashflow" element={<ProtectedRoute requiredRole={UserAccessLevel.ADMIN}><CashFlowPage /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
      <ViewQuoteDetailsModal
        isOpen={isViewDetailsModalOpenForGlobal}
        onClose={handleCloseViewDetailsForGlobal}
        quote={selectedQuoteForGlobalView}
      />
    </HashRouter>
  );
};

export default App;
