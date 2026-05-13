import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Activity } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';

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
  
  // Extract invite token if present in redirect path
  const inviteToken = redirectPath.includes('/join') 
    ? (redirectPath.split('/join/')[1]?.split('?')[0] || redirectPath.split('token=')[1])
    : null;

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
        toast.success('Welcome to Lumina!');
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
          backgroundColor: '#6b38d4', 
          position: 'relative', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          padding: '80px',
          borderRight: '4px solid var(--on-surface)',
          backgroundImage: 'url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"), linear-gradient(135deg, #6b38d4 0%, #381e72 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay'
        }}>
        
        {/* Overlay for better contrast */}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(56, 30, 114, 0.4)', zIndex: 1 }}></div>

        {/* Corner Markers */}
        <div style={{ position: 'absolute', top: '40px', left: '40px', width: '64px', height: '64px', borderTop: '4px solid white', borderLeft: '4px solid white', zIndex: 10 }}></div>
        
        <div style={{ zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '12px' }}>
              <Activity size={32} color="#6b38d4" />
            </div>
            <h1 style={{ fontSize: '40px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.04em', margin: 0, color: 'white' }}>Lumina</h1>
          </div>
          <p style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', letterSpacing: '0.2em' }}>ENGINEERED FOR EXCELLENCE</p>
        </div>

        <div style={{ zIndex: 10 }}>
          <h2 className="architectural-type" style={{ fontSize: 'clamp(80px, 10vw, 140px)', fontWeight: '900', textTransform: 'uppercase', lineHeight: 0.8, letterSpacing: '-0.06em', margin: 0, color: 'white' }}>
            BUILD<br/>
            YOUR<br/>
            LEGACY
          </h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 10 }}>
          <div style={{ maxWidth: '350px' }}>
            <p style={{ fontSize: '18px', lineHeight: 1.4, fontWeight: '600', color: 'white' }}>
              Start your journey with the world's most powerful project management ecosystem.
            </p>
          </div>
          <div style={{ textAlign: 'right', color: 'white' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.1em', marginBottom: '8px' }}>v0.1 / PRE-RELEASE</div>
            <div style={{ width: '120px', height: '4px', backgroundColor: 'white', marginLeft: 'auto' }}></div>
          </div>
        </div>

        {/* Large Faint Logo in Background */}
        <div style={{ position: 'absolute', right: '-5%', bottom: '10%', fontSize: 'clamp(150px, 30vw, 400px)', fontWeight: '900', color: 'rgba(255,255,255,0.05)', pointerEvents: 'none', userSelect: 'none', zIndex: 1 }}>
          SIGNUP
        </div>
      </section>

      {/* Right Section: Premium Register Form */}
      <section style={{ 
        width: '100%', 
        maxWidth: '700px', 
        backgroundColor: 'var(--background)', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: 'clamp(32px, 6vw, 64px)',
        position: 'relative',
        margin: '0 auto',
        overflowY: 'auto'
      }}>
        
        <div style={{ marginBottom: '48px', position: 'relative' }}>
          <div style={{ display: 'inline-block', backgroundColor: 'var(--surface-container-high)', padding: '8px 16px', borderRadius: '8px', marginBottom: '16px' }}>
             <span style={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)' }}>v0.1 PRE-RELEASE</span>
          </div>
          <h2 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: '900', textTransform: 'uppercase', lineHeight: 1, marginBottom: '16px' }}>Join Lumina</h2>
          <p style={{ fontSize: '18px', color: 'var(--on-surface-variant)', fontWeight: '500' }}>Create your account to initiate productivity.</p>
          {error && (
            <div className="brutalist-border" style={{ marginTop: '24px', padding: '16px', backgroundColor: 'rgba(255, 82, 82, 0.1)', borderColor: 'var(--error)' }}>
              <p style={{ color: 'var(--error)', fontSize: '14px', fontWeight: '700', margin: 0 }}>{error}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', zIndex: 10 }}>
          {/* Full Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)' }}>Full Name</label>
            <input 
              className="brutalist-input"
              style={{ width: '100%', padding: '18px', backgroundColor: 'var(--surface-container-low)', border: '2px solid var(--outline-variant)', color: 'white', outline: 'none', fontSize: '16px', transition: 'all 0.2s' }} 
              placeholder="e.g. Commander Shepard" 
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.backgroundColor = 'var(--surface-container-high)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--outline-variant)';
                e.target.style.backgroundColor = 'var(--surface-container-low)';
              }}
            />
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)' }}>Email Address</label>
            <input 
              className="brutalist-input"
              style={{ width: '100%', padding: '18px', backgroundColor: 'var(--surface-container-low)', border: '2px solid var(--outline-variant)', color: 'white', outline: 'none', fontSize: '16px', transition: 'all 0.2s' }} 
              placeholder="identity@lumina.com" 
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.backgroundColor = 'var(--surface-container-high)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--outline-variant)';
                e.target.style.backgroundColor = 'var(--surface-container-low)';
              }}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)' }}>Password</label>
            <input 
              className="brutalist-input"
              style={{ width: '100%', padding: '18px', backgroundColor: 'var(--surface-container-low)', border: '2px solid var(--outline-variant)', color: 'white', outline: 'none', fontSize: '16px', transition: 'all 0.2s' }} 
              placeholder="••••••••" 
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.backgroundColor = 'var(--surface-container-high)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--outline-variant)';
                e.target.style.backgroundColor = 'var(--surface-container-low)';
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
              padding: '20px', 
              fontSize: '16px', 
              fontWeight: '900', 
              textTransform: 'uppercase', 
              border: 'none', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '16px',
              boxShadow: '0 20px 40px -10px rgba(107, 56, 212, 0.4)'
            }}
          >
            {loading ? 'Processing...' : 'Create Account'}
            <ArrowRight size={24} />
          </button>
        </form>

        <div style={{ margin: '32px 0', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--outline-variant)' }}></div>
          <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.3, letterSpacing: '0.2em' }}>Direct Connect</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--outline-variant)' }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="brutalist-border" style={{ padding: '4px', backgroundColor: 'white', borderRadius: '4px' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google Auth Failed')}
              theme="outline"
              shape="rectangular"
              text="signup_with"
              width="300"
            />
          </div>
        </div>

        <div style={{ marginTop: '48px', textAlign: 'center' }}>
           <p style={{ fontSize: '16px', color: 'var(--on-surface-variant)', fontWeight: '500' }}>
             Already a member? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '900', textDecoration: 'none', borderBottom: '2px solid var(--primary)' }}>Secure Login</Link>
           </p>
        </div>

      </section>
    </div>
  );
};

export default Register;
