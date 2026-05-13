import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Mail, 
  Code, 
  Bell, 
  Shield, 
  CreditCard, 
  Moon, 
  Sun,
  Grid3X3, 
  Search, 
  Camera, 
  Rocket, 
  LogOut,
  RefreshCcw,
  Zap,
  Save,
  Palette,
  Check,
  CheckCircle2
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import api from '../services/api';
import toast from 'react-hot-toast';
import { THEMES } from '../constants/themes';

const Settings = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTheme, setActiveTheme] = useState('lumina');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: ''
  });
  const [realStats, setRealStats] = useState({
    projectsJoined: 0,
    tasksAssigned: 0,
    completedTasks: 0,
    pendingTasks: 0
  });

  useEffect(() => {
    fetchRealStats();
  }, []);


  const fetchRealStats = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const [projRes, taskRes] = await Promise.all([
        api.get('/projects', token),
        api.get('/tasks/me', token)
      ]);

      if (projRes.success && taskRes) {
        // Note: taskRes for /tasks/me is usually a direct array or has a data wrapper depending on API implementation
        // Checking tasks.py: it returns a list directly or in a dict? 
        // Actually me_router returns list of tasks.
        const tasks = Array.isArray(taskRes) ? taskRes : (taskRes.data || []);
        const projects = projRes.data || [];
        
        const completed = tasks.filter(t => t.status === 'done').length;
        
        setRealStats({
          projectsJoined: projects.length,
          tasksAssigned: tasks.length,
          completedTasks: completed,
          pendingTasks: tasks.length - completed
        });
      }
    } catch (err) {
      console.error('Failed to fetch real stats', err);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || ''
      });
    }

    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme && THEMES[savedTheme]) {
      setActiveTheme(savedTheme);
    }
  }, []);

  const applyTheme = (themeKey) => {
    const theme = THEMES[themeKey];
    Object.entries(theme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    setActiveTheme(themeKey);
    localStorage.setItem('app-theme', themeKey);
    toast.success(`${theme.name} theme applied!`);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      // Note: Backend might need a dedicated profile update route
      // For now, we simulate success and update localStorage
      const updatedUser = { ...currentUser, ...formData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      toast.success('Profile metrics updated successfully');
    } catch (err) {
      toast.error('Failed to sync profile changes');
    }
  };

  if (!currentUser) return null;

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', color: 'var(--on-surface)' }}>
      <Sidebar />
      <Header />

      <main className="lg:pl-20" style={{ 
        paddingTop: '80px', 
        minHeight: '100vh',
        backgroundColor: 'var(--background)'
      }}>
        <div style={{ padding: 'clamp(16px, 4vw, 40px)', maxWidth: '1440px', margin: '0 auto' }}>
          
          {/* Header Section */}
          <div style={{ marginBottom: '48px', borderBottom: '4px solid var(--surface-container-highest)', paddingBottom: '32px' }}>
            <h1 style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: '900', textTransform: 'uppercase', lineHeight: 0.9, letterSpacing: '-0.04em', margin: 0 }}>Settings</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontWeight: '600', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={18} color="var(--primary)" />
              ACCOUNT PREFERENCES & THEMES
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '32px' }}>
            
            {/* Left Column: Identity */}
            <div className="col-span-12 lg:col-span-8">
              <section className="brutalist-border" style={{ backgroundColor: 'var(--surface-container-low)', padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <User size={24} color="var(--primary)" />
                    User Identity
                  </h3>
                  <button 
                    onClick={handleUpdateProfile}
                    className="brutalist-button"
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}
                  >
                    <Save size={18} />
                    SAVE CHANGES
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', md: 'auto 1fr', gap: '40px' }} className="flex flex-col md:flex-row">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '160px', height: '160px', backgroundColor: 'var(--surface-container-high)', border: '4px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', fontWeight: '900', color: 'var(--primary)', position: 'relative', overflow: 'hidden' }}>
                      {currentUser.avatar ? (
                        <img 
                          src={currentUser.avatar} 
                          alt="" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        currentUser.name?.charAt(0).toUpperCase()
                      )}
                      <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', backgroundColor: 'var(--on-surface)', color: 'var(--background)', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 }}>
                        <Camera size={20} />
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="grid-cols-1 md:grid-cols-2" style={{ gap: '24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)' }}>Full Name</label>
                        <input 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="brutalist-input" 
                          placeholder="Your Name"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)' }}>Email Address</label>
                        <input 
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="brutalist-input" 
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)' }}>About You</label>
                      <textarea 
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        className="brutalist-input" 
                        style={{ height: '120px', resize: 'none' }}
                        placeholder="Tell us about your role..."
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Theme Selection Section */}
              <section className="brutalist-border" style={{ backgroundColor: 'var(--surface-container-low)', padding: '32px', marginTop: '32px' }}>
                <h3 style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                  <Palette size={24} color="var(--primary)" />
                  Appearance & Themes
                </h3>

                {/* Dark Themes */}
                <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--primary)' }}>
                    <Moon size={18} />
                    <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Dark Architectures</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                    {Object.entries(THEMES).filter(([_, t]) => t.type === 'dark').map(([key, theme]) => (
                      <motion.div
                        key={key}
                        whileHover={{ y: -4 }}
                        onClick={() => applyTheme(key)}
                        className="brutalist-border"
                        style={{ 
                          padding: '20px', 
                          cursor: 'pointer', 
                          backgroundColor: theme.colors['--background'],
                          borderColor: activeTheme === key ? 'var(--primary)' : 'var(--surface-container-highest)',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: theme.colors['--on-surface'] }}>{theme.name}</span>
                          {activeTheme === key && <div style={{ backgroundColor: theme.colors['--primary'], color: theme.colors['--on-primary'], padding: '2px' }}><Check size={14} /></div>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ width: '24px', height: '24px', backgroundColor: theme.colors['--primary'] }}></div>
                          <div style={{ width: '24px', height: '24px', backgroundColor: theme.colors['--secondary'] }}></div>
                          <div style={{ width: '24px', height: '24px', backgroundColor: theme.colors['--surface-container-low'] }}></div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Light Themes */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--primary)' }}>
                    <Sun size={18} />
                    <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Light Environments</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                    {Object.entries(THEMES).filter(([_, t]) => t.type === 'light').map(([key, theme]) => (
                      <motion.div
                        key={key}
                        whileHover={{ y: -4 }}
                        onClick={() => applyTheme(key)}
                        className="brutalist-border"
                        style={{ 
                          padding: '20px', 
                          cursor: 'pointer', 
                          backgroundColor: theme.colors['--background'],
                          borderColor: activeTheme === key ? 'var(--primary)' : 'var(--surface-container-highest)',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: theme.colors['--on-surface'] }}>{theme.name}</span>
                          {activeTheme === key && <div style={{ backgroundColor: theme.colors['--primary'], color: theme.colors['--on-primary'], padding: '2px' }}><Check size={14} /></div>}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ width: '24px', height: '24px', backgroundColor: theme.colors['--primary'] }}></div>
                          <div style={{ width: '24px', height: '24px', backgroundColor: theme.colors['--secondary'] }}></div>
                          <div style={{ width: '24px', height: '24px', backgroundColor: theme.colors['--surface-container-low'] }}></div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Account Insights */}
            <div className="col-span-12 lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              

              {/* Account Statistics */}
              <section className="brutalist-border" style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)', padding: '32px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
                  <Rocket size={120} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '24px', position: 'relative' }}>Account Stats</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', position: 'relative' }}>
                  <div>
                    <div style={{ fontSize: '32px', fontWeight: '900' }}>{realStats.projectsJoined}</div>
                    <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.8 }}>Projects Joined</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '32px', fontWeight: '900' }}>
                      {realStats.tasksAssigned > 0 
                        ? `${Math.round((realStats.completedTasks / realStats.tasksAssigned) * 100)}%` 
                        : '0%'}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.8 }}>Completion Rate</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '32px', fontWeight: '900' }}>{realStats.tasksAssigned}</div>
                    <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.8 }}>Tasks Assigned</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '32px', fontWeight: '900' }}>{realStats.pendingTasks}</div>
                    <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.8 }}>Pending Actions</div>
                  </div>
                </div>
              </section>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
