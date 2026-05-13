import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { THEMES } from './constants/themes';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Team from './pages/Team';
import Login from './pages/Login';
import Register from './pages/Register';
import ProjectDetail from './pages/ProjectDetail';
import JoinProject from './pages/JoinProject';
import LoadingScreen from './components/LoadingScreen';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'lavender_mist';
    if (THEMES[savedTheme]) {
      Object.entries(THEMES[savedTheme].colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    }
  }, []);

  return (
    <>
      {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      <div className="app-container" style={{ minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface-container-high)',
            color: 'var(--on-surface)',
            border: '2px solid var(--on-surface)',
            borderRadius: '0px',
            fontFamily: 'var(--font-body)',
            fontWeight: '600',
            fontSize: '14px',
            boxShadow: '4px 4px 0 var(--on-surface)'
          }
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* App Routes - Pages handle their own layout shells for design precision */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/team" element={<Team />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/join/:token" element={<JoinProject />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
    </>
  );
}

export default App;
