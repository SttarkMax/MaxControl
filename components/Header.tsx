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
    <header className="bg-black shadow-lg fixed top-0 z-40 w-full">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section: Hamburger on mobile, placeholder on desktop for balance */}
          <div className="flex-1 flex justify-start">
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 text-gray-300 hover:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-yellow-500"
              aria-label="Toggle menu"
              aria-expanded={isSidebarOpen}
            >
              {isSidebarOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
          
          {/* Center section: Logo or Title */}
          <div className="flex-shrink-0">
            {companyInfo?.logoUrlDarkBg ? (
              <img 
                src={companyInfo.logoUrlDarkBg} 
                alt={companyInfo.name || APP_NAME} 
                className="h-10 w-auto max-h-10"
              />
            ) : (
              <h1 className="text-xl md:text-2xl font-bold text-yellow-500 truncate">
                {companyInfo?.name || APP_NAME}
              </h1>
            )}
          </div>

          {/* Right section: User Menu */}
          <div className="flex-1 flex justify-end">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center text-sm font-medium text-white hover:text-yellow-400 focus:outline-none"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                aria-label={`User menu for ${displayName}`}
              >
                <UserCircleIcon className="h-8 w-8 text-gray-300 mr-2" />
                <span className="hidden sm:inline">{displayName} ({userRole})</span>
                <ChevronDownIcon className="ml-1 h-5 w-5 text-gray-400" />
              </button>
              {dropdownOpen && (
                <div 
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-[#1d1d1d] ring-1 ring-black ring-opacity-5 focus:outline-none"
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
                    className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-[#3a3a3a] hover:text-yellow-500"
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
      </div>
    </header>
  );
};

export default Header;
