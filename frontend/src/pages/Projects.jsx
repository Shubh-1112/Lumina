import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { 
  Plus, 
  Search, 
  ArrowRight, 
  Group, 
  Package, 
  Zap, 
  History,
  X
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import api, { API_BASE_URL } from '../services/api';

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', color: '#6b38d4' });
  const [submitting, setSubmitting] = useState(false);

  const currentUser = (() => {
    try {
      const u = localStorage.getItem('user');
      if (!u) return null;
      return JSON.parse(u);
    } catch (e) {
      return null;
    }
  })();

  useEffect(() => {
    fetchProjects();
    
    // Set up SSE for real-time updates
    if (currentUser?.id) {
      const eventSource = new EventSource(`${API_BASE_URL}/events/user/${currentUser.id}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'project_refresh') {
            fetchProjects();
          }
        } catch (err) {
          console.error('Error parsing SSE message', err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
      };

      return () => eventSource.close();
    }
  }, [currentUser?.id]);

  const fetchProjects = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login?redirect=/projects';
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/projects', token);
      if (response.success) {
        setProjects(response.data);
        // Staggered entrance after data loads
        setTimeout(() => {
          gsap.fromTo('.project-card-animate', 
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power4.out' }
          );
        }, 0);
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem('token');

    try {
      const response = await api.post('/projects', newProject, token);
      if (response.success) {
        setProjects([response.data, ...projects]);
        setShowNewProjectModal(false);
        setNewProject({ name: '', description: '', color: '#6b38d4' });
      }
    } catch (err) {
      console.error('Failed to create project', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', color: 'var(--on-surface)', fontFamily: 'var(--font-headline)' }}>
      <Sidebar />
      <Header />
      
      <main className="lg:pl-20" style={{ 
        paddingTop: '80px', 
        minHeight: '100vh' 
      }}>
        {/* Hero Header */}
        <section style={{ 
          padding: 'clamp(24px, 6vw, 64px)', 
          borderBottom: '8px solid var(--on-surface)', 
          backgroundColor: 'var(--surface-bright)',
          color: 'var(--on-surface)'
        }}>
          <div style={{ display: 'flex', width: '100%', gap: '24px' }} className="flex-col md:flex-row justify-between items-start md:items-end">
            <div>
              <h2 style={{ fontSize: 'clamp(48px, 10vw, 100px)', fontWeight: '900', lineHeight: 0.9, tracking: '-0.05em', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--primary)' }}>Projects</h2>
              <p style={{ fontSize: 'clamp(16px, 3vw, 24px)', fontWeight: '700', color: 'var(--on-surface)', textTransform: 'uppercase', tracking: '0.2em' }}>Manage your work categories</p>
            </div>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-end', 
              gap: '8px',
              alignSelf: 'flex-end',
              textAlign: 'right'
            }}>
              <span style={{ fontSize: 'clamp(48px, 10vw, 80px)', fontWeight: '900', color: 'var(--secondary)', lineHeight: 1 }}>
                {projects.length.toString().padStart(2, '0')}
              </span>
              <span style={{ 
                fontSize: '10px', 
                fontWeight: '800', 
                textTransform: 'uppercase', 
                tracking: '0.1em', 
                backgroundColor: 'var(--primary)', 
                color: 'var(--on-primary)', 
                padding: '6px 14px', 
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(208, 188, 255, 0.2)'
              }}>
                Total Projects
              </span>
            </div>
          </div>
        </section>

        {/* The Project List */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ padding: 'clamp(24px, 6vw, 64px)', borderBottom: '8px solid var(--on-surface)', display: 'flex', justifyContent: 'space-between', gap: '32px' }} className="animate-pulse">
                  <div style={{ flex: 1 }}>
                    <div style={{ width: '80px', height: '24px', backgroundColor: 'var(--surface-container-high)', marginBottom: '16px' }} />
                    <div style={{ width: '60%', height: '64px', backgroundColor: 'var(--surface-container-high)', marginBottom: '16px' }} />
                    <div style={{ width: '40%', height: '24px', backgroundColor: 'var(--surface-container-high)' }} />
                  </div>
                  <div style={{ width: '120px', height: '120px', backgroundColor: 'var(--surface-container-high)' }} />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div style={{ padding: '64px', fontSize: '24px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.5 }}>No projects found. Create one to get started!</div>
          ) : (
            projects.map((proj) => {
              // Calculate completion: Completed = 100%, In Progress = 50%
              const totalPoints = (proj.completedTaskCount * 1.0) + (proj.inProgressTaskCount * 0.5);
              const completion = proj.taskCount > 0 
                ? Math.round((totalPoints / proj.taskCount) * 100) 
                : 0;

              let status = 'In Progress';
              let statusColor = '#ec4899'; // Vibrant Pink for In Progress
              
              if (completion === 100) { 
                status = 'Finished'; 
                statusColor = '#10b981'; // Emerald for Finished
              } else if (proj.completedTaskCount === 0 && (proj.inProgressTaskCount || 0) === 0) { 
                status = 'Just Started'; 
                statusColor = '#38bdf8'; // Sky Blue for Just Started
              } else {
                status = 'In Progress';
                statusColor = '#f59e0b'; // Amber for In Progress
              }

              return (
                <article 
                  key={proj.id} 
                  onClick={() => navigate(`/projects/${proj.id}`)}
                  style={{ 
                    width: '100%', 
                    borderBottom: '8px solid var(--on-surface)', 
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    opacity: 0 // Initial state for GSAP
                  }} 
                  className="group hover:bg-on-surface hover:text-surface-bright project-card-animate"
                >
                  <div style={{ padding: 'clamp(24px, 6vw, 64px)', display: 'flex', gap: '32px' }} className="flex-col lg:flex-row items-start lg:items-center justify-between">
                    <div style={{ flex: 1, width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                        <span style={{ padding: '4px 10px', backgroundColor: statusColor, color: '#fff', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', borderRadius: '4px', letterSpacing: '0.05em' }}>{status}</span>
                      </div>
                      <h3 style={{ fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: '700', lineHeight: 1, tracking: '-0.02em', textTransform: 'uppercase', marginBottom: '12px' }}>{proj.name}</h3>
                      <p style={{ fontSize: '16px', maxWidth: '600px', opacity: 0.6, lineHeight: 1.6 }}>{proj.description || 'Add a description for this project.'}</p>
                    </div>

                    {/* Desktop: Separated via contents, Mobile: Grouped */}
                    <div className="flex flex-col lg:contents items-start lg:items-center gap-40 w-full lg:w-auto justify-between lg:justify-end">
                      <div className="flex flex-col items-start lg:items-end lg:mx-auto">
                        <span style={{ fontSize: 'clamp(40px, 8vw, 64px)', fontWeight: '900', lineHeight: 1 }}>{completion}%</span>
                        <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.1em' }}>Progress</span>
                      </div>

                      <div className="w-full lg:w-auto">
                        <div className="open-project-btn">
                          Open Project
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Footer Stats */}
        <section style={{ padding: 'clamp(24px, 6vw, 64px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', borderBottom: '8px solid var(--on-surface)', backgroundColor: 'var(--surface-container)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--outline)' }}>Work Status</span>
            <p style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '900', textTransform: 'uppercase' }}>Active</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--outline)' }}>Tasks Done</span>
            <p style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '900', textTransform: 'uppercase' }}>{projects.reduce((acc, p) => acc + (p.completedTaskCount || 0), 0)}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--outline)' }}>Team Members</span>
            <p style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '900', textTransform: 'uppercase' }}>
              {new Set(projects.flatMap(p => p.members?.map(m => m.id) || [])).size} Users
            </p>
          </div>
          <div className="flex items-center justify-start md:justify-end">
            <button 
              onClick={() => setShowNewProjectModal(true)}
              style={{ 
                width: '100%', 
                md: 'auto', 
                background: 'linear-gradient(135deg, var(--primary) 0%, #9333ea 100%)', 
                color: '#ffffff', 
                padding: '18px 48px', 
                fontSize: '14px', 
                fontWeight: '800', 
                textTransform: 'uppercase', 
                border: 'none', 
                borderRadius: '12px',
                cursor: 'pointer', 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 10px 20px -5px rgba(107, 56, 212, 0.5)'
              }} 
              className="hover:scale-105 hover:shadow-[0_15px_30px_-5px_rgba(107,56,212,0.6)] w-full md:w-auto"
            >
              Add New Project
            </button>
          </div>
        </section>

        {/* Simple Bottom Bar */}
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--on-surface)', color: 'var(--surface-bright)' }}>
          <span style={{ fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', tracking: '0.2em' }}>Lumina Task Manager // Version 1.0</span>
          <span style={{ fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', tracking: '0.1em' }}>© 2024 Lumina</span>
        </div>
      </main>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewProjectModal && (
          <div 
            onClick={() => setShowNewProjectModal(false)}
            style={{ 
              position: 'fixed', 
              inset: 0, 
              zIndex: 100, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: 'rgba(0,0,0,0.6)', 
              backdropFilter: 'blur(12px)',
              cursor: 'pointer'
            }}
          >
            <motion.div 
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="no-scrollbar"
              style={{ 
                width: '100%', 
                maxWidth: '540px', 
                backgroundColor: 'var(--surface-container-high)', 
                backdropFilter: 'blur(24px)',
                borderRadius: '32px',
                border: '1px solid var(--outline-variant)', 
                padding: 'clamp(24px, 5vw, 40px)', 
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <button 
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                style={{ 
                  position: 'absolute', 
                  top: '24px', 
                  right: '24px', 
                  background: 'var(--surface-container-low)', 
                  border: 'none', 
                  color: 'var(--on-surface)', 
                  cursor: 'pointer',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s',
                  zIndex: 10
                }}
                className="hover:bg-surface-container-high"
              >
                <X size={20} />
              </button>

              <div style={{ marginBottom: '32px', position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  top: '-40px', 
                  left: '-40px', 
                  right: '-40px', 
                  height: '100px', 
                  background: 'linear-gradient(to bottom, rgba(107, 56, 212, 0.15), transparent)', 
                  borderRadius: '32px 32px 0 0',
                  zIndex: -1 
                }}></div>
                <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--on-surface)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Package size={32} color="var(--primary)" />
                  Create New Project
                </h2>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', marginLeft: '44px' }}>Define your next big milestone and start tracking.</p>
              </div>
              
              <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface-variant)', marginLeft: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>Project Title</label>
                  <input 
                    style={{ 
                      width: '100%', 
                      padding: '16px 20px', 
                      backgroundColor: 'var(--surface-container-low)', 
                      border: '1px solid var(--outline-variant)', 
                      borderRadius: '16px',
                      color: 'var(--on-surface)', 
                      outline: 'none',
                      fontSize: '15px',
                      transition: 'all 0.2s'
                    }}
                    placeholder="e.g. Website Redesign"
                    required
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface-variant)', marginLeft: '4px' }}>Description</label>
                  <textarea 
                    style={{ 
                      width: '100%', 
                      padding: '16px 20px', 
                      backgroundColor: 'var(--surface-container-low)', 
                      border: '1px solid var(--outline-variant)', 
                      borderRadius: '16px',
                      color: 'var(--on-surface)', 
                      outline: 'none', 
                      minHeight: '120px',
                      fontSize: '15px',
                      resize: 'none',
                      transition: 'all 0.2s'
                    }}
                    placeholder="Briefly outline the project scope..."
                    value={newProject.description}
                    onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--outline-variant)'}
                  />
                </div>
                <button 
                  disabled={submitting}
                  style={{ 
                    backgroundColor: 'var(--primary)', 
                    color: 'var(--on-primary)', 
                    padding: '18px', 
                    fontSize: '16px', 
                    fontWeight: '700', 
                    borderRadius: '16px',
                    border: 'none', 
                    cursor: 'pointer', 
                    marginTop: '8px',
                    boxShadow: '0 10px 20px -5px rgba(107, 56, 212, 0.4)',
                    transition: 'all 0.2s'
                  }}
                  className="hover:scale-[1.02] active:scale-[0.98]"
                >
                  {submitting ? 'Initializing...' : 'Launch Project'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Projects;
