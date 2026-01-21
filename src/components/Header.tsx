import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, BookOpen, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { isLoggedIn, syncWithServer } = useData();
  const { user, profile } = useAuth();
  const location = useLocation();

  // Auto-sync initially + every 10 sec
  useEffect(() => {
    const performSync = async () => {
      try {
        await syncWithServer();
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    };
    performSync();
    const interval = setInterval(performSync, 10000);
    return () => clearInterval(interval);
  }, [syncWithServer]);

  // ALL NAV ITEMS (single line)
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Notes Gallery', href: '/notes' },
    { name: 'Practice Tests', href: '/practice-tests' },
    { name: 'Assignments', href: '/assignments' },
    ...(user ? [{ name: 'SNCOP-AI', href: '/ai-chat' }] : []),
    { name: 'About', href: '/about' },
    { name: 'About Team', href: '/about-team' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const getUserDisplayName = () => {
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 hover-scale">
            <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gradient">SNCOP</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                B.Pharm Notes
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-0.5 lg:space-x-1">
            {navItems.map(item => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-2 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all duration-300 hover-scale ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-black/20'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center space-x-1.5 lg:space-x-2">

            {/* Profile - Ab mobile pe bhi dikhega */}
            {user && (
              <Link
                to="/profile"
                className="flex items-center space-x-1.5 lg:space-x-2 px-2 lg:px-3 py-1.5 rounded-lg glass-effect hover-scale"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-7 h-7 lg:w-8 lg:h-8 rounded-full object-cover
                               border border-gray-300 dark:border-gray-600
                               ring-2 ring-white/70 dark:ring-black/50"
                  />
                ) : (
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full
                    bg-gradient-to-r from-green-500 to-teal-600
                    border border-white/50 dark:border-black/40
                    ring-2 ring-white/60 dark:ring-black/40
                    flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {getInitials(profile?.full_name || user?.email || 'U')}
                    </span>
                  </div>
                )}
                <span
                  className="text-xs lg:text-sm font-semibold
                             text-gray-900 dark:text-gray-100
                             drop-shadow-sm max-w-[80px] lg:max-w-[120px] truncate"
                >
                  {getUserDisplayName()}
                </span>
              </Link>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 lg:p-2 rounded-lg glass-effect hover:scale-110 transition"
            >
              {isDark ? (
                <Sun className="h-4 w-4 lg:h-5 lg:w-5 text-yellow-500" />
              ) : (
                <Moon className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
              )}
            </button>

            {/* Register - mobile pe hide */}
            {!user && (
              <Link
                to="/register"
                className="hidden sm:flex px-2.5 lg:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs lg:text-sm font-medium hover-scale"
              >
                Register
              </Link>
            )}

            {/* Admin - mobile pe hide */}
            <Link
              to={isLoggedIn ? '/admin' : '/admin-login'}
              className="hidden sm:flex items-center space-x-1 lg:space-x-1.5 px-2.5 lg:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs lg:text-sm font-medium hover-scale"
            >
              <Settings className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              <span>Admin</span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg glass-effect"
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden glass-effect border-t">
          <div className="px-4 py-4 space-y-2">
            {navItems.map(item => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {item.name}
              </Link>
            ))}

            {!user && (
              <Link
                to="/register"
                className="block px-4 py-3 rounded-lg bg-blue-600 text-white"
              >
                Register
              </Link>
            )}

            <Link
              to={isLoggedIn ? '/admin' : '/admin-login'}
              className="block px-4 py-3 rounded-lg bg-purple-600 text-white"
            >
              Admin
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
