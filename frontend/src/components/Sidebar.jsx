import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Home
} from 'lucide-react';
import api from '../services/api';

const Sidebar = () => {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsMobileOpen(prev => !prev);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  // Close sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const checkPermissions = async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (!token || !userStr) return;

      try {
        const user = JSON.parse(userStr);
        const response = await api.get('/projects', token);
        if (response.success) {
          const hasAdminRole = response.data.some(p => {
            const member = p.members?.find(m => m.id === user.id);
            return member?.role === 'admin';
          });
          setIsAdmin(hasAdminRole);
        }
      } catch (err) {
        console.error('Failed to check permissions', err);
      }
    };
    checkPermissions();
  }, []);

  const menuItems = [
    { name: 'Home', icon: <Home size={24} />, path: '/' },
    { name: 'Dashboard', icon: <LayoutDashboard size={24} />, path: '/dashboard' },
    { name: 'Projects', icon: <FolderOpen size={24} />, path: '/projects' },
    { name: 'Team', icon: <Users size={24} />, path: '/team' },
    ...(isAdmin ? [{ name: 'Analytics', icon: <BarChart3 size={24} />, path: '/analytics' }] : []),
    { name: 'Settings', icon: <Settings size={24} />, path: '/settings' },
  ];

  return (
    <>
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              zIndex: 45
            }}
            className="lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: isHovered || isMobileOpen ? '256px' : '80px',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          borderRight: '1px solid var(--outline-variant)',
          backgroundColor: 'var(--surface-container-lowest)',
          display: isMobileOpen ? 'flex' : 'none',
          flexDirection: 'column',
          padding: '40px 8px',
          zIndex: 50,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          transform: !isMobileOpen && window.innerWidth < 1024 ? 'translateX(-100%)' : 'translateX(0)',
        }}
        className="lg:flex"
      >
      
      <nav style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.name}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '12px 20px',
                backgroundColor: isActive ? 'var(--primary-container)' : 'transparent',
                color: isActive ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
                borderRadius: isActive ? '9999px' : '0',
                textDecoration: 'none',
                transition: 'all 0.2s',
                fontWeight: isActive ? '500' : '400',
                minWidth: '240px'
              }}
              className={!isActive ? 'hover:text-primary hover:bg-surface-container-low' : ''}
            >
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', width: '24px' }}>
                {item.icon}
              </div>
              <span style={{ 
                fontSize: '16px', 
                opacity: isHovered || isMobileOpen ? 1 : 0, 
                transition: 'opacity 0.2s',
                visibility: isHovered || isMobileOpen ? 'visible' : 'hidden'
              }}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--outline-variant)', paddingTop: '8px' }}>
        <button 
          onClick={() => {
            localStorage.clear();
            window.location.href = '/login';
          }}
          onMouseEnter={() => setIsLogoutHovered(true)}
          onMouseLeave={() => setIsLogoutHovered(false)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            padding: '12px 20px',
            backgroundColor: isLogoutHovered ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
            border: 'none',
            color: isLogoutHovered ? '#ef4444' : 'var(--on-surface-variant)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: '240px',
            borderRadius: '9999px'
          }}>
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', width: '24px' }}>
            <LogOut size={24} color={isLogoutHovered ? '#ef4444' : 'currentColor'} />
          </div>
          <span style={{ 
            fontSize: '16px', 
            opacity: isHovered || isMobileOpen ? 1 : 0, 
            transition: 'opacity 0.2s',
            visibility: isHovered || isMobileOpen ? 'visible' : 'hidden',
            fontWeight: isLogoutHovered ? '600' : '400'
          }}>
            Logout
          </span>
        </button>
      </div>
      </aside>
    </>
  );
};

export default Sidebar;
