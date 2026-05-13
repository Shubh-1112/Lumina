import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Activity, Cloud, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // Get redirect path from query params
  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  // Extract invite token if present in redirect path
  const inviteToken = redirectPath.includes('/join') 
    ? (redirectPath.split('/join/')[1]?.split('?')[0] || redirectPath.split('token=')[1])
    : null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password
      });

      if (response.success) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('Welcome back!');
        window.location.href = redirectPath;
      } else {
        // Handle specific error messages from backend
        const errorMsg = response.detail || 'Invalid email or password. Please try again.';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const msg = 'Connection to server failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };
 
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/google', {
        credential: credentialResponse.credential,
        inviteToken: inviteToken
      });
 
      if (response.success) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success('Welcome back with Google!');
        window.location.href = redirectPath;
      } else {
        toast.error(response.detail || 'Google authentication failed');
      }
    } catch (err) {
      toast.error('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row" style={{ backgroundColor: 'var(--background)', color: 'var(--on-surface)', fontFamily: 'var(--font-headline)', minHeight: '100vh', overflow: 'hidden' }}>
      
      {/* Left Section: Architectural Brand Presence */}
      <section 
        className="hidden lg:flex"
        style={{ 
          flex: 1.2, 
          backgroundColor: '#0f0d15', 
          position: 'relative', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          padding: '80px',
          borderRight: '4px solid var(--on-surface)',
          backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(107, 56, 212, 0.15) 0%, transparent 50%)'
        }}>
        
        {/* Corner Markers */}
        <div style={{ position: 'absolute', top: '40px', left: '40px', width: '64px', height: '64px', borderTop: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)' }}></div>
        
        <div style={{ zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--primary)', borderRadius: '12px' }}>
              <Activity size={32} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '40px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.04em', margin: 0, color: '#ffffff' }}>Lumina</h1>
          </div>
          <p style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.2em' }}>v0.1 / PRE-RELEASE</p>
        </div>

        <div style={{ zIndex: 10 }}>
          <h2 className="architectural-type" style={{ fontSize: 'clamp(80px, 12vw, 160px)', fontWeight: '900', textTransform: 'uppercase', lineHeight: 0.8, letterSpacing: '-0.06em', margin: 0, color: '#ffffff' }}>
            STAY<br/>
            <span style={{ color: 'var(--primary)', WebkitTextStroke: '1px var(--primary)', WebkitTextFillColor: 'transparent' }}>AHEAD</span><br/>
            OF THE<br/>
            CURVE
          </h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 10 }}>
          <div style={{ maxWidth: '300px' }}>
            <p style={{ fontSize: '18px', lineHeight: 1.4, fontWeight: '600', opacity: 0.7 }}>
              Join the elite teams scaling their operations with precision and speed.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.3, letterSpacing: '0.1em', marginBottom: '8px' }}>Global Infrastructure</div>
            <div style={{ width: '120px', height: '4px', backgroundColor: 'var(--primary)', marginLeft: 'auto' }}></div>
          </div>
        </div>

        {/* Large Faint Logo in Background */}
        <div style={{ position: 'absolute', right: '-5%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(200px, 40vw, 600px)', fontWeight: '900', color: 'rgba(255,255,255,0.02)', pointerEvents: 'none', userSelect: 'none', zIndex: 1 }}>
          CORE
        </div>
      </section>

      {/* Right Section: Premium Login Form */}
      <section style={{ 
        width: '100%', 
        maxWidth: '650px', 
        backgroundColor: 'var(--background)', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: 'clamp(32px, 8vw, 80px)',
        position: 'relative',
        margin: '0 auto'
      }}>
        
        {/* Subtle background glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', backgroundColor: 'var(--primary)', filter: 'blur(150px)', opacity: 0.05, pointerEvents: 'none' }}></div>

        <div style={{ marginBottom: '56px', position: 'relative' }}>
          <div style={{ display: 'inline-block', backgroundColor: 'var(--surface-container-high)', padding: '8px 16px', borderRadius: '8px', marginBottom: '16px' }}>
             <span style={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)' }}>Access Portal</span>
          </div>
          <h2 style={{ fontSize: 'clamp(48px, 8vw, 72px)', fontWeight: '900', textTransform: 'uppercase', lineHeight: 1, marginBottom: '16px' }}>Welcome Back</h2>
          <p style={{ fontSize: '18px', color: 'var(--on-surface-variant)', fontWeight: '500' }}>The future of your projects starts here.</p>
          {error && (
            <div className="brutalist-border" style={{ marginTop: '32px', padding: '16px', backgroundColor: 'rgba(255, 82, 82, 0.1)', borderColor: 'var(--error)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield size={20} color="var(--error)" />
              <p style={{ color: 'var(--error)', fontSize: '14px', fontWeight: '700', margin: 0 }}>{error}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)' }}>Identity (Email)</label>
              <Cloud size={16} style={{ opacity: 0.3 }} />
            </div>
            <input 
              className="brutalist-input"
              style={{ width: '100%', padding: '20px', backgroundColor: 'var(--surface-container-low)', border: '2px solid var(--outline-variant)', color: 'white', outline: 'none', fontSize: '16px', transition: 'all 0.2s' }} 
              placeholder="name@company.com" 
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 4px rgba(107, 56, 212, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--outline-variant)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)' }}>Security (Password)</label>
              <Link to="#" style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', textDecoration: 'none' }}>Recovery?</Link>
            </div>
            <input 
              className="brutalist-input"
              style={{ width: '100%', padding: '20px', backgroundColor: 'var(--surface-container-low)', border: '2px solid var(--outline-variant)', color: 'white', outline: 'none', fontSize: '16px', transition: 'all 0.2s' }} 
              placeholder="••••••••" 
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 4px rgba(107, 56, 212, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--outline-variant)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button 
            disabled={loading}
            className="brutalist-button"
            style={{ 
              width: '100%', 
              background: 'linear-gradient(135deg, var(--primary) 0%, #9333ea 100%)', 
              color: '#ffffff', 
              padding: '24px', 
              fontSize: '16px', 
              fontWeight: '900', 
              textTransform: 'uppercase', 
              border: 'none', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              boxShadow: '0 20px 40px -10px rgba(107, 56, 212, 0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {loading ? 'Validating...' : 'Authorize Access'}
            <ArrowRight size={24} />
          </button>
        </form>

        <div style={{ margin: '48px 0', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--outline-variant)' }}></div>
          <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.3, letterSpacing: '0.2em' }}>Social Core</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--outline-variant)' }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="brutalist-border" style={{ padding: '4px', backgroundColor: 'white', borderRadius: '4px' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google Auth Failed')}
              theme="outline"
              shape="rectangular"
              text="continue_with"
              width="300"
            />
          </div>
        </div>

        <div style={{ marginTop: '64px', textAlign: 'center', borderTop: '1px solid var(--outline-variant)', paddingTop: '32px' }}>
           <p style={{ fontSize: '16px', color: 'var(--on-surface-variant)', fontWeight: '500' }}>
             New to the platform? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '900', textDecoration: 'none', borderBottom: '2px solid var(--primary)' }}>Create Account</Link>
           </p>
        </div>

      </section>
    </div>
  );
};

export default Login;
