import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  CheckCircle2,
  XCircle,
  Clock,
  Users, 
  UserPlus, 
  Mail, 
  MoreHorizontal,
  ChevronRight,
  Shield,
  User,
  X
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import api, { API_BASE_URL } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const Team = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [currentProject, setCurrentProject] = useState(null);
  const [joinRequests, setJoinRequests] = useState({}); // { projectId: [requests] }
  const [confirmData, setConfirmData] = useState({ isOpen: false, projectId: null, memberId: null });

  // Pre-parse user with absolute safety
  const currentUser = (() => {
    try {
      const u = localStorage.getItem('user');
      if (!u) {
        console.warn('Team: No user found in localStorage');
        return null;
      }
      const parsed = JSON.parse(u);
      console.log('Team: Current user identified:', parsed.id);
      return parsed;
    } catch (e) {
      console.error('Team: Failed to parse user from localStorage', e);
      return null;
    }
  })();

  const fetchProjects = async () => {
    console.log('Team: Fetching projects...');
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Team: No token found');
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.get('/projects', token);
      console.log('Team: API Response received:', response.success ? 'Success' : 'Failure');
      if (response.success) {
        setProjects(response.data || []);
      } else {
        toast.error(response.message || 'Failed to load projects');
      }
    } catch (err) {
      console.error('Team: API Error', err);
      toast.error('Failed to connect to server');
    } finally {
      setLoading(false);
      console.log('Team: Loading set to false');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Refactor fetchAllRequests to be callable from anywhere
  const fetchAllRequests = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await api.get('/projects/requests/all', token);
      if (res.success) {
        const grouped = res.data.reduce((acc, req) => {
          if (!acc[req.projectId]) acc[req.projectId] = [];
          acc[req.projectId].push(req);
          return acc;
        }, {});
        setJoinRequests(grouped);
      }
    } catch (err) {
      console.error('Failed to fetch join requests', err);
    }
  };

  useEffect(() => {
    if (projects.length > 0) {
      fetchAllRequests();
    }
  }, [projects]);

  // Real-time synchronization via SSE
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) return;

    console.log('Establishing Real-time Connection for user:', user.id);
    const eventSource = new EventSource(`${API_BASE_URL}/events/user/${user.id}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_JOIN_REQUEST') {
          toast('New Join Request!', { icon: '🔔', style: { border: '2px solid var(--primary)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface)', fontWeight: '800' } });
          fetchAllRequests();
        } else if (data.type === 'REMOVED_FROM_PROJECT') {
          toast.error(`You have been removed from project: ${data.data.projectName}`, { duration: 6000 });
          fetchProjects(); // Refresh the list of projects
        } else if (data.type === 'ROLE_UPDATED') {
          toast.success(`Your role in "${data.data.projectName}" has been updated to: ${data.data.role}`, { icon: '🎖️', duration: 5000 });
          fetchProjects(); // Refresh to update UI permissions
        }
      } catch (err) {
        console.error('Error parsing SSE message', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE Connection error, falling back to polling...');
      eventSource.close();
    };

    // Polling fallback (every 30s)
    const interval = setInterval(fetchAllRequests, 30000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const handleGenerateInvite = async (project) => {
    const token = localStorage.getItem('token');
    try {
      const response = await api.post(`/projects/${project.id}/invite`, { expiresInDays: 7 }, token);
      if (response.success) {
        // Construct the frontend URL
        const frontendUrl = `${window.location.origin}/join/${response.data.token}`;
        setInviteLink(frontendUrl);
        setCurrentProject(project);
        setShowInviteModal(true);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate invite');
    }
  };

  const handleRemoveMember = async (projectId, memberId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await api.delete(`/projects/${projectId}/members/${memberId}`, token);
      if (response.success) {
        // Refresh projects
        const updatedResponse = await api.get('/projects', token);
        setProjects(updatedResponse.data);
        setActiveMenu(null);
        toast.success('Member removed successfully');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  const handleApproveRequest = async (projectId, requestId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await api.post(`/projects/${projectId}/requests/${requestId}/approve`, {}, token);
      if (res.success) {
        toast.success('Request approved!');
        // Remove from local state immediately for snappy UI
        setJoinRequests(prev => {
          const updated = { ...prev };
          updated[projectId] = updated[projectId].filter(r => r._id !== requestId);
          return updated;
        });
        fetchProjects(); // Refresh member list in background
      }
    } catch (err) {
      toast.error('Failed to approve request');
    }
  };

  const handleRejectRequest = async (projectId, requestId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await api.post(`/projects/${projectId}/requests/${requestId}/reject`, {}, token);
      if (res.success) {
        toast.success('Request rejected');
        // Remove from local state immediately
        setJoinRequests(prev => {
          const updated = { ...prev };
          updated[projectId] = updated[projectId].filter(r => r._id !== requestId);
          return updated;
        });
      }
    } catch (err) {
      toast.error('Failed to reject request');
    }
  };

  const handleAssignRole = async (projectId, memberId, newRole) => {
    const token = localStorage.getItem('token');
    console.log(`Updating role: Project=${projectId}, Member=${memberId}, NewRole=${newRole}`);
    try {
      const response = await api.put(`/projects/${projectId}/members/${memberId}/role`, { userId: memberId, role: newRole }, token);
      if (response.success) {
        toast.success(`Member role updated to ${newRole}`);
        await fetchProjects(); // Refresh the member list to reflect the new role
        setActiveMenu(null);
      } else {
        toast.error(response.message || 'Failed to update role');
      }
    } catch (err) {
      console.error('Role update error:', err);
      toast.error(err.message || 'Failed to update role');
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', color: 'var(--on-surface)' }}>
      <Sidebar />
      <Header />

      <main className="lg:pl-20" style={{ paddingTop: '80px', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
        <div style={{ padding: 'clamp(16px, 4vw, 40px)', maxWidth: '1440px', margin: '0 auto' }}>
          <header style={{ marginBottom: '64px', borderBottom: '2px solid var(--outline-variant)', paddingBottom: '32px' }}>
             <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px' }}>
               <div>
                 <h1 className="architectural-type" style={{ fontSize: 'clamp(48px, 8vw, 100px)', fontWeight: '900', textTransform: 'uppercase', lineHeight: 1 }}>The Team</h1>
                 <p style={{ color: 'var(--on-surface-variant)', fontSize: 'clamp(14px, 2vw, 18px)', marginTop: '16px' }}>Project-wise collaboration breakdown.</p>
               </div>

               <button 
                onClick={() => {
                  if (projects.length > 0) {
                    setCurrentProject(projects[0]);
                    handleGenerateInvite(projects[0]);
                  }
                }}
                style={{ 
                  backgroundColor: 'var(--primary)', 
                  color: 'var(--on-primary)', 
                  border: 'none', 
                  padding: '16px 32px', 
                  fontSize: '14px', 
                  fontWeight: '900', 
                  textTransform: 'uppercase', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  cursor: 'pointer',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(208, 188, 255, 0.3)'
                }}
                className="hover:scale-105 transition-all active:scale-95"
              >
                <UserPlus size={20} />
                Invite Member
              </button>
             </div>
          </header>

          {loading ? (
            <div style={{ padding: '64px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.5, marginBottom: '24px' }}>
                Syncing Team Data...
              </div>
              <p style={{ fontSize: '14px', opacity: 0.7 }}>Checking project permissions and member list...</p>
            </div>
          ) : (projects || []).length === 0 ? (
            <div style={{ padding: '64px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.5, marginBottom: '32px' }}>
                No projects or team members found.
              </div>
              <button 
                onClick={fetchProjects}
                style={{ 
                  backgroundColor: 'var(--primary)', 
                  color: 'var(--on-primary)', 
                  border: 'none', 
                  padding: '12px 24px', 
                  borderRadius: '8px', 
                  fontWeight: '800', 
                  cursor: 'pointer' 
                }}
              >
                RETRY SYNC
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '64px' }}>
              {(projects || []).map((project) => (
                <section key={project.id || project._id}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ width: '12px', height: '48px', backgroundColor: project.color || 'var(--primary)', flexShrink: 0 }}></div>
                    <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>{project.name}</h2>
                    <span style={{ padding: '4px 12px', backgroundColor: 'var(--surface-container-high)', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                      {(project.members || []).length} {(project.members || []).length === 1 ? 'Member' : 'Members'}
                    </span>
                  </div>

                  {/* Join Requests Section */}
                  {joinRequests[project.id]?.length > 0 && (
                    <div style={{ 
                      marginBottom: '32px', 
                      padding: '24px', 
                      backgroundColor: 'var(--surface-container-high)', 
                      borderLeft: '4px solid var(--primary)', 
                      borderRadius: '0 12px 12px 0' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--primary)' }}>
                        <Clock size={16} />
                        <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Join Requests</h3>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {joinRequests[project.id].map(req => (
                          <div key={req._id} style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap',
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            backgroundColor: 'var(--surface-container-low)', 
                            padding: '16px', 
                            borderRadius: '12px', 
                            border: '1px solid var(--outline-variant)',
                            gap: '16px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '200px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px', flexShrink: 0 }}>
                                {req.userName?.[0]}
                              </div>
                              <div>
                                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', wordBreak: 'break-all' }}>{req.userName}</p>
                                <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', opacity: 0.7, wordBreak: 'break-all' }}>{req.userEmail}</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <button 
                                onClick={() => handleApproveRequest(project.id, req._id)}
                                style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', cursor: 'pointer', flex: '1' }}
                                className="hover:scale-105 transition-all"
                              >
                                APPROVE
                              </button>
                              <button 
                                onClick={() => handleRejectRequest(project.id, req._id)}
                                style={{ backgroundColor: 'transparent', color: '#ff897d', border: '1px solid #ff897d', padding: '10px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', cursor: 'pointer', flex: '1' }}
                                className="hover:scale-105 transition-all"
                              >
                                REJECT
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
                    {(project.members || []).map((member) => (
                      <motion.section 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={`${project.id}-${member.id}`} 
                        className="col-span-12 md:col-span-6 lg:col-span-4 brutalist-border" 
                        style={{ 
                          backgroundColor: 'var(--surface-container-lowest)', 
                          padding: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '20px',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ 
                            width: '64px', 
                            height: '64px', 
                            backgroundColor: 'var(--surface-container-high)', 
                            borderRadius: '50%', // CIRCULAR
                            border: '2px solid var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            fontWeight: '900',
                            color: 'var(--primary)',
                            overflow: 'hidden'
                          }}>
                            {member.avatar ? <img src={member.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : member.name.charAt(0)}
                          </div>
                          {(() => {
                            const myRole = project.members.find(m => m.id === currentUser?.id)?.role;
                            const isMe = member.id === currentUser?.id;
                            // Only show 3 dots if user is Admin/Manager and NOT looking at themselves
                            if ((myRole === 'admin' || myRole === 'manager') && !isMe && member.role !== 'admin') {
                              return (
                                <div style={{ position: 'relative' }}>
                                  <button 
                                    onClick={() => setActiveMenu(activeMenu === `${project.id}-${member.id}` ? null : `${project.id}-${member.id}`)}
                                    style={{ 
                                      backgroundColor: 'transparent', 
                                      border: 'none', 
                                      color: 'var(--on-surface)', 
                                      cursor: 'pointer',
                                      padding: '8px',
                                      borderRadius: '50%'
                                    }}
                                    className="hover:bg-surface-container-high"
                                  >
                                    <MoreHorizontal size={20} />
                                  </button>

                                  {activeMenu === `${project.id}-${member.id}` && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        right: 0, 
                                        top: '40px', 
                                        backgroundColor: 'var(--surface-container-high)', 
                                        border: '2px solid var(--on-surface)',
                                        zIndex: 10,
                                        width: '180px',
                                        boxShadow: '8px 8px 0 var(--on-surface)'
                                      }}>
                                        <button 
                                          onClick={() => window.location.href = `mailto:${member.email}`}
                                          style={{ width: '100%', padding: '12px 16px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--on-surface)' }}
                                          className="hover:bg-primary hover:text-white"
                                        >
                                          Send Email
                                        </button>

                                        {/* Role Management: Only Admins can promote/demote */}
                                        {myRole === 'admin' && (
                                          <>
                                            {member.role === 'member' ? (
                                              <button 
                                                onClick={() => handleAssignRole(project.id, member.id, 'manager')}
                                                style={{ width: '100%', padding: '12px 16px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)' }}
                                                className="hover:bg-primary/10"
                                              >
                                                Promote to Manager
                                              </button>
                                            ) : member.role === 'manager' ? (
                                              <button 
                                                onClick={() => handleAssignRole(project.id, member.id, 'member')}
                                                style={{ width: '100%', padding: '12px 16px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--on-surface)' }}
                                                className="hover:bg-primary/10"
                                              >
                                                Demote to Member
                                              </button>
                                            ) : null}
                                          </>
                                        )}

                                        {/* Remove Action: Admin can remove anyone, Manager can only remove members */}
                                        {((myRole === 'admin') || (myRole === 'manager' && member.role === 'member')) && (
                                          <button 
                                            onClick={() => setConfirmData({ isOpen: true, projectId: project.id, memberId: member.id })}
                                            style={{ width: '100%', padding: '12px 16px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#ff897d' }}
                                            className="hover:bg-red-500/10"
                                          >
                                            Remove From Project
                                          </button>
                                        )}
                                      </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <h3 style={{ fontSize: '24px', fontWeight: '800', textTransform: 'uppercase', lineHeight: 1 }}>{member.name}</h3>
                            {member.role === 'admin' && <Shield size={14} color="var(--primary)" />}
                          </div>
                          <p style={{ color: 'var(--on-surface-variant)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{member.role}</p>
                          <p style={{ color: 'var(--on-surface-variant)', marginTop: '8px', fontSize: '14px', wordBreak: 'break-all', opacity: 0.7 }}>{member.email}</p>
                        </div>

                        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--outline-variant)', paddingTop: '16px' }}>
                           {member.id !== currentUser?.id ? (
                             <button 
                               onClick={() => window.location.href = `mailto:${member.email}`}
                               style={{ 
                                 width: '100%', 
                                 backgroundColor: 'var(--primary)', 
                                 color: 'var(--on-primary)', 
                                 border: 'none', 
                                 padding: '16px', 
                                 fontSize: '12px', 
                                 fontWeight: '800', 
                                 textTransform: 'uppercase', 
                                 cursor: 'pointer', 
                                 borderRadius: '12px',
                                 transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                 boxShadow: '0 4px 12px rgba(208, 188, 255, 0.2)'
                               }} 
                               className="hover:scale-[1.02] active:scale-[0.98] hover:shadow-primary"
                             >
                               Contact Member
                             </button>
                           ) : (
                             <div style={{ padding: '16px', textAlign: 'center', backgroundColor: 'var(--surface-container-high)', borderRadius: '12px', opacity: 0.5 }}>
                               <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>This is you</span>
                             </div>
                           )}
                        </div>
                      </motion.section>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Invite Link Modal */}
        <AnimatePresence>
          {showInviteModal && (
            <div style={{ 
              position: 'fixed', 
              inset: 0, 
              zIndex: 100, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: 'rgba(0,0,0,0.8)', 
              backdropFilter: 'blur(8px)' 
            }}>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{ 
                  width: '95%', 
                  maxWidth: '540px', 
                  backgroundColor: 'var(--surface-container-lowest)', 
                  padding: 'clamp(24px, 5vw, 40px)', 
                  border: '4px solid var(--on-surface)',
                  boxShadow: '16px 16px 0 var(--on-surface)',
                  position: 'relative',
                  maxHeight: '90vh',
                  overflowY: 'auto'
                }}
              >
                <button 
                  onClick={() => setShowInviteModal(false)}
                  style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: 'var(--on-surface)', cursor: 'pointer' }}
                >
                  <X size={24} />
                </button>

                <h2 style={{ fontSize: '32px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>Invite Team Member</h2>
                <p style={{ color: 'var(--on-surface-variant)', marginBottom: '32px' }}>Generate a secure link to invite someone to your project workspace.</p>
                
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '12px', color: 'var(--on-surface-variant)' }}>Target Project</label>
                  <select 
                    value={currentProject?.id}
                    onChange={(e) => {
                      const proj = projects.find(p => p.id === e.target.value);
                      handleGenerateInvite(proj);
                    }}
                    style={{ 
                      width: '100%', 
                      padding: '16px', 
                      backgroundColor: 'var(--surface-container-low)', 
                      border: '2px solid var(--on-surface)', 
                      color: 'var(--on-surface)',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ backgroundColor: 'var(--surface-container-low)', padding: '24px', border: '2px solid var(--on-surface)', marginBottom: '32px', position: 'relative' }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)', marginBottom: '4px', textTransform: 'uppercase' }}>Invite Link</p>
                  <code style={{ fontSize: '12px', wordBreak: 'break-all', opacity: 0.8 }}>{inviteLink}</code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast.success('Link copied to clipboard!');
                    }}
                    style={{ 
                      marginTop: '16px', 
                      width: '100%', 
                      backgroundColor: 'var(--primary)', 
                      color: 'var(--on-primary)', 
                      padding: '16px', 
                      border: 'none', 
                      fontSize: '12px', 
                      fontWeight: '800', 
                      textTransform: 'uppercase', 
                      cursor: 'pointer',
                      borderRadius: '8px'
                    }}
                    className="hover:opacity-90 transition-opacity"
                  >
                    Copy Link
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--on-surface-variant)', fontSize: '12px' }}>
                  <Shield size={16} />
                  <span>Link expires in 7 days. You can remove members later from the project dashboard.</span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ConfirmModal 
          isOpen={confirmData.isOpen}
          onClose={() => setConfirmData({ isOpen: false, projectId: null, memberId: null })}
          onConfirm={() => handleRemoveMember(confirmData.projectId, confirmData.memberId)}
          title="Remove Member?"
          message="Are you sure you want to remove this member from the project? They will lose all access immediately."
          confirmText="Remove"
          type="danger"
        />
      </main>
    </div>
  );
};

export default Team;
