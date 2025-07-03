import React, { useState, useEffect } from 'react';
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
import { apiLogin, apiLogout, apiCheckAuth, apiGetCompanyInfo } from './utils';
import Spinner from './components/common/Spinner';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [companyDetails, setCompanyDetails] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [selectedQuoteForGlobalView, setSelectedQuoteForGlobalView] = useState<Quote | null>(null);
  const [isViewDetailsModalOpenForGlobal, setIsViewDetailsModalOpenForGlobal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkSessionAndData = async () => {
        setIsLoading(true);
        try {
            const user = await apiCheckAuth();
            if (user) {
                // User is authenticated, now get company info.
                // We fetch it here to ensure it's available before the main app renders.
                const companyInfo = await apiGetCompanyInfo().catch(err => {
                    console.error("Failed to fetch company info, but continuing.", err);
                    return null; // Don't let company info failure block login
                });
                setCurrentUser(user);
                setIsAuthenticated(true);
                setCompanyDetails(companyInfo);
            } else {
                // No user, clear session data
                setIsAuthenticated(false);
                setCurrentUser(null);
                setCompanyDetails(null);
            }
        } catch (error) {
            // This catches apiCheckAuth failure, which is expected if not logged in.
            console.info('No active session found.');
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
    const user = await apiLogin(username, password);
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      // Fetch company details after successful login
      apiGetCompanyInfo().then(setCompanyDetails).catch(console.error);
      return true;
    }
    return false;
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
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
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (requiredRole && currentUser) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(currentUser.role)) {
        return <Navigate to="/" replace />;
      }
    }
    return <>{children}</>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <HashRouter>
      {!isAuthenticated ? (
         <Routes>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
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
                  <Route path="/settings" element={<ProtectedRoute requiredRole={UserAccessLevel.ADMIN}><CompanySettingsPage onSettingsSaved={handleCompanyInfoUpdate} /></ProtectedRoute>} />
                  
                  <Route path="/orders" element={<ProtectedRoute requiredRole={[UserAccessLevel.ADMIN, UserAccessLevel.SALES]}><OrdersPage /></ProtectedRoute>} />
                  <Route path="/cashflow" element={<ProtectedRoute requiredRole={UserAccessLevel.ADMIN}><CashFlowPage /></ProtectedRoute>} />
                  
                  <Route path="*" element={<Navigate to="/" replace />} /> 
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
