
import React, { useState } from 'react';
import { APP_NAME } from '../constants';
import UserCircleIcon from './icons/UserCircleIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ArrowLeftOnRectangleIcon from './icons/ArrowLeftOnRectangleIcon';
import Bars3Icon from './icons/Bars3Icon';
import XMarkIcon from './icons/XMarkIcon';
import { UserAccessLevel, CompanyInfo } from '../types';

interface HeaderProps {
  userName: string; // This is the username
  userFullName?: string; // This is the optional full name
  userRole: UserAccessLevel;
  onLogout: () => void;
  companyInfo?: CompanyInfo | null;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ userName, userFullName, userRole, onLogout, companyInfo, isSidebarOpen, onToggleSidebar }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const displayName = userFullName || userName;

  return (
    <header className="bg-gray-900 shadow-lg fixed top-0 z-40 w-full">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={onToggleSidebar}
              className="md:hidden mr-4 p-2 text-gray-400 hover:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-yellow-500"
              aria-label="Toggle menu"
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
            
            {/* Desktop Logo */}
            {companyInfo && companyInfo.logoUrlDarkBg && (
              <img 
                src={companyInfo.logoUrlDarkBg} 
                alt={companyInfo.name || APP_NAME} 
                className="hidden md:block h-10 w-auto max-h-10" 
              />
            )}

            {/* Title for Mobile, or for Desktop if no logo */}
            <h1 className={`text-xl md:text-2xl font-bold text-yellow-500 ${companyInfo?.logoUrlDarkBg ? 'md:hidden' : ''}`}>
              {companyInfo?.name || APP_NAME}
            </h1>
          </div>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center text-sm font-medium text-gray-300 hover:text-white focus:outline-none"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
              aria-label={`User menu for ${displayName}`}
            >
              <UserCircleIcon className="h-8 w-8 text-gray-400 mr-2" />
              <span className="hidden sm:inline">{displayName} ({userRole})</span>
              <ChevronDownIcon className="ml-1 h-5 w-5 text-gray-500" />
            </button>
            {dropdownOpen && (
              <div 
                className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <button
                  onClick={() => {
                    onLogout();
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-yellow-500"
                  role="menuitem"
                >
                  <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
