import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import { 
  Layers, 
  CheckCircle2, 
  Zap, 
  Cpu, 
  ArrowRight, 
  Calendar, 
  Plus,
  X
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import api, { API_BASE_URL } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeTasks: 0,
    completedTasks: 0,
    systemLoad: '0%'
  });
  const [myTasks, setMyTasks] = useState([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', color: '#6b38d4' });
  const [newTask, setNewTask] = useState({ title: '', project_id: '', description: '', priority: 'medium', dueDate: '', assignedTo: '' });
  const [submitting, setSubmitting] = useState(false);
  const mainRef = useRef(null);
  const statsRef = useRef(null);

  useEffect(() => {
    if (!loading) {
      const tl = gsap.timeline();
      
      tl.fromTo('.dashboard-title', 
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power4.out' }
      )
      .fromTo('.stat-card',
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)' },
        '-=0.4'
      )
      .fromTo('.project-row',
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' },
        '-=0.3'
      );
    }
  }, [loading]);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const response = await api.get('/projects', token);
      if (response.success) {
        setProjects(response.data);
        
        // Calculate stats
        const totalTasks = response.data.reduce((acc, proj) => acc + (proj.taskCount || 0), 0);
        const doneTasks = response.data.reduce((acc, proj) => acc + (proj.completedTaskCount || 0), 0);
        
        setStats({
          totalProjects: response.data.length,
          activeTasks: totalTasks - doneTasks,
          completedTasks: doneTasks,
          systemLoad: 'Excellent'
        });
      }

      // Fetch personal tasks
      const tasksResponse = await api.get('/tasks/me', token);
      if (tasksResponse.success && Array.isArray(tasksResponse.data)) {
        // Show all active tasks assigned to me, prioritizing those with due dates
        const myActiveTasks = tasksResponse.data
          .filter(t => t.status !== 'done')
          .sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
          })
          .slice(0, 10); // Increased limit to 10 tasks
        setMyTasks(myActiveTasks);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

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
    fetchDashboardData();
    
    // Set up SSE for real-time updates
    if (currentUser?.id) {
      const eventSource = new EventSource(`${API_BASE_URL}/events/user/${currentUser.id}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'project_refresh') {
            fetchDashboardData();
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
        // Refresh stats
        const totalTasks = [response.data, ...projects].reduce((acc, proj) => acc + (proj.taskCount || 0), 0);
        const doneTasks = [response.data, ...projects].reduce((acc, proj) => acc + (proj.completedTaskCount || 0), 0);
        setStats({
          totalProjects: projects.length + 1,
          activeTasks: totalTasks - doneTasks,
          completedTasks: doneTasks,
          systemLoad: 'Excellent'
        });
        toast.success('Project created successfully!');
      }
    } catch (err) {
      console.error('Failed to create project', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.project_id) {
      toast.error('Please select a project');
      return;
    }
    setSubmitting(true);
    const token = localStorage.getItem('token');

    try {
      const taskData = {
        title: newTask.title.trim(),
        description: (newTask.description || '').trim(),
        priority: newTask.priority,
        status: 'todo',
        assignedTo: newTask.assignedTo || null
      };

      if (newTask.dueDate && newTask.dueDate.trim() !== '') {
        taskData.dueDate = `${newTask.dueDate}T00:00:00`;
      }

      console.log('Attempting to create task with payload:', taskData);
      const response = await api.post(`/projects/${newTask.project_id}/tasks`, taskData, token);
      
      if (response.success) {
        setShowNewTaskModal(false);
        setNewTask({ title: '', project_id: '', description: '', priority: 'medium', dueDate: '', assignedTo: '' });
        // Refresh project stats in list
        const updatedProjects = projects.map(p => 
          p.id === newTask.project_id 
            ? { ...p, taskCount: (p.taskCount || 0) + 1 } 
            : p
        );
        setProjects(updatedProjects);
        setStats(prev => ({ ...prev, activeTasks: prev.activeTasks + 1 }));
        toast.success('Task added successfully!');
      } else {
        let errorMsg = response.message || 'Failed to create task';
        if (response.detail && Array.isArray(response.detail)) {
          errorMsg = response.detail.map(d => `${d.loc[d.loc.length - 1]}: ${d.msg}`).join('\n');
        }
        toast.error(errorMsg);
        console.error('Task creation failed:', response);
      }
    } catch (err) {
      console.error('Failed to create task', err);
      toast.error('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', color: 'var(--on-surface)' }}>
      <Sidebar />
      <Header />
      
      
      <main className="lg:pl-20" style={{ 
        paddingTop: '80px', 
        minHeight: '100vh',
        backgroundColor: 'var(--background)'
      }}>
        <div style={{ padding: 'clamp(16px, 4vw, 40px)', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'clamp(24px, 5vw, 48px)' }}>
          
          {/* Hero Greeting */}
          <section className="dashboard-title" style={{ marginTop: '32px' }}>
            <h2 style={{ fontSize: 'clamp(48px, 8vw, 120px)', fontWeight: '900', textTransform: 'uppercase', lineHeight: 0.9, letterSpacing: '-0.04em', margin: 0 }}>Hello there.</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', marginTop: '16px', borderBottom: '4px solid var(--surface-variant)', paddingBottom: '24px' }}>
              <span style={{ fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: '600', color: 'var(--on-surface-variant)' }}>EVERYTHING IS RUNNING SMOOTHLY</span>
              <span className="animate-pulse" style={{ width: '16px', height: '16px', backgroundColor: 'var(--primary)', borderRadius: '50%' }}></span>
            </div>
          </section>

          {/* Quick Stats */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            <div className="brutalist-border stat-card" style={{ padding: '24px', backgroundColor: 'var(--surface-container-lowest)', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', tracking: '0.1em', color: 'var(--on-surface-variant)' }}>Total Projects</span>
                <Layers size={20} color="var(--on-surface-variant)" />
              </div>
              <div style={{ fontSize: '48px', fontWeight: '900' }}>{loading ? '...' : stats.totalProjects}</div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--primary)', fontWeight: '500' }}>Live Projects</div>
            </div>
            <div className="brutalist-border stat-card" style={{ padding: '24px', backgroundColor: 'var(--surface-container-lowest)', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', tracking: '0.1em', color: 'var(--on-surface-variant)' }}>Pending Tasks</span>
                <CheckCircle2 size={20} color="var(--on-surface-variant)" />
              </div>
              <div style={{ fontSize: '48px', fontWeight: '900' }}>{loading ? '...' : stats.activeTasks}</div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--primary)', fontWeight: '500' }}>To do list</div>
            </div>
            <div className="brutalist-border stat-card" style={{ padding: '24px', backgroundColor: 'var(--surface-container-lowest)', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', tracking: '0.1em', color: 'var(--on-surface-variant)' }}>Completed Tasks</span>
                <Zap size={20} color="var(--on-surface-variant)" />
              </div>
              <div style={{ fontSize: '48px', fontWeight: '900' }}>{loading ? '...' : stats.completedTasks}</div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--primary)', fontWeight: '500' }}>Total progress</div>
            </div>
            <div className="brutalist-border stat-card" style={{ padding: '24px', backgroundColor: 'var(--surface-container-lowest)', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', tracking: '0.1em', color: 'var(--on-surface-variant)' }}>Productivity</span>
                <Cpu size={20} color="var(--on-surface-variant)" />
              </div>
              <div style={{ fontSize: '48px', fontWeight: '900' }}>
                {loading ? '...' : (stats.completedTasks + stats.activeTasks > 0 
                  ? `${Math.round((stats.completedTasks / (stats.completedTasks + stats.activeTasks)) * 100)}%` 
                  : '0%')}
              </div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--primary)', fontWeight: '500' }}>Completion Rate</div>
            </div>
          </section>

          {/* Main Layout: Bento Grid Content */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', paddingBottom: '48px' }}>
            {/* Recent Projects */}
            <div className="col-span-12 lg:col-span-8 brutalist-border" style={{ padding: '32px', backgroundColor: 'var(--surface-container-lowest)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                  <h3 style={{ fontSize: '32px', fontWeight: '700', color: 'var(--on-surface)' }}>My Projects</h3>
                  <p style={{ color: 'var(--on-surface-variant)' }}>Tasks you are currently working on</p>
                </div>
                <button 
                  onClick={() => navigate('/projects')}
                  style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', textDecoration: 'underline', textTransform: 'uppercase', border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  View All
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loading ? (
                  <p>Loading projects...</p>
                ) : projects.length === 0 ? (
                  <p style={{ opacity: 0.5 }}>You haven't created any projects yet.</p>
                ) : (
                  projects.slice(0, 5).map((proj, index) => (
                    <div 
                      key={proj.id} 
                      onClick={() => navigate(`/projects/${proj.id}`)}
                      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', padding: '16px', borderBottom: '1px solid var(--surface-variant)', transition: 'all 0.2s' }} 
                      className="group hover:bg-surface-container cursor-pointer project-row"
                    >
                      <div style={{ flex: '0 0 32px', fontSize: '12px', fontWeight: '700', color: 'var(--outline)', textTransform: 'uppercase' }}>0{index + 1}</div>
                      <div style={{ flex: '1 1 200px' }}>
                        <h4 style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: '600', transition: 'transform 0.2s' }} className="group-hover:translate-x-2">{proj.name}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>{proj.description || 'Project details'}</p>
                      </div>
                      <div style={{ flex: '1 1 150px', minWidth: '150px' }}>
                        <div style={{ width: '100%', backgroundColor: 'var(--surface-container-high)', height: '8px', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{ 
                            backgroundColor: 'var(--primary)', 
                            height: '100%', 
                            width: `${Math.round(((proj.completedTaskCount * 1.0 + (proj.inProgressTaskCount || 0) * 0.5) / proj.taskCount) * 100) || 0}%` 
                          }}></div>
                        </div>
                        <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '8px', display: 'block' }}>
                          {proj.completedTaskCount || 0}/{proj.taskCount || 0} Done
                        </span>
                      </div>
                      <div style={{ flex: '0 0 24px', textAlign: 'right' }}>
                        <ArrowRight size={24} color="var(--on-surface-variant)" className="group-hover:text-primary" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Side Info: Upcoming Deadlines */}
            <div className="col-span-12 lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="brutalist-border" style={{ padding: '24px', backgroundColor: 'var(--surface-container-low)', flexGrow: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', tracking: '0.1em' }}>Upcoming</h3>
                  <Calendar size={20} color="var(--on-surface-variant)" />
                </div>
                <div 
                  className="brutalist-scrollbar" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '24px', 
                    maxHeight: '380px', 
                    overflowY: 'auto',
                    paddingRight: '12px'
                  }}
                >
                  {myTasks.length === 0 ? (
                    <p style={{ fontSize: '13px', opacity: 0.5, fontStyle: 'italic' }}>No upcoming deadlines scheduled.</p>
                  ) : (
                    myTasks.map((task) => {
                      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                      const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done';
                      const formattedDate = dueDate 
                        ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'No Deadline';
                      
                      // Priority-based colors
                      let priorityColor = 'var(--primary)';
                      if (task.priority === 'urgent') priorityColor = '#ef4444'; // Red
                      else if (task.priority === 'high') priorityColor = '#f97316'; // Orange
                      
                      const borderColor = isOverdue ? '#ef4444' : priorityColor;
                      
                      return (
                        <div key={task.id} style={{ borderLeft: `4px solid ${borderColor}`, paddingLeft: '16px', paddingY: '4px' }}>
                          <p style={{ fontSize: '10px', fontWeight: '700', color: borderColor, textTransform: 'uppercase', marginBottom: '4px' }}>
                            {task.projectName} • {formattedDate} {isOverdue ? '(OVERDUE)' : ''}
                          </p>
                          <h4 style={{ fontSize: '18px', fontWeight: '700', lineHeight: 1.2, textTransform: 'uppercase' }}>{task.title}</h4>
                          <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '4px', opacity: 0.7 }}>
                            <span style={{ color: priorityColor, fontWeight: '800' }}>{task.priority.toUpperCase()}</span> PRIORITY
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
                 <button 
                  onClick={() => {
                    setLoading(true);
                    fetchDashboardData();
                    toast.success('Dashboard Synced', { icon: '🔄' });
                  }}
                  className="brutalist-border hover:bg-surface-container-high hover:text-on-surface" 
                  style={{ width: '100%', marginTop: '32px', padding: '12px', backgroundColor: 'transparent', color: 'var(--on-surface-variant)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  {loading ? 'Syncing...' : 'Sync Calendar'}
                </button>
              </div>

              {/* Visual Accent Block */}
              <div className="brutalist-border group" style={{ height: '192px', position: 'relative', overflow: 'hidden' }}>
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEJP2gs22QgFAZKh4eic0PdYAzbFTH3VnjsRarzUzPHomoiqUhv6wpAcLS9_j0DdNYQoKunCaIaR8lgfJQtt720P3_cdSncGFOyIdOdc9I8FJ42jFnEJnKviB-7X_fCRyfFiixivF9rE9V-33pc9Gtc5ZUGDdNB8QYAsArq5C-6Iaw7_mYJHVnNRLBkeGimx-YANNtG4cLYaMD-LeL_6EV2HzCRxaQasXIS0zfdu62EZuyaLTMtTwWPiOndws6MZD3EIapMx7KG_td" 
                  alt="Work" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) brightness(50%)', transition: 'all 0.5s', transform: 'scale(1.1)' }}
                  className="group-hover:grayscale-0 group-hover:brightness-100 group-hover:scale-100"
                />
                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(208, 188, 255, 0.2)', mixBlendMode: 'multiply', transition: 'background-color 0.2s' }} className="group-hover:bg-transparent"></div>
                <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '48px', fontWeight: '900', color: 'var(--on-surface)', lineHeight: 1, textShadow: '0 4px 8px rgba(0,0,0,0.5)' }}>TASK</span>
                  <div 
                    onClick={() => setShowNewTaskModal(true)}
                    style={{ width: '40px', height: '40px', backgroundColor: 'var(--primary)', color: 'var(--on-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} className="hover:scale-110"
                  >
                    <Plus size={24} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Contextual FAB */}
      <button 
        onClick={() => setShowNewProjectModal(true)}
        style={{
          position: 'fixed',
          bottom: '40px',
          right: '40px',
          backgroundColor: 'var(--primary)',
          color: 'var(--on-primary)',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: 'none',
          cursor: 'pointer',
          zIndex: 50,
          transition: 'all 0.2s'
        }} className="hover:scale-110 active:scale-95">
        <Plus size={32} />
      </button>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewProjectModal && (
          <div style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            backdropFilter: 'blur(12px)' 
          }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="no-scrollbar"
              style={{ 
                width: '95%', 
                maxWidth: '540px', 
                backgroundColor: 'var(--surface-container-high)', 
                backdropFilter: 'blur(24px)',
                borderRadius: '32px',
                border: '1px solid var(--outline-variant)', 
                padding: 'clamp(24px, 5vw, 40px)', 
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.05)',
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
                  <Layers size={32} color="var(--primary)" />
                  Create New Project
                </h2>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', marginLeft: '44px' }}>Define your next big milestone and start tracking.</p>
              </div>
              
              <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface-variant)', marginLeft: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Project Title
                  </label>
                  <input 
                    style={{ 
                      width: '100%', 
                      padding: '16px 20px', 
                      backgroundColor: 'rgba(255,255,255,0.03)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '16px',
                      color: 'var(--on-surface)', 
                      outline: 'none',
                      fontSize: '15px',
                      transition: 'all 0.2s',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    placeholder="e.g. Q4 Growth Strategy"
                    required
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary)';
                      e.target.style.backgroundColor = 'rgba(107, 56, 212, 0.05)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.03)';
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface-variant)', marginLeft: '4px' }}>Description</label>
                  <textarea 
                    style={{ 
                      width: '100%', 
                      padding: '16px 20px', 
                      backgroundColor: 'rgba(255,255,255,0.03)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
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
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
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

      {/* New Task Modal */}
      <AnimatePresence>
        {showNewTaskModal && (
          <div style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            backdropFilter: 'blur(12px)' 
          }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="no-scrollbar"
              style={{ 
                width: '95%', 
                maxWidth: '540px', 
                backgroundColor: 'var(--surface-container-high)', 
                backdropFilter: 'blur(24px)',
                borderRadius: '32px',
                border: '1px solid var(--outline-variant)', 
                padding: 'clamp(24px, 5vw, 40px)', 
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.05)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <button 
                type="button"
                onClick={() => setShowNewTaskModal(false)}
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
                  <Zap size={32} color="var(--primary)" />
                  Add Quick Task
                </h2>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', marginLeft: '44px' }}>Assign a new item to one of your active projects.</p>
              </div>
              
              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface-variant)', marginLeft: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Project
                    </label>
                    <select 
                      required
                      style={{ 
                        width: '100%', 
                        padding: '16px 20px', 
                        backgroundColor: 'var(--surface-container-low)', 
                        border: '1px solid var(--outline-variant)', 
                        borderRadius: '16px',
                        color: 'var(--on-surface)', 
                        outline: 'none',
                        fontSize: '15px'
                      }}
                      value={newTask.project_id}
                      onChange={(e) => setNewTask({...newTask, project_id: e.target.value, assignedTo: ''})}
                    >
                      <option value="" disabled style={{ backgroundColor: 'var(--surface-container-high)' }}>Select target project...</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id} style={{ backgroundColor: 'var(--surface-container-high)' }}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface-variant)', marginLeft: '4px' }}>Assign To</label>
                    <select 
                      style={{ 
                        width: '100%', 
                        padding: '16px 20px', 
                        backgroundColor: 'var(--surface-container-low)', 
                        border: '1px solid var(--outline-variant)', 
                        borderRadius: '16px',
                        color: 'var(--on-surface)', 
                        outline: 'none',
                        fontSize: '15px',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      value={newTask.assignedTo}
                      onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
                    >
                      <option value="">Unassigned</option>
                      {(() => {
                        const allMembers = [];
                        const seenIds = new Set();
                        projects.forEach(p => {
                          (p.members || []).forEach(m => {
                            if (!seenIds.has(m.id)) {
                              seenIds.add(m.id);
                              allMembers.push(m);
                            }
                          });
                        });
                        return allMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface-variant)', marginLeft: '4px' }}>Task Title</label>
                  <input 
                    style={{ 
                      width: '100%', 
                      padding: '16px 20px', 
                      backgroundColor: 'rgba(255,255,255,0.03)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '16px',
                      color: 'var(--on-surface)', 
                      outline: 'none',
                      fontSize: '15px'
                    }}
                    placeholder="What needs to be done?"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface-variant)', marginLeft: '4px' }}>Description</label>
                  <textarea 
                    style={{ 
                      width: '100%', 
                      padding: '16px 20px', 
                      backgroundColor: 'rgba(255,255,255,0.03)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '16px',
                      color: 'var(--on-surface)', 
                      outline: 'none', 
                      minHeight: '80px',
                      fontSize: '15px',
                      resize: 'none'
                    }}
                    placeholder="Add more details..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface-variant)', marginLeft: '4px' }}>Priority</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['Urgent', 'High', 'Medium', 'Low', 'Lowest'].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewTask({...newTask, priority: p.toLowerCase()})}
                          style={{
                            flex: '1 1 auto',
                            minWidth: '70px',
                            padding: '8px 4px',
                            borderRadius: '10px',
                            border: '1px solid',
                            borderColor: newTask.priority === p.toLowerCase() ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
                            backgroundColor: newTask.priority === p.toLowerCase() ? 'rgba(107, 56, 212, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                            color: newTask.priority === p.toLowerCase() ? 'var(--primary)' : 'var(--on-surface-variant)',
                            fontSize: '10px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface-variant)', marginLeft: '4px' }}>Due Date</label>
                    <div style={{ position: 'relative' }}>
                      <Calendar 
                        size={18} 
                        style={{ 
                          position: 'absolute', 
                          left: '16px', 
                          top: '50%', 
                          transform: 'translateY(-50%)', 
                          color: 'var(--primary)',
                          pointerEvents: 'none' 
                        }} 
                      />
                      <input 
                        type="date"
                        style={{ 
                          width: '100%', 
                          padding: '16px 16px 16px 44px', 
                          backgroundColor: 'rgba(255,255,255,0.03)', 
                          border: '1px solid rgba(255, 255, 255, 0.1)', 
                          borderRadius: '16px',
                          color: 'var(--on-surface)', 
                          outline: 'none',
                          fontSize: '14px',
                          transition: 'all 0.2s'
                        }}
                        value={newTask.dueDate || ''}
                        onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                      />
                    </div>
                  </div>
                </div>

                <button 
                  disabled={submitting || projects.length === 0}
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
                    opacity: projects.length === 0 ? 0.5 : 1
                  }}
                  className="hover:scale-[1.02] active:scale-[0.98]"
                >
                  {submitting ? 'Adding...' : projects.length === 0 ? 'Create a project first' : 'Add Task'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
