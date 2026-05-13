import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MoreVertical,
  UserPlus,
  Trash2,
  ChevronDown,
  Calendar,
  X,
  Pencil,
  ArrowRight,
  RefreshCcw,
  MoveRight,
  MoveLeft
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import api, { API_BASE_URL } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', assignedTo: '' });
  const [submitting, setSubmitting] = useState(false);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [activeTaskMenu, setActiveTaskMenu] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, taskId: null });
  const [allMembers, setAllMembers] = useState([]);

  useEffect(() => {
    if (!loading) {
      const tl = gsap.timeline();
      
      tl.fromTo('.project-header', 
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power4.out' }
      )
      .fromTo('.kanban-column',
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' },
        '-=0.4'
      );
    }
  }, [loading]);

  // Pre-parse user with absolute safety
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
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = `/login?redirect=/projects/${id}`;
      return;
    }

    try {
      const [projRes, taskRes, allProjRes] = await Promise.all([
        api.get(`/projects/${id}`, token),
        api.get(`/projects/${id}/tasks`, token),
        api.get('/projects', token)
      ]);

      if (projRes.success) {
        setProject(projRes.data);
      } else {
        toast.error(projRes.message || 'Failed to fetch project');
      }
      
      if (taskRes.success) {
        setTasks(taskRes.data);
      }

      if (allProjRes.success) {
        const seen = new Set();
        const unique = [];
        allProjRes.data.forEach(p => {
          (p.members || []).forEach(m => {
            if (!seen.has(m.id)) {
              seen.add(m.id);
              unique.push(m);
            }
          });
        });
        setAllMembers(unique);
      }
    } catch (err) {
      console.error('Failed to fetch project data', err);
      toast.error('Network error. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Real-time synchronization via SSE
  useEffect(() => {
    if (!id) return;

    console.log('Establishing Real-time Connection for project:', id);
    const eventSource = new EventSource(`${API_BASE_URL}/events/${id}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE Message:', data);

        if (data.type === 'task_created') {
          setTasks(prev => {
            // Check if already exists (to avoid double entry if created by self)
            if (prev.some(t => t.id === data.data.id)) return prev;
            return [data.data, ...prev];
          });
        } else if (data.type === 'task_updated') {
          setTasks(prev => prev.map(t => t.id === data.data.id ? data.data : t));
        } else if (data.type === 'task_deleted') {
          setTasks(prev => prev.filter(t => t.id !== data.data.taskId));
        } else if (data.type === 'member_removed') {
          // If current user was removed
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            if (data.data.memberId === user.id) {
              toast.error('You have been removed from this project.', { duration: 5000, icon: '🚫' });
              setTimeout(() => {
                navigate('/projects');
              }, 1500);
            }
          }
        } else if (data.type === 'role_updated') {
          // Refresh project data to update permissions in UI
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            if (data.data.memberId === user.id) {
              toast.success(`Your role was updated to ${data.data.role}`, { icon: '🎖️' });
              fetchProjectData();
            } else {
              // Someone else's role changed, just refresh the list to show new roles in UI if needed
              fetchProjectData();
            }
          }
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
    const interval = setInterval(fetchProjectData, 30000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [id]);

  const handleEditClick = (task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      assignedTo: task.assignedTo?.id || ''
    });
    setShowTaskModal(true);
    setActiveTaskMenu(null);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem('token');
    try {
      const taskData = {
        title: newTask.title.trim(),
        description: (newTask.description || '').trim(),
        priority: newTask.priority,
        status: newTask.status,
        assignedTo: newTask.assignedTo || null
      };
      
      if (newTask.dueDate && newTask.dueDate.trim() !== '') {
        // Pydantic datetime expects a time component
        taskData.dueDate = `${newTask.dueDate}T00:00:00`;
      }

      console.log('Attempting to save task with payload:', taskData);
      
      let response;
      if (editingTask) {
        response = await api.put(`/projects/${id}/tasks/${editingTask.id}`, taskData, token);
      } else {
        response = await api.post(`/projects/${id}/tasks`, taskData, token);
      }

      if (response.success) {
        if (editingTask) {
          setTasks(tasks.map(t => t.id === editingTask.id ? response.data : t));
        } else {
          setTasks([response.data, ...tasks]);
        }
        setShowTaskModal(false);
        setEditingTask(null);
        setNewTask({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', assignedTo: '' });
        toast.success(editingTask ? 'Task updated' : 'Task created');
      } else {
        let errorMsg = response.message || 'Failed to save task';
        if (response.detail && Array.isArray(response.detail)) {
          errorMsg = response.detail.map(d => `${d.loc[d.loc.length - 1]}: ${d.msg}`).join('\n');
        }
        toast.error(errorMsg);
        console.error('Task save failed:', response);
      }
    } catch (err) {
      console.error('Failed to save task', err);
      toast.error('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverStatus(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        await updateTaskStatus(taskId, newStatus);
      }
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    const token = localStorage.getItem('token');
    try {
      // Optimistic update
      const originalTasks = [...tasks];
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

      const response = await api.patch(`/projects/${id}/tasks/${taskId}/status`, { status: newStatus }, token);
      if (response.success) {
        setTasks(tasks.map(t => t.id === taskId ? response.data : t));
      } else {
        // Rollback on failure
        setTasks(originalTasks);
        toast.error('Failed to update task status');
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  if (loading) return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', padding: '40px' }}>
      <div className="animate-pulse" style={{ marginBottom: '40px' }}>
        <div style={{ width: '200px', height: '40px', backgroundColor: 'var(--surface-container-high)', marginBottom: '16px' }} />
        <div style={{ width: '400px', height: '20px', backgroundColor: 'var(--surface-container-high)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ backgroundColor: 'var(--surface-container-low)', borderRadius: '24px', padding: '24px', height: '70vh', border: '1px solid var(--outline-variant)' }} className="animate-pulse">
            <div style={{ width: '100px', height: '24px', backgroundColor: 'var(--surface-container-high)', marginBottom: '32px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[...Array(2)].map((_, j) => (
                <div key={j} style={{ backgroundColor: 'var(--surface-container-high)', borderRadius: '16px', height: '140px' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  const handleDeleteTask = async (taskId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await api.delete(`/projects/${id}/tasks/${taskId}`, token);
      if (response.success) {
        setTasks(tasks.filter(t => t.id !== taskId));
        setActiveTaskMenu(null);
        toast.success('Task deleted');
      } else {
        toast.error(response.message || 'Failed to delete task');
      }
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--background)', minHeight: '100vh', color: 'var(--on-surface)' }}>
      <Sidebar />
      <Header />

      <main className="lg:pl-20" style={{ paddingTop: '80px', minHeight: '100vh' }}>
        <div style={{ padding: 'clamp(16px, 4vw, 40px)', maxWidth: '1440px', margin: '0 auto' }}>
          
          <Link to="/projects" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--on-surface-variant)', textDecoration: 'none', marginBottom: '32px', fontWeight: '700', textTransform: 'uppercase', fontSize: '12px' }}>
            <ArrowLeft size={16} />
            Back to Projects
          </Link>

          <header className="project-header" style={{ borderBottom: '8px solid var(--on-surface)', paddingBottom: '40px', marginBottom: '48px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px' }}>
            <div style={{ flex: '1 1 500px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: 'clamp(10px, 2vw, 14px)', fontWeight: '800', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.1em' }}>PROJECT ID: {id.slice(-8).toUpperCase()}</span>
              </div>
              <h1 className="architectural-type" style={{ fontSize: 'clamp(32px, 8vw, 96px)', fontWeight: '900', textTransform: 'uppercase', lineHeight: 1, wordBreak: 'break-word' }}>{project?.name}</h1>
              <p style={{ fontSize: 'clamp(14px, 2vw, 20px)', color: 'var(--on-surface-variant)', marginTop: '16px', maxWidth: '800px' }}>{project?.description}</p>
            </div>
                {(() => {
                  const myRole = project?.members?.find(m => m.id === currentUser?.id)?.role;
                  if (myRole === 'admin' || myRole === 'manager') {
                    return (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => {
                            setEditingTask(null);
                            setNewTask({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '', assignedTo: '' });
                            setShowTaskModal(true);
                          }} 
                          style={{ 
                            background: 'linear-gradient(135deg, var(--primary) 0%, #9333ea 100%)', 
                            color: '#ffffff', 
                            padding: '16px 36px', 
                            borderRadius: '16px',
                            border: 'none', 
                            fontWeight: '800', 
                            textTransform: 'uppercase', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            boxShadow: '0 10px 25px -5px rgba(107, 56, 212, 0.5)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          className="hover:scale-105 hover:shadow-[0_15px_35px_-5px_rgba(107,56,212,0.6)]"
                        >
                          <Plus size={24} />
                          Add Task
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
          </header>

          {/* Task Board */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', 
            gap: 'clamp(16px, 3vw, 32px)' 
          }}>
            {['todo', 'in_progress', 'done'].map((status) => (
              <div 
                key={status} 
                className="kanban-column"
                style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '20px', 
                  backgroundColor: dragOverStatus === status ? 'var(--primary-container)' : 'var(--surface-container-high)', 
                  borderRadius: '16px 16px 0 0',
                  borderBottom: '1px solid var(--outline-variant)',
                  transition: 'all 0.2s'
                }}>
                  <h2 style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.15em', color: dragOverStatus === status ? 'var(--on-primary-container)' : 'var(--primary)' }}>
                    {status === 'todo' ? 'To Do' : status === 'in_progress' ? 'In Progress' : 'Completed'}
                  </h2>
                  <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: 'var(--primary)', color: 'var(--on-primary)', padding: '2px 10px', borderRadius: '10px' }}>
                    {tasks.filter(t => t.status === status).length}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px', 
                  padding: '16px', 
                  backgroundColor: dragOverStatus === status ? 'var(--surface-container-highest)' : 'var(--surface-container-low)', 
                  minHeight: '600px', 
                  borderRadius: '0 0 16px 16px',
                  transition: 'all 0.2s',
                  border: dragOverStatus === status ? '2px dashed var(--primary)' : '1px solid var(--outline-variant)',
                  borderTop: 'none'
                }}>
                  {tasks.filter(t => t.status === status).length === 0 ? (
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '12px',
                      color: 'var(--on-surface-variant)', 
                      opacity: 0.5,
                      border: '2px dashed var(--outline-variant)',
                      borderRadius: '12px',
                      margin: '20px 0'
                    }}>
                      <div style={{ backgroundColor: 'var(--surface-container-high)', padding: '12px', borderRadius: '50%' }}>
                        <Plus size={24} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Drag & drop tasks here</span>
                    </div>
                  ) : (
                    <>
                      {tasks.filter(t => t.status === status).map((task) => {
                        const myRole = project?.members?.find(m => m.id === currentUser?.id)?.role;
                        const isPrivileged = myRole === 'admin' || myRole === 'manager';

                        return (
                          <motion.div 
                            key={task.id}
                            layoutId={task.id}
                            draggable={isPrivileged}
                            onDragStart={(e) => isPrivileged && handleDragStart(e, task.id)}
                            className="brutalist-border"
                            style={{ 
                              padding: '24px', 
                              backgroundColor: 'var(--surface-container-lowest)', 
                              cursor: isPrivileged ? 'grab' : 'default',
                              userSelect: 'none',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                              borderColor: 'var(--outline-variant)',
                              position: 'relative'
                            }}
                            whileHover={isPrivileged ? { scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' } : {}}
                            whileTap={isPrivileged ? { scale: 0.98, cursor: 'grabbing' } : {}}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                              <span style={{ 
                                fontSize: '10px', 
                                fontWeight: '800', 
                                textTransform: 'uppercase',
                                padding: '4px 12px',
                                borderRadius: '8px',
                                backgroundColor: task.priority === 'urgent' ? 'var(--error)' : 'var(--primary-container)',
                                color: task.priority === 'urgent' ? 'var(--on-error)' : 'var(--on-primary-container)',
                                letterSpacing: '0.05em'
                              }}>
                                {task.priority}
                              </span>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                                {(task.assignedTo?.id === currentUser?.id || isPrivileged) && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const statuses = ['todo', 'in_progress', 'done'];
                                      const currentIndex = statuses.indexOf(task.status);
                                      const nextIndex = (currentIndex + 1) % statuses.length;
                                      updateTaskStatus(task.id, statuses[nextIndex]);
                                      toast.success(`Moved to ${statuses[nextIndex].replace('_', ' ')}`);
                                    }}
                                    style={{ 
                                      background: 'none', 
                                      border: 'none', 
                                      cursor: 'pointer', 
                                      color: 'var(--primary)',
                                      padding: '6px',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      backgroundColor: 'var(--primary-container)',
                                      opacity: 0.8
                                    }}
                                    title={task.status === 'done' ? "Reset to To-Do" : "Move to Next Stage"}
                                    className="hover:opacity-100 transition-opacity"
                                  >
                                    {task.status === 'done' ? <MoveLeft size={16} /> : <MoveRight size={16} />}
                                  </button>
                                )}

                                {isPrivileged && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTaskMenu(activeTaskMenu === task.id ? null : task.id);
                                    }}
                                    style={{ 
                                      background: 'none', 
                                      border: 'none', 
                                      cursor: 'pointer', 
                                      color: 'var(--on-surface-variant)',
                                      padding: '4px',
                                      borderRadius: '4px'
                                    }}
                                    className="hover:bg-surface-container-high"
                                  >
                                    <MoreVertical size={22} />
                                  </button>
                                )}

                                <AnimatePresence>
                                  {activeTaskMenu === task.id && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                      style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        zIndex: 10,
                                        backgroundColor: 'var(--surface-container-high)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--outline-variant)',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                                        minWidth: '140px',
                                        overflow: 'hidden',
                                        marginTop: '8px'
                                      }}
                                    >
                                      <>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditClick(task);
                                              setActiveTaskMenu(null);
                                            }}
                                            style={{
                                              width: '100%',
                                              padding: '12px 16px',
                                              backgroundColor: 'transparent',
                                              border: 'none',
                                              color: 'var(--on-surface)',
                                              textAlign: 'left',
                                              fontSize: '14px',
                                              fontWeight: '700',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '10px',
                                              borderBottom: '1px solid var(--outline-variant)'
                                            }}
                                            className="hover:bg-primary/10"
                                          >
                                            <Pencil size={16} />
                                            Edit Details
                                          </button>

                                          {(myRole === 'admin' || myRole === 'manager') && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTask(task.id);
                                                setActiveTaskMenu(null);
                                              }}
                                              style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                color: 'var(--error)',
                                                textAlign: 'left',
                                                fontSize: '14px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px'
                                              }}
                                              className="hover:bg-error/10"
                                            >
                                              <Trash2 size={16} />
                                              Delete Task
                                            </button>
                                          )}
                                      </>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                            </div>
                          </div>

                          <h3 style={{ fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', margin: '0 0 8px 0', color: 'var(--on-surface)' }}>{task.title}</h3>
                          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', margin: '0 0 24px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</p>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--outline-variant)', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--on-surface-variant)', fontSize: '12px', fontWeight: '700' }}>
                              <Clock size={14} />
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'NO DEADLINE'}
                            </div>
                            {task.assignedTo && (
                              <div 
                                style={{ 
                                  width: '28px', 
                                  height: '28px', 
                                  borderRadius: '50%', 
                                  backgroundColor: 'var(--primary)', 
                                  color: 'var(--on-primary)', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  fontSize: '10px', 
                                  fontWeight: '900', 
                                  border: '2px solid var(--surface-container-lowest)',
                                  overflow: 'hidden'
                                }}
                                title={`Assigned to: ${task.assignedTo.name}`}
                              >
                                {task.assignedTo.avatar ? (
                                  <img 
                                    src={task.assignedTo.avatar} 
                                    alt={task.assignedTo.name} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                  />
                                ) : (
                                  task.assignedTo.name.charAt(0).toUpperCase()
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                      <div style={{ 
                        marginTop: 'auto', 
                        padding: '16px', 
                        textAlign: 'center', 
                        fontSize: '10px', 
                        fontWeight: '800', 
                        color: 'var(--on-surface-variant)', 
                        opacity: 0.3, 
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                      }}>
                        Drag & Drop to reorder
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* Task Creation Modal */}
      <AnimatePresence>
        {showTaskModal && (
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
              style={{ 
                width: '100%', 
                maxWidth: '600px', 
                backgroundColor: 'var(--surface-container-high)', 
                borderRadius: '32px',
                border: '1px solid var(--outline-variant)', 
                padding: '48px', 
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
            >
              <button 
                onClick={() => setShowTaskModal(false)}
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
                  justifyContent: 'center'
                }}
                className="hover:bg-surface-container-highest"
              >
                <X size={24} />
              </button>

              <div style={{ marginBottom: '32px', position: 'relative' }}>
                <h2 style={{ fontSize: '36px', fontWeight: '900', textTransform: 'uppercase', lineHeight: 1, marginBottom: '8px', color: 'var(--on-surface)' }}>
                  {editingTask ? 'Update Task' : 'Create Task'}
                </h2>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px' }}>
                  {editingTask ? 'Modify the details of this assignment.' : 'Add a new assignment to this board.'}
                </p>
              </div>
              
              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginLeft: '4px' }}>Task Name</label>
                  <input 
                    style={{ 
                      width: '100%', 
                      padding: '18px 20px', 
                      backgroundColor: 'var(--surface-container-low)', 
                      border: '1px solid var(--outline-variant)', 
                      borderRadius: '16px',
                      color: 'var(--on-surface)', 
                      outline: 'none',
                      fontSize: '16px',
                      transition: 'all 0.2s'
                    }}
                    placeholder="E.g. Finalize UI prototype"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
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
                  <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginLeft: '4px' }}>Description</label>
                  <textarea 
                    style={{ 
                      width: '100%', 
                      padding: '18px 20px', 
                      backgroundColor: 'var(--surface-container-low)', 
                      border: '1px solid var(--outline-variant)', 
                      borderRadius: '16px',
                      color: 'var(--on-surface)', 
                      outline: 'none', 
                      minHeight: '100px',
                      fontSize: '16px',
                      resize: 'none',
                      transition: 'all 0.2s'
                    }}
                    placeholder="Provide some context..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Priority Row */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginLeft: '4px', letterSpacing: '0.05em' }}>Priority Level</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {['Urgent', 'High', 'Medium', 'Low', 'Lowest'].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewTask({...newTask, priority: p.toLowerCase()})}
                          style={{
                            flex: 1,
                            padding: '14px 10px',
                            borderRadius: '16px',
                            border: '1px solid',
                            borderColor: newTask.priority === p.toLowerCase() ? 'var(--primary)' : 'var(--outline-variant)',
                            backgroundColor: newTask.priority === p.toLowerCase() ? 'var(--primary-container)' : 'var(--surface-container-low)',
                            color: newTask.priority === p.toLowerCase() ? 'var(--primary)' : 'var(--on-surface-variant)',
                            fontSize: '11px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          className="hover:border-primary/50"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date & Assignee Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginLeft: '4px', letterSpacing: '0.05em' }}>Due Date</label>
                      <div style={{ position: 'relative' }}>
                        <Calendar 
                          size={18} 
                          style={{ 
                            position: 'absolute', 
                            left: '16px', 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            color: 'var(--primary)',
                            pointerEvents: 'none',
                            opacity: 0.8
                          }} 
                        />
                        <input 
                          type="date"
                          style={{ 
                            width: '100%', 
                            padding: '18px 16px 18px 48px', 
                            backgroundColor: 'var(--surface-container-low)', 
                            border: '1px solid var(--outline-variant)', 
                            borderRadius: '16px',
                            color: 'var(--on-surface)', 
                            outline: 'none',
                            fontSize: '15px',
                            transition: 'all 0.2s'
                          }}
                          value={newTask.dueDate || ''}
                          onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
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
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--on-surface-variant)', marginLeft: '4px', letterSpacing: '0.05em' }}>Assign To</label>
                      <div style={{ position: 'relative' }}>
                        <UserPlus 
                          size={18} 
                          style={{ 
                            position: 'absolute', 
                            left: '16px', 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            color: 'var(--primary)',
                            pointerEvents: 'none',
                            opacity: 0.8
                          }} 
                        />
                        <select 
                          style={{ 
                            width: '100%', 
                            padding: '18px 40px 18px 48px', 
                            backgroundColor: 'var(--surface-container-low)', 
                            border: '1px solid var(--outline-variant)', 
                            borderRadius: '16px',
                            color: 'var(--on-surface)', 
                            outline: 'none',
                            fontSize: '15px',
                            appearance: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          value={newTask.assignedTo}
                          onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'var(--primary)';
                            e.target.style.backgroundColor = 'var(--surface-container-high)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'var(--outline-variant)';
                            e.target.style.backgroundColor = 'var(--surface-container-low)';
                          }}
                        >
                          <option value="" style={{ backgroundColor: 'var(--surface-container-high)' }}>Unassigned</option>
                          {allMembers.map(member => (
                            <option key={member.id} value={member.id} style={{ backgroundColor: 'var(--surface-container-high)' }}>{member.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  disabled={submitting}
                  style={{ 
                    backgroundColor: 'var(--primary)', 
                    color: 'var(--on-primary)', 
                    padding: '20px', 
                    fontSize: '18px', 
                    fontWeight: '800', 
                    textTransform: 'uppercase', 
                    borderRadius: '16px',
                    border: 'none', 
                    cursor: 'pointer', 
                    marginTop: '16px',
                    boxShadow: '0 10px 20px -5px rgba(107, 56, 212, 0.4)',
                    transition: 'all 0.2s'
                  }}
                  className="hover:scale-[1.02] active:scale-[0.98]"
                >
                  {submitting ? 'Saving...' : editingTask ? 'Update Task' : 'Deploy Task'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, taskId: null })}
        onConfirm={() => handleDeleteTask(deleteConfirm.taskId)}
        title="Delete Task?"
        message="Are you sure you want to permanently delete this task? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default ProjectDetail;
