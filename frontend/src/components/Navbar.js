// frontend/src/components/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login page after logout
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/dashboard" className="text-white text-2xl font-bold tracking-wide">
          MonitorPro
        </Link>
        <div className="flex items-center space-x-6">
          <Link to="/dashboard" className="text-white hover:text-blue-200 transition duration-300">
            Dashboard
          </Link>
          <Link to="/manage-urls" className="text-white hover:text-blue-200 transition duration-300">
            Manage URLs
          </Link>
          {user && user.role === 'admin' && (
            <Link to="/settings" className="text-white hover:text-blue-200 transition duration-300">
              Settings
            </Link>
          )}
          <span className="text-blue-200 text-sm italic">
            ({user ? `${user.username} (${user.role})` : 'Guest'})
          </span>
          <button
            onClick={handleLogout}
            className="bg-blue-700 hover:bg-blue-900 text-white font-semibold py-1.5 px-4 rounded-md transition duration-300 shadow-md"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
