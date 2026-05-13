import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, UserPlus, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { API_BASE_URL } from '../services/api';

const JoinProject = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [inviteInfo, setInviteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInviteInfo = async () => {
      const userToken = localStorage.getItem('token');
      try {
        const response = await api.get(`/invite/${token}`, userToken);
        if (response.success) {
          setInviteInfo(response.data);
          if (response.data.status === 'pending') {
            setRequested(true);
          } else if (response.data.status === 'member') {
            navigate(`/projects/${response.data.projectId}`);
          }
        } else {
          setError(response.message || 'Invalid invite link');
        }
      } catch (err) {
        setError('Failed to load invite information');
      } finally {
        setLoading(false);
      }
    };
    fetchInviteInfo();
  }, [token, navigate]);

  // Real-time synchronization for approval
  useEffect(() => {
    let user = null;
    try {
      const storedUser = localStorage.getItem('user');
      user = storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
    }
    
    if (!user || !user.id || !requested) return;

    console.log('Watching for approval status...');
    const eventSource = new EventSource(`${API_BASE_URL}/events/user/${user.id}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'JOIN_REQUEST_ACCEPTED' && data.data.projectId === inviteInfo?.projectId) {
          toast.success(`Welcome! Your request for "${data.data.projectName}" was accepted.`, {
            duration: 5000,
            icon: '🎉',
          });
          setTimeout(() => {
            navigate(`/projects/${data.data.projectId}`);
          }, 1500);
        }
      } catch (err) {
        console.error('Error parsing SSE message', err);
      }
    };

    return () => eventSource.close();
  }, [requested, inviteInfo, navigate]);

  const handleJoin = async () => {
    const userToken = localStorage.getItem('token');
    
    // If not logged in, redirect to login with this page as return URL
    if (!userToken) {
      navigate(`/login?redirect=/join/${token}`);
      return;
    }

    setJoining(true);
    try {
      const response = await api.post(`/invite/${token}/join`, {}, userToken);
      if (response.success) {
        if (response.data.status === 'pending') {
          setRequested(true);
        } else {
          // If already a member or approved immediately
          navigate(`/projects/${response.data.projectId}`);
        }
      } else {
        setError(response.message || 'Failed to join project');
      }
    } catch (err) {
      setError('An error occurred while joining the project');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#15121b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" color="#d0bcff" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#15121b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center', backgroundColor: '#1d1a23', padding: '40px', border: '4px solid #ef4444', boxShadow: '12px 12px 0 #ef4444' }}>
          <AlertCircle size={64} color="#ef4444" style={{ marginBottom: '24px', margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#fff', textTransform: 'uppercase', marginBottom: '16px' }}>Oops!</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '32px' }}>{error}</p>
          <button 
            onClick={() => navigate('/projects')}
            style={{ width: '100%', backgroundColor: '#fff', color: '#000', border: 'none', padding: '16px', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Back to Safety
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#15121b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ 
          maxWidth: '500px', 
          width: '100%', 
          backgroundColor: '#1d1a23', 
          border: '4px solid #fff', 
          boxShadow: '16px 16px 0 #d0bcff',
          padding: '48px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background Accent */}
        <div style={{ 
          position: 'absolute', 
          top: '-50px', 
          right: '-50px', 
          width: '150px', 
          height: '150px', 
          backgroundColor: inviteInfo.projectColor || '#d0bcff', 
          borderRadius: '50%', 
          opacity: 0.1 
        }}></div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#d0bcff', marginBottom: '24px' }}>
            <Shield size={20} />
            <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Secure Invitation</span>
          </div>

          <h2 style={{ fontSize: '48px', fontWeight: '900', lineHeight: 1, color: '#fff', textTransform: 'uppercase', marginBottom: '16px' }}>
            {requested ? <>Request <span style={{ color: '#d0bcff' }}>Sent</span></> : <>Join the <span style={{ color: inviteInfo.projectColor || '#d0bcff' }}>Team</span></>}
          </h2>
          
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '18px', marginBottom: '40px' }}>
            {requested 
                ? "Your request is now pending. We'll notify you once the admin approves it." 
                : <>You've been invited to collaborate on <strong style={{ color: '#fff' }}>{inviteInfo.projectName}</strong>.</>}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!requested ? (
              <button 
                onClick={handleJoin}
                disabled={joining}
                style={{ 
                  width: '100%', 
                  backgroundColor: '#d0bcff', 
                  color: '#3c0091', 
                  border: 'none', 
                  padding: '20px', 
                  fontSize: '14px', 
                  fontWeight: '900', 
                  textTransform: 'uppercase', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px'
                }}
                className="hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                {joining ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                {joining ? 'Sending Request...' : 'Request to Join'}
              </button>
            ) : (
              <button 
                onClick={() => navigate('/projects')}
                style={{ 
                  width: '100%', 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  color: '#fff', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  padding: '20px', 
                  fontSize: '14px', 
                  fontWeight: '900', 
                  textTransform: 'uppercase', 
                  cursor: 'pointer'
                }}
              >
                Return to Dashboard
              </button>
            )}
            
            {!requested && localStorage.getItem('token') && (
              <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                Your request will be sent to the project administrator for approval.
              </p>
            )}
          </div>
        </div>

        {/* Swiss-style Decorative Element */}
        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: '700' }}>Lumina Workspace // v2.0</span>
          <ArrowRight size={16} color="rgba(255,255,255,0.3)" />
        </div>
      </motion.div>
    </div>
  );
};

export default JoinProject;
