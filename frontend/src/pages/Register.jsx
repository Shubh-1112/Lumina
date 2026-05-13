import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Activity } from 'lucide-react';
import api from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      if (response.success) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        window.location.href = redirectPath;
      } else {
        // Handle specific error messages from backend
        const errorMsg = response.detail || 'Something went wrong. Please check your details and try again.';
        setError(errorMsg);
      }
    } catch (err) {
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row" style={{ backgroundColor: 'var(--background)', color: 'var(--on-surface)', fontFamily: 'var(--font-headline)', overflowX: 'hidden', minHeight: '100vh' }}>
      
      {/* Branding Side - Vibrant Purple */}
      <section 
        className="hidden lg:flex"
        style={{ 
          width: '40%', 
          backgroundColor: '#6b38d4', 
          position: 'relative', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          padding: '64px', 
          overflow: 'hidden' 
        }}>
        <div style={{ zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '48px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>Lumina</h1>
          </div>
          <p style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ready to work</p>
        </div>

        <div style={{ zIndex: 10 }}>
          <h2 style={{ fontSize: 'clamp(60px, 8vw, 100px)', fontWeight: '900', color: 'white', textTransform: 'uppercase', lineHeight: 0.85, letterSpacing: '-0.05em' }}>
            Work<br/>Done<br/>Faster
          </h2>
          <p style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: '700', color: 'white', marginTop: '40px', textTransform: 'uppercase', opacity: 0.8 }}>
            Organize every project in one place
          </p>
        </div>

        {/* Decorative elements */}
        <div style={{ position: 'absolute', bottom: '24px', left: '24px', width: '32px', height: '32px', borderBottom: '2px solid white', borderLeft: '2px solid white', opacity: 0.5 }}></div>

        
        {/* Abstract Architectural Graphic overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none' }}>
           <div style={{ width: '100%', height: '100%', backgroundImage: 'radial-gradient(circle at center, transparent 0%, #000 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuBEJP2gs22QgFAZKh4eic0PdYAzbFTH3VnjsRarzUzPHomoiqUhv6wpAcLS9_j0DdNYQoKunCaIaR8lgfJQtt720P3_cdSncGFOyIdOdc9I8FJ42jFnEJnKviB-7X_fCRyfFiixivF9rE9V-33pc9Gtc5ZUGDdNB8QYAsArq5C-6Iaw7_mYJHVnNRLBkeGimx-YANNtG4cLYaMD-LeL_6EV2HzCRxaQasXIS0zfdu62EZuyaLTMtTwWPiOndws6MZD3EIapMx7KG_td")', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(100%) contrast(150%)' }}></div>
        </div>
      </section>

      {/* Form Side - Obsidian Dark */}
      <section style={{ flexGrow: 1, backgroundColor: '#0f0d15', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px, 6vw, 48px)', position: 'relative' }}>
        
        {/* Global Corner Markers */}
        <div style={{ position: 'absolute', top: '32px', right: '32px', width: '48px', height: '48px', borderTop: '2px solid rgba(255,255,255,0.1)', borderRight: '2px solid rgba(255,255,255,0.1)' }}></div>
        <div style={{ position: 'absolute', bottom: '32px', right: '32px', color: 'rgba(255,255,255,0.2)', fontSize: '10px', fontWeight: '700' }}>SECURE ACCESS</div>

        <div style={{ width: '100%', maxWidth: '480px' }}>
          <div style={{ marginBottom: 'clamp(32px, 8vw, 64px)' }}>
            <h1 className="lg:hidden" style={{ fontSize: '32px', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '16px' }}>Lumina</h1>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 32px)', color: 'var(--on-surface)', fontWeight: '800', textTransform: 'uppercase', lineHeight: 1, marginBottom: '8px' }}>Sign Up</h2>
            <div style={{ height: '4px', width: '96px', backgroundColor: 'var(--primary)' }}></div>
            {error && <p style={{ color: 'var(--error)', marginTop: '16px', fontSize: '14px', fontWeight: '700' }}>{error}</p>}
            <p style={{ fontSize: '16px', color: 'var(--on-surface-variant)', marginTop: '16px' }}>Create an account to start managing your tasks.</p>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Name Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: 'var(--on-surface)', textTransform: 'uppercase', fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
                Full Name
                <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <input 
                className="brutalist-input" 
                style={{ width: '100%', padding: '14px', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)', border: '2px solid var(--outline-variant)', outline: 'none' }} 
                placeholder="John Doe" 
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            {/* Email Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: 'var(--on-surface)', textTransform: 'uppercase', fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
                Email
                <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <input 
                className="brutalist-input" 
                style={{ width: '100%', padding: '14px', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)', border: '2px solid var(--outline-variant)', outline: 'none' }} 
                placeholder="john@example.com" 
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            {/* Password Field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: 'var(--on-surface)', textTransform: 'uppercase', fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
                Password
                <span style={{ color: 'var(--primary)' }}>*</span>
              </label>
              <input 
                className="brutalist-input" 
                style={{ width: '100%', padding: '14px', backgroundColor: 'var(--surface-container)', color: 'var(--on-surface)', border: '2px solid var(--outline-variant)', outline: 'none' }} 
                placeholder="********" 
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            {/* Primary CTA */}
            <button 
              disabled={loading}
              className="brutalist-button" 
              style={{ 
                width: '100%', 
                marginTop: '24px', 
                backgroundColor: loading ? 'var(--outline)' : 'var(--primary-container)', 
                color: 'var(--on-primary-container)', 
                padding: '20px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                border: '4px solid var(--on-surface)',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              type="submit"
            >
              <span style={{ fontSize: 'clamp(20px, 4vw, 32px)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                {loading ? 'Working...' : 'Sign Up'}
              </span>
              <ArrowRight size={32} />
            </button>
          </form>

          {/* OAuth Section */}
          <div style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--outline-variant)' }}></div>
              <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--on-surface-variant)', letterSpacing: '0.1em' }}>Or</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--outline-variant)' }}></div>
            </div>

            <button className="brutalist-button" style={{ 
              width: '100%', 
              backgroundColor: 'var(--surface)', 
              color: 'var(--on-surface)', 
              border: '2px solid var(--on-surface)', 
              padding: '14px', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '12px',
              cursor: 'pointer'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span style={{ fontWeight: '700', textTransform: 'uppercase' }}>Sign up with Google</span>
            </button>
          </div>

          <div style={{ marginTop: '48px', textAlign: 'center' }}>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '16px' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'underline' }}>
                Login
              </Link>
            </p>
          </div>

        </div>
      </section>
    </div>
  );
};

export default Register;
