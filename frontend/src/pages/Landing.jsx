import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  ArrowDown, 
  MoveRight, 
  Settings, 
  Activity, 
  ArrowRight, 
  Users, 
  TrendingUp,
  Target
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const Landing = () => {
  const heroRef = useRef(null);
  const manifestoRef = useRef(null);
  const featuresRef = useRef(null);
  const ctaRef = useRef(null);
  const scrollTextRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero Animation
      gsap.fromTo('.huge-text', 
        { y: 50, opacity: 0 },
        { y: 0, opacity: 0.05, duration: 1, ease: 'power4.out', delay: 0.1 }
      );

      gsap.fromTo('.hero-animate',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out', delay: 0.3 }
      );

      // Manifesto Section Animation
      gsap.from('.manifesto-item', {
        scrollTrigger: {
          trigger: manifestoRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none'
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
      });

      // Features Animation
      gsap.from('.feature-card', {
        scrollTrigger: {
          trigger: featuresRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        },
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out'
      });

      // Scroll Text Parallax
      gsap.to('.animate-scroll', {
        scrollTrigger: {
          trigger: scrollTextRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        },
        xPercent: -30
      });

      // CTA Animation
      gsap.from('.cta-content', {
        scrollTrigger: {
          trigger: ctaRef.current,
          start: 'top 85%',
        },
        y: 30,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const user = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  })();

  return (
    <div ref={heroRef} style={{ backgroundColor: 'var(--background)', color: 'var(--on-surface)', fontFamily: 'var(--font-body)', overflowX: 'hidden' }}>

      {/* Top Navigation Shell */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '80px',
        width: '100%',
        padding: '0 40px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'var(--surface-container-low)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--outline-variant)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)', letterSpacing: '-0.02em' }}>Lumina</div>
        <div className="hidden md:flex" style={{ gap: '24px', alignItems: 'center' }}>
          {user ? (
            <h2 style={{ fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', margin: 0, letterSpacing: '0.05em' }}>
              Hi {user.name}
            </h2>
          ) : (
            <>
              <a href="#" style={{ color: 'var(--primary)', fontWeight: '700', borderBottom: '2px solid var(--primary)', paddingBottom: '4px', fontSize: '16px' }}>Product</a>
              <a href="#" style={{ color: 'var(--on-surface-variant)', fontSize: '16px', transition: 'color 0.3s' }}>Solutions</a>
              <a href="#" style={{ color: 'var(--on-surface-variant)', fontSize: '16px', transition: 'color 0.3s' }}>Enterprise</a>
              <a href="#" style={{ color: 'var(--on-surface-variant)', fontSize: '16px', transition: 'color 0.3s' }}>Pricing</a>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user ? (
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
              <div style={{ textAlign: 'right' }} className="hidden sm:block">
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', margin: 0 }}>{user.name}</p>
                <p style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '800', margin: 0, textTransform: 'uppercase' }}>Active Session</p>
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--surface-container-high)',
                color: 'var(--primary)',
                fontWeight: '900',
                overflow: 'hidden'
              }}>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
            </Link>
          ) : (
            <>
              <Link to="/login" style={{ padding: '8px 24px', fontSize: '14px', fontWeight: '600', color: 'var(--on-surface-variant)' }}>Sign In</Link>
              <Link to="/register" style={{ padding: '8px 24px', fontSize: '14px', fontWeight: '600', backgroundColor: 'var(--primary)', color: 'var(--on-primary)', transition: 'opacity 0.2s' }}>Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section: Typography First */}
      <section ref={heroRef} style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 'clamp(24px, 6vw, 64px) clamp(16px, 4vw, 40px)',
        borderBottom: '1px solid rgba(73, 68, 84, 0.2)',
        overflow: 'hidden',
        backgroundColor: 'var(--background)'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', pointerEvents: 'none', selectNone: 'none', overflow: 'hidden', paddingTop: '64px' }}>
          <h1 className="huge-text" style={{ fontWeight: '900', textTransform: 'uppercase', opacity: 0.05, color: 'var(--on-surface)' }}>
            LUMINA<br />TASK MANAGER
          </h1>
        </div>
        <div className="hero-content" style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
          <div className="grid-cols-1 md:grid-cols-12" style={{ gap: '24px' }}>
            <div className="col-span-12 hero-animate">
              <span style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: 'var(--primary)', color: 'var(--on-primary)', fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', marginBottom: '24px' }}>Now with Real-time SSE</span>
              <h2 style={{ fontSize: 'clamp(48px, 10vw, 120px)', lineHeight: 0.85, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.05em', marginBottom: '40px', color: 'var(--on-surface)' }}>
                Master Your<br />
                <span className="typo-outline">Work Flow With</span><br />
                Lumina
              </h2>
            </div>
            <div className="col-span-12 md:col-start-8 md:col-span-5 hero-animate" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '24px' }}>
              <p style={{ fontSize: '18px', color: 'var(--on-surface-variant)', maxWidth: '448px' }}>
                Simplify your complexity. Lumina Task Flow provides a high-fidelity workspace where teams can track every task, manage deadlines, and visualize project velocity in real-time. Built for those who prioritize output over noise.
              </p>
              <div style={{ display: 'flex', gap: '24px', marginTop: '4px' }}>
                <ArrowDown size={48} color="var(--primary)" />
                <div style={{ fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '4px' }}>Explore the<br />Interface</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Manifesto / Grid Section */}
      <section ref={manifestoRef} style={{ backgroundColor: 'var(--surface-container-highest)', color: 'var(--on-surface)', padding: 'clamp(32px, 6vw, 64px) clamp(16px, 4vw, 40px)' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div className="grid-cols-1 md:grid-cols-12 manifesto-item" style={{ gap: '24px', borderTop: '1px solid rgba(231, 224, 237, 0.1)', paddingTop: '40px' }}>
            <div className="col-span-12 md:col-span-4">
              <h3 style={{ fontSize: '32px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '24px' }}>Our Core Principle</h3>
            </div>
            <div className="col-span-12 md:col-span-8">
              <p style={{ fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1, textTransform: 'uppercase', fontWeight: '700', color: 'var(--primary)', marginBottom: 'clamp(32px, 6vw, 64px)' }}>
                Clarity is the foundation of high-performance teams.
              </p>
            </div>
          </div>
          <div className="grid-cols-1 md:grid-cols-3" style={{ gap: 'clamp(32px, 6vw, 64px)', marginTop: 'clamp(32px, 6vw, 64px)' }}>
            <div className="manifesto-item" style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(73, 68, 84, 0.3)', paddingLeft: '24px', paddingVertical: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <Target size={24} color="var(--primary)" />
                <div style={{ fontSize: '24px', fontWeight: '700', textTransform: 'uppercase' }}>Accountability</div>
              </div>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '15px' }}>Every task has an owner and a deadline. Eliminate ambiguity and ensure every milestone is met with precision tracking.</p>
            </div>
            <div className="manifesto-item" style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(73, 68, 84, 0.3)', paddingLeft: '24px', paddingVertical: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <Users size={24} color="var(--primary)" />
                <div style={{ fontSize: '24px', fontWeight: '700', textTransform: 'uppercase' }}>Collaboration</div>
              </div>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '15px' }}>Break down silos with shared project boards and role-based permissions. Work together in a unified, synchronized workspace.</p>
            </div>
            <div className="manifesto-item" style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(73, 68, 84, 0.3)', paddingLeft: '24px', paddingVertical: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <Activity size={24} color="var(--primary)" />
                <div style={{ fontSize: '24px', fontWeight: '700', textTransform: 'uppercase' }}>Performance</div>
              </div>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '15px' }}>Leverage real-time analytics to visualize team velocity. Turn task completion data into actionable growth strategies.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Massive Typographic Feature */}
      <section ref={scrollTextRef} style={{ padding: '64px 0', overflow: 'hidden', backgroundColor: 'var(--background)' }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', overflow: 'hidden', padding: '40px 0', borderTop: '1px solid rgba(73, 68, 84, 0.2)', borderBottom: '1px solid rgba(73, 68, 84, 0.2)' }}>
          <div className="animate-scroll" style={{ display: 'flex', gap: 'clamp(32px, 6vw, 64px)', fontSize: 'clamp(60px, 18vw, 240px)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.05em', color: 'var(--on-surface)', opacity: 0.1 }}>
            <span>AGILE WORKFLOWS — TEAM COLLABORATION — REAL-TIME ANALYTICS — ZERO FRICTION —</span>
            <span>AGILE WORKFLOWS — TEAM COLLABORATION — REAL-TIME ANALYTICS — ZERO FRICTION —</span>
          </div>
        </div>
      </section>

      {/* Asymmetric Feature Section */}
      <section ref={featuresRef} style={{ padding: 'clamp(32px, 6vw, 64px) clamp(16px, 4vw, 40px)', backgroundColor: 'var(--surface)' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div className="grid-cols-1 md:grid-cols-12" style={{ gap: '24px' }}>
            <div className="col-span-12 md:col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              <div className="brutalist-border feature-card" style={{ backgroundColor: 'var(--surface-container-low)', padding: 'clamp(24px, 4vw, 40px)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)' }}>Productivity Engine</span>
                  <Activity size={24} color="var(--primary)" />
                </div>
                <h4 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '900', textTransform: 'uppercase', color: 'var(--on-surface)' }}>Surgical<br />Project Control</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ height: '4px', backgroundColor: 'var(--primary)', flex: 3 }}></div>
                  <div style={{ height: '4px', backgroundColor: 'var(--secondary)', flex: 2 }}></div>
                  <div style={{ height: '4px', backgroundColor: 'var(--surface-container-highest)', flex: 1 }}></div>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>
                  Hierarchical task management designed for absolute clarity in high-pressure environments.
                </p>
              </div>
              <div className="grid-cols-1 md:grid-cols-2" style={{ gap: '24px' }}>
                <div className="brutalist-border feature-card" style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)', padding: 'clamp(24px, 4vw, 40px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '32px' }}>
                  <div>
                    <Users size={32} />
                    <h5 style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', marginTop: '16px' }}>Team<br />Coordination</h5>
                  </div>
                  <p style={{ fontSize: '13px', opacity: 0.8, textTransform: 'uppercase', fontWeight: '700' }}>Role-based access & shared workspaces.</p>
                </div>
                <div className="brutalist-border feature-card" style={{ border: '1px solid var(--outline)', padding: 'clamp(24px, 4vw, 40px)', backgroundColor: 'var(--surface-container)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '32px' }}>
                  <div>
                    <TrendingUp size={32} color="var(--primary)" />
                    <h5 style={{ fontSize: '24px', fontWeight: '900', textTransform: 'uppercase', marginTop: '16px', color: 'var(--on-surface)' }}>Agile<br />Velocity</h5>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', fontWeight: '700' }}>Real-time performance tracking.</p>
                </div>
              </div>
            </div>
            <div className="col-span-12 md:col-span-5" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px' }}>
              <h3 className="feature-card" style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: '700', textTransform: 'uppercase', lineHeight: 1.2, color: 'var(--on-surface)' }}>
                Built for<br />
                Modern Teams.
              </h3>
              <p className="feature-card" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>
                Lumina is not just a list; it's a productivity command center. By prioritizing visual hierarchy, we ensure your most critical tasks are never lost in the noise. High stakes, higher clarity.
              </p>
              <div className="feature-card" style={{ marginTop: '24px' }}>
                <button style={{ display: 'flex', alignItems: 'center', gap: '16px', border: 'none', background: 'none', cursor: 'pointer' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface)' }}>Explore features</span>
                  <MoveRight color="var(--primary)" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section ref={ctaRef} style={{ padding: 'clamp(48px, 8vw, 64px) clamp(16px, 4vw, 40px)', backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)' }}>
        <div className="cta-content" style={{ maxWidth: '1440px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(64px, 10vw, 120px)', textTransform: 'uppercase', fontWeight: '900', lineHeight: 1, marginBottom: '40px', fontStyle: 'italic', letterSpacing: '-0.05em' }}>
            READY TO<br />LUMINA?
          </h2>
          <div className="flex flex-col md:flex-row" style={{ justifyContent: 'center', alignItems: 'center', gap: 'clamp(24px, 5vw, 40px)' }}>
            {user ? (
              <Link to="/dashboard" className="w-full md:w-auto" style={{ padding: '24px clamp(32px, 6vw, 64px)', backgroundColor: 'var(--on-primary-container)', color: 'var(--primary-container)', fontSize: '20px', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center', textDecoration: 'none' }}>
                Enter Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="w-full md:w-auto" style={{ padding: '24px clamp(32px, 6vw, 64px)', backgroundColor: 'var(--on-primary-container)', color: 'var(--primary-container)', fontSize: '20px', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center', textDecoration: 'none' }}>
                  Join the Workspace
                </Link>
                <button className="w-full md:w-auto" style={{ padding: '24px clamp(32px, 6vw, 64px)', border: '2px solid var(--on-primary-container)', color: 'var(--on-primary-container)', fontSize: '20px', fontWeight: '700', textTransform: 'uppercase', background: 'none', cursor: 'pointer' }}>
                  Contact Sales
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer Shell */}
      <footer style={{ backgroundColor: 'var(--surface-container-lowest)', borderTop: '1px solid rgba(73, 68, 84, 0.2)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', gap: '24px', padding: '48px 40px', maxWidth: '1440px', margin: '0 auto' }} className="grid-cols-2 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--on-surface)', marginBottom: '24px' }}>LUMINA</div>
            <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', maxWidth: '200px' }}>
              Designed for high-performance teams and radical project clarity.
            </p>
          </div>
          <div>
            <h5 style={{ fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '24px' }}>Product</h5>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px', listStyle: 'none', padding: 0 }}>
              <li style={{ color: 'var(--on-surface-variant)', cursor: 'pointer' }}>Dashboard</li>
              <li style={{ color: 'var(--on-surface-variant)', cursor: 'pointer' }}>Team Engine</li>
              <li style={{ color: 'var(--on-surface-variant)', cursor: 'pointer' }}>Analytics</li>
            </ul>
          </div>
          <div>
            <h5 style={{ fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '24px' }}>Support</h5>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px', listStyle: 'none', padding: 0 }}>
              <li style={{ color: 'var(--on-surface-variant)', cursor: 'pointer' }}>Documentation</li>
              <li style={{ color: 'var(--on-surface-variant)', cursor: 'pointer' }}>Guides</li>
              <li style={{ color: 'var(--on-surface-variant)', cursor: 'pointer' }}>Help Center</li>
            </ul>
          </div>
          <div>
            <h5 style={{ fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '24px' }}>Connect</h5>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px', listStyle: 'none', padding: 0 }}>
              <li style={{ color: 'var(--on-surface-variant)', cursor: 'pointer' }}>Twitter</li>
              <li style={{ color: 'var(--on-surface-variant)', cursor: 'pointer' }}>LinkedIn</li>
              <li style={{ color: 'var(--on-surface-variant)', cursor: 'pointer' }}>Discord</li>
            </ul>
          </div>
        </div>
        <div style={{ padding: '16px 40px', borderTop: '1px solid rgba(73, 68, 84, 0.1)', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', padding: '24px 0', opacity: 0.6 }}>
            © 2026 Lumina Task Flow. Master your work.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
