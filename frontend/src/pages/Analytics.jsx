import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { 
  Zap, 
  Activity, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ChevronDown,
  BarChart3,
  PieChart,
  RefreshCw,
  Target
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import api, { API_BASE_URL } from '../services/api';

const Analytics = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    const init = async () => {
      const token = localStorage.getItem('token');
      if (!token || !currentUser) return;

      try {
        const projRes = await api.get('/projects', token);
        if (projRes.success && projRes.data.length > 0) {
          const privilegedProjects = projRes.data.filter(p => {
            const isOwner = p.owner?.id === currentUser.id;
            const member = p.members?.find(m => m.id === currentUser.id);
            const isManagerOrAdmin = member?.role === 'admin' || member?.role === 'manager';
            return isOwner || isManagerOrAdmin;
          });

          if (privilegedProjects.length > 0) {
            setProjects(privilegedProjects);
            setSelectedProjectId(privilegedProjects[0].id);
            fetchAnalytics(privilegedProjects[0].id);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to init analytics', err);
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchAnalytics = async (projectId) => {
    setIsRefreshing(true);
    const token = localStorage.getItem('token');
    try {
      const response = await api.get(`/projects/${projectId}/analytics`, token);
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (analytics) {
      const targets = document.querySelectorAll('.analytics-reveal');
      if (targets.length > 0) {
        gsap.fromTo(targets, 
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power4.out', delay: 0.2 }
        );
      }
    }
  }, [analytics]);

  useEffect(() => {
    if (!selectedProjectId) return;

    // Real-time synchronization for analytics
    const eventSource = new EventSource(`${API_BASE_URL}/events/${selectedProjectId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (['task_created', 'task_updated', 'task_deleted'].includes(data.type)) {
          console.log('Real-time event detected, refreshing analytics...');
          fetchAnalytics(selectedProjectId);
        }
      } catch (err) {
        console.error('Error parsing SSE message', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [selectedProjectId]);

  const handleProjectChange = (e) => {
    const id = e.target.value;
    setSelectedProjectId(id);
    fetchAnalytics(id);
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', color: 'var(--on-surface)' }}>
        <Sidebar />
        <Header />
        <main className="lg:pl-20" style={{ paddingTop: '80px', minHeight: '100vh' }}>
          <div style={{ padding: 'clamp(16px, 4vw, 40px)', maxWidth: '1440px', margin: '0 auto' }}>
            {/* Skeleton Header */}
            <div style={{ marginBottom: '48px', borderBottom: '4px solid var(--surface-variant)', paddingBottom: '32px' }} className="animate-pulse">
              <div style={{ width: '300px', height: '64px', backgroundColor: 'var(--surface-container-high)', marginBottom: '16px' }} />
              <div style={{ width: '200px', height: '20px', backgroundColor: 'var(--surface-container-high)' }} />
            </div>

            {/* Skeleton Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '48px' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="brutalist-border animate-pulse" style={{ padding: '24px', backgroundColor: 'var(--surface-container-lowest)', height: '160px' }}>
                  <div style={{ width: '80px', height: '16px', backgroundColor: 'var(--surface-container-high)', marginBottom: '24px' }} />
                  <div style={{ width: '60px', height: '48px', backgroundColor: 'var(--surface-container-high)' }} />
                </div>
              ))}
            </div>

            {/* Skeleton Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
              <div className="col-span-12 lg:col-span-8 brutalist-border animate-pulse" style={{ height: '400px', backgroundColor: 'var(--surface-container-low)', padding: '32px' }}>
                <div style={{ width: '200px', height: '32px', backgroundColor: 'var(--surface-container-high)', marginBottom: '40px' }} />
                <div style={{ width: '100%', height: '64px', backgroundColor: 'var(--surface-container-high)', marginBottom: '40px' }} />
                <div style={{ display: 'flex', gap: '24px' }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} style={{ flex: 1, height: '80px', backgroundColor: 'var(--surface-container-high)' }} />
                  ))}
                </div>
              </div>
              <div className="col-span-12 lg:col-span-4 brutalist-border animate-pulse" style={{ height: '400px', backgroundColor: 'var(--surface-container-lowest)', padding: '32px' }}>
                <div style={{ width: '150px', height: '24px', backgroundColor: 'var(--surface-container-high)', marginBottom: '40px' }} />
                <div style={{ width: '100%', height: '200px', backgroundColor: 'var(--surface-container-high)' }} />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const statusBreakdown = analytics?.statusBreakdown || {};
  const priorityBreakdown = analytics?.priorityBreakdown || {};
  const memberWorkload = analytics?.memberWorkload || [];

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
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px', marginBottom: '48px', borderBottom: '4px solid var(--surface-variant)', paddingBottom: '32px' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: '900', textTransform: 'uppercase', lineHeight: 0.9, letterSpacing: '-0.04em', margin: 0 }}>Analytics</h1>
              <p style={{ color: 'var(--on-surface-variant)', fontWeight: '600', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="var(--primary)" />
                REAL-TIME PROJECT PERFORMANCE METRICS
              </p>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div className="brutalist-border" style={{ backgroundColor: 'var(--surface-container-low)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)' }}>Select Project</span>
                <select 
                  value={selectedProjectId || ''} 
                  onChange={handleProjectChange}
                  style={{ backgroundColor: 'transparent', color: 'var(--on-surface)', border: 'none', outline: 'none', fontWeight: '700', textTransform: 'uppercase', fontSize: '14px', cursor: 'pointer' }}
                >
                  {projects.map(p => <option key={p.id} value={p.id} style={{ backgroundColor: 'var(--surface-container-high)' }}>{p.name}</option>)}
                </select>
              </div>
              <button 
                onClick={() => selectedProjectId && fetchAnalytics(selectedProjectId)}
                disabled={isRefreshing}
                style={{ 
                  backgroundColor: 'var(--primary)', 
                  color: 'var(--on-primary)', 
                  width: '48px', 
                  height: '48px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer'
                }}
                className="brutalist-button"
              >
                <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {!analytics ? (
            <div style={{ textAlign: 'center', padding: '80px', opacity: 0.5 }}>
              <BarChart3 size={64} style={{ margin: '0 auto 24px' }} />
              <h2 style={{ textTransform: 'uppercase' }}>No Data Available</h2>
              <p>Select a project with tasks to view analytics.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
              
              {/* Key Metrics Grid */}
              <div className="col-span-12 md:grid-cols-4 analytics-reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', gridColumn: 'span 12', opacity: 0 }}>
                <div className="brutalist-border" style={{ padding: '24px', backgroundColor: 'var(--surface-container-lowest)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Total Tasks</span>
                    <Zap size={20} color="var(--primary)" />
                  </div>
                  <div style={{ fontSize: '48px', fontWeight: '900' }}>{summary.total}</div>
                  <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--surface-container-high)', marginTop: '16px' }}>
                    <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--primary)' }}></div>
                  </div>
                </div>

                <div className="brutalist-border" style={{ padding: '24px', backgroundColor: 'var(--surface-container-lowest)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Completion Rate</span>
                    <Target size={20} color="var(--secondary)" />
                  </div>
                  <div style={{ fontSize: '48px', fontWeight: '900' }}>{summary.completionRate}%</div>
                  <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--surface-container-high)', marginTop: '16px' }}>
                    <div style={{ width: `${summary.completionRate}%`, height: '100%', backgroundColor: 'var(--secondary)' }}></div>
                  </div>
                </div>

                <div className="brutalist-border" style={{ padding: '24px', backgroundColor: 'var(--surface-container-lowest)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Overdue Tasks</span>
                    <AlertCircle size={20} color={summary.overdue > 0 ? 'var(--error)' : 'var(--on-surface-variant)'} />
                  </div>
                  <div style={{ fontSize: '48px', fontWeight: '900', color: summary.overdue > 0 ? 'var(--error)' : 'inherit' }}>{summary.overdue}</div>
                  <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--surface-container-high)', marginTop: '16px' }}>
                    <div style={{ width: `${Math.min(100, (summary.overdue / summary.total) * 100) || 0}%`, height: '100%', backgroundColor: 'var(--error)' }}></div>
                  </div>
                </div>

                <div className="brutalist-border" style={{ padding: '24px', backgroundColor: 'var(--surface-container-lowest)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>Team Size</span>
                    <Users size={20} color="var(--tertiary)" />
                  </div>
                  <div style={{ fontSize: '48px', fontWeight: '900' }}>{summary.memberCount}</div>
                  <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--surface-container-high)', marginTop: '16px' }}>
                    <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--tertiary)' }}></div>
                  </div>
                </div>
              </div>

              {/* Status Breakdown & Priority */}
              <div className="col-span-12 lg:col-span-8 brutalist-border analytics-reveal" style={{ padding: '32px', backgroundColor: 'var(--surface-container-low)', opacity: 0 }}>
                <h3 style={{ fontSize: '24px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <PieChart size={24} color="var(--primary)" />
                  Status Distribution
                </h3>
                
                <div style={{ marginBottom: '48px' }}>
                  <div style={{ display: 'flex', height: '64px', width: '100%', marginBottom: '24px', border: '2px solid var(--surface-variant)' }}>
                    <div style={{ width: `${(statusBreakdown.done / summary.total) * 100 || 0}%`, backgroundColor: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', color: 'var(--on-secondary)' }}>
                      {statusBreakdown.done > 0 && 'DONE'}
                    </div>
                    <div style={{ width: `${(statusBreakdown.in_progress / summary.total) * 100 || 0}%`, backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', color: 'var(--on-primary)' }}>
                      {statusBreakdown.in_progress > 0 && 'ACTIVE'}
                    </div>
                    <div style={{ width: `${(statusBreakdown.todo / summary.total) * 100 || 0}%`, backgroundColor: 'var(--surface-container-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', color: 'var(--on-surface-variant)' }}>
                      {statusBreakdown.todo > 0 && 'TODO'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--secondary)', fontSize: '24px', fontWeight: '900' }}>{statusBreakdown.done}</div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6 }}>Completed</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--primary)', fontSize: '24px', fontWeight: '900' }}>{statusBreakdown.in_progress}</div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6 }}>In Progress</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--on-surface-variant)', fontSize: '24px', fontWeight: '900' }}>{statusBreakdown.todo}</div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6 }}>To Do</div>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '2px solid var(--surface-variant)', paddingTop: '32px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '24px' }}>Priority Breakdown</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    {Object.entries(priorityBreakdown).map(([p, count]) => (
                      <div key={p} className="brutalist-border" style={{ flex: '1 1 150px', padding: '16px', backgroundColor: 'var(--surface-container-lowest)' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '800', color: p === 'urgent' ? 'var(--error)' : 'var(--on-surface-variant)' }}>{p}</span>
                        <div style={{ fontSize: '24px', fontWeight: '900' }}>{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Weekly Activity (Mock Visualization) */}
              <div className="col-span-12 lg:col-span-4 brutalist-border analytics-reveal" style={{ padding: '32px', backgroundColor: 'var(--surface-container-lowest)', display: 'flex', flexDirection: 'column', opacity: 0 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <TrendingUp size={20} color="var(--primary)" />
                  Velocity
                </h3>
                
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px', paddingBottom: '24px', borderBottom: '2px solid var(--surface-variant)' }}>
                  {Object.values(analytics.weeklyCompleted).map((val, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '100%', backgroundColor: 'var(--primary)', height: `${Math.max(10, val * 20)}px`, opacity: 0.8 + (i * 0.05) }}></div>
                      <span style={{ fontSize: '8px', opacity: 0.5 }}>W{i+1}</span>
                    </div>
                  ))}
                </div>
                
                <div style={{ marginTop: '24px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                    Your team is currently completing an average of <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{(summary.done / 4).toFixed(1)} tasks</span> per week. 
                    {summary.overdue > 0 ? ` Focus on resolving the ${summary.overdue} overdue items to improve velocity.` : ' Keep up the great pace!'}
                  </p>
                </div>
              </div>

              {/* Member Workload Section */}
              <div className="col-span-12 analytics-reveal" style={{ marginTop: '24px', opacity: 0 }}>
                <h3 style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '32px', borderLeft: '8px solid var(--primary)', paddingLeft: '16px' }}>Team Workload</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                  {memberWorkload.length === 0 ? (
                    <p style={{ opacity: 0.5, fontStyle: 'italic' }}>No workload data for members yet.</p>
                  ) : (
                    memberWorkload.map((member, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="brutalist-border" 
                        style={{ padding: '24px', backgroundColor: 'var(--surface-container-low)' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--surface-container-high)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'var(--primary)' }}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 style={{ fontSize: '16px', fontWeight: '800', textTransform: 'uppercase' }}>{member.name}</h4>
                              <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>PROJECT MEMBER</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '18px', fontWeight: '900' }}>{Math.round((member.done / member.total) * 100 || 0)}%</div>
                            <div style={{ fontSize: '8px', opacity: 0.5 }}>COMPLETION</div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                          <div style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: '900' }}>{member.total}</div>
                            <div style={{ fontSize: '8px', opacity: 0.5 }}>TOTAL</div>
                          </div>
                          <div style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--secondary)' }}>{member.done}</div>
                            <div style={{ fontSize: '8px', opacity: 0.5 }}>DONE</div>
                          </div>
                          <div style={{ backgroundColor: 'var(--surface-container-lowest)', padding: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: '900', color: member.overdue > 0 ? 'var(--error)' : 'inherit' }}>{member.overdue}</div>
                            <div style={{ fontSize: '8px', opacity: 0.5 }}>LATE</div>
                          </div>
                        </div>

                        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--surface-container-high)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{ width: `${(member.done / member.total) * 100 || 0}%`, height: '100%', backgroundColor: 'var(--primary)' }}></div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Analytics;
