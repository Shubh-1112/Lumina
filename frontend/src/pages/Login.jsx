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
        credential: credentialResponse.credential
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
    <div className="flex flex-col lg:flex-row" style={{ backgroundColor: '#0f0d15', color: '#e7e0ed', fontFamily: 'var(--font-headline)', minHeight: '100vh', overflow: 'hidden' }}>
      
      {/* Left Section: Hero Typography */}
      <section 
        className="hidden lg:flex"
        style={{ 
          flex: 1, 
          backgroundColor: '#0f0d15', 
          position: 'relative', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          padding: '64px',
          borderRight: '1px solid rgba(255,255,255,0.1)'
        }}>
        
        {/* Corner Markers */}
        <div style={{ position: 'absolute', top: '24px', left: '24px', width: '32px', height: '32px', borderTop: '2px solid rgba(255,255,255,0.3)', borderLeft: '2px solid rgba(255,255,255,0.3)' }}></div>
        
        <div style={{ zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={32} color="#d0bcff" />
            <h1 style={{ fontSize: '32px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Lumina</h1>
          </div>
        </div>

        <div style={{ zIndex: 10 }}>
          <h2 className="architectural-type" style={{ fontSize: 'clamp(60px, 10vw, 130px)', fontWeight: '900', textTransform: 'uppercase', lineHeight: 0.8, letterSpacing: '-0.06em' }}>
            Plan<br/>
            <span style={{ color: '#d0bcff' }}>Tasks</span><br/>
            Track<br/>
            <span style={{ color: '#d0bcff' }}>Work</span>
          </h2>
        </div>



        {/* Vertical Text */}
        <div style={{ position: 'absolute', right: '24px', bottom: '64px', transform: 'rotate(90deg)', transformOrigin: 'right bottom', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.3, letterSpacing: '0.2em' }}>
          Est. 2024 / Ready to use
        </div>

        {/* Large Faint Logo in Background */}
        <div style={{ position: 'absolute', right: '-10%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(100px, 30vw, 400px)', fontWeight: '900', color: 'rgba(255,255,255,0.02)', pointerEvents: 'none', userSelect: 'none' }}>
          LUMINA
        </div>
      </section>

      {/* Right Section: Login Form */}
      <section style={{ 
        width: '100%', 
        maxWidth: '560px', 
        backgroundColor: '#0f0d15', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: 'clamp(24px, 5vw, 64px)',
        position: 'relative',
        margin: '0 auto'
      }}>
        
        {/* Corner Marker */}
        <div style={{ position: 'absolute', top: '24px', right: '24px', width: '32px', height: '32px', borderTop: '2px solid rgba(255,255,255,0.3)', borderRight: '2px solid rgba(255,255,255,0.3)' }}></div>

        <div style={{ marginBottom: 'clamp(32px, 8vw, 64px)' }}>
          <h2 style={{ fontSize: 'clamp(48px, 10vw, 80px)', fontWeight: '900', textTransform: 'uppercase', lineHeight: 1, marginBottom: '8px' }}>Login</h2>
          <p style={{ fontSize: '16px', color: 'var(--on-surface-variant)' }}>Login to your account to continue.</p>
          {error && <p style={{ color: 'var(--error)', marginTop: '24px', fontSize: '14px', fontWeight: '700' }}>{error}</p>}
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email</label>
            <input 
              style={{ width: '100%', padding: '16px', backgroundColor: 'transparent', border: '2px solid #333', color: 'white', outline: 'none', fontSize: '16px' }} 
              placeholder="user@example.com" 
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Password</label>
              <a href="#" style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: 'white', textDecoration: 'underline' }}>Forgot?</a>
            </div>
            <input 
              style={{ width: '100%', padding: '16px', backgroundColor: 'transparent', border: '2px solid #333', color: 'white', outline: 'none', fontSize: '16px' }} 
              placeholder="••••••••" 
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            disabled={loading}
            style={{ 
              width: '100%', 
              backgroundColor: '#d0bcff', 
              color: '#381e72', 
              padding: '16px', 
              fontSize: '14px', 
              fontWeight: '900', 
              textTransform: 'uppercase', 
              border: 'none', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px'
            }}
          >
            {loading ? 'Logging in...' : 'Login Now'}
            <ArrowRight size={20} />
          </button>
        </form>

        <div style={{ margin: '32px 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.5 }}>Or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              toast.error('Google Login Failed');
            }}
            theme="filled_black"
            shape="square"
            text="signin_with"
            width="350"
          />
        </div>

        <div style={{ marginTop: '48px', textAlign: 'center' }}>
           <p style={{ fontSize: '14px', opacity: 0.8 }}>
             Need an account? <Link to="/register" style={{ color: '#d0bcff', fontWeight: '800', textDecoration: 'underline' }}>Sign Up</Link>
           </p>
        </div>

      </section>
    </div>
  );
};

export default Login;
