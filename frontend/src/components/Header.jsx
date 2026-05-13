import { useEffect, useState, useRef } from 'react';
import { Bell, Trash2, CheckCheck, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { API_BASE_URL } from '../services/api';

const Header = () => {
  const [user, setUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef(null);

  const fetchNotifications = async (token) => {
    try {
      const response = await api.get('/notifications', token);
      if (response.success) {
        setNotifications(response.data);
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      if (token) {
        fetchNotifications(token);

        // SSE Setup
        const sseUrl = `${API_BASE_URL}/events/user/${parsedUser.id}`;
        eventSourceRef.current = new EventSource(sseUrl);

        eventSourceRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification') {
              // Add new notification to the top
              setNotifications(prev => [data.data, ...prev]);
              setUnreadCount(prev => prev + 1);
            }
          } catch (e) {
            console.error('SSE Parse Error', e);
          }
        };

        eventSourceRef.current.onerror = (err) => {
          console.error('SSE Error', err);
          eventSourceRef.current.close();
        };
      }
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await api.patch('/notifications/read-all', {}, token);
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleClearAll = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await api.delete('/notifications', token);
      if (response.success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (notif.read) return;
    const token = localStorage.getItem('token');
    try {
      const response = await api.patch(`/notifications/${notif.id}/read`, {}, token);
      if (response.success) {
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  return (
    <header className="lg:pl-20" style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '100%',
      height: '80px',
      backgroundColor: 'var(--surface-container-low)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--outline-variant)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingRight: '24px',
      zIndex: 40
    }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: 'var(--on-surface)',
            cursor: 'pointer',
            padding: '8px',
            marginLeft: '12px'
          }}
          className="lg:hidden hover:bg-surface-container-high rounded-xl transition-colors"
        >
          <Menu size={24} />
        </button>
        <h1 style={{ 
          fontSize: 'clamp(20px, 4vw, 32px)', 
          fontWeight: '900', 
          color: 'var(--primary)', 
          textTransform: 'uppercase', 
          letterSpacing: '-0.04em',
          margin: 0,
          paddingLeft: '12px'
        }}>Lumina</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative' }}>
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            borderRadius: '12px'
          }} className="hover:bg-surface-container-high">
          <Bell size={24} color={unreadCount > 0 ? "var(--primary)" : "var(--on-surface)"} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '10px',
              height: '10px',
              backgroundColor: 'var(--primary)',
              borderRadius: '50%',
              border: '2px solid var(--surface-container-low)'
            }}></span>
          )}
        </button>

        {/* Notifications Dropdown */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              style={{
                position: 'absolute',
                top: '70px',
                right: '0',
                width: '380px',
                backgroundColor: 'var(--surface-container-high)',
                backdropFilter: 'blur(32px)',
                borderRadius: '24px',
                border: '1px solid var(--outline-variant)',
                padding: '24px',
                zIndex: 100,
                boxShadow: '0 40px 80px rgba(0,0,0,0.3)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>Notification Center</h4>
                  {unreadCount > 0 && (
                    <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)', fontWeight: '600' }}>{unreadCount} unread messages</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {notifications.length > 0 && (
                    <>
                      <button onClick={handleMarkAllRead} title="Mark all read" style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: '4px' }} className="hover:text-primary transition-colors">
                        <CheckCheck size={18} />
                      </button>
                      <button onClick={handleClearAll} title="Clear all" style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: '4px' }} className="hover:text-error transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                {notifications.length === 0 ? (
                  <div style={{ padding: '48px 0', textAlign: 'center', opacity: 0.4 }}>
                    <Bell size={40} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                    <p style={{ fontSize: '14px', fontWeight: '500' }}>No new notifications</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n)}
                      style={{ 
                        padding: '16px', 
                        borderRadius: '16px', 
                        backgroundColor: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(var(--primary-rgb, 190, 160, 255), 0.08)',
                        border: '1px solid',
                        borderColor: n.read ? 'rgba(255,255,255,0.05)' : 'rgba(var(--primary-rgb, 190, 160, 255), 0.2)',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        position: 'relative'
                      }} className="hover:translate-x-1">
                      {!n.read && (
                        <div style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', width: '4px', height: '24px', backgroundColor: 'var(--primary)', borderRadius: '2px' }}></div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', opacity: 0.8 }}>{n.type || 'Alert'}</span>
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: n.read ? '400' : '600', color: 'var(--on-surface)', lineHeight: 1.5 }}>{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '8px' }}>
          <div className="hidden md:block" style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', lineHeight: 1 }}>{user?.name || 'User'}</p>
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid var(--primary)',
            backgroundColor: 'var(--surface-container-high)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '900',
            color: 'var(--primary)'
          }}>
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt="User Profile" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{user?.name?.[0]?.toUpperCase() || 'U'}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
