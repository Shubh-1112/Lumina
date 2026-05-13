import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const LoadingScreen = ({ onComplete }) => {
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const gridRef = useRef(null);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(containerRef.current, {
          y: '-100%',
          duration: 1.2,
          ease: 'expo.inOut',
          onComplete: onComplete
        });
      }
    });

    // Animate percentage counter
    const counter = { val: 0 };
    gsap.to(counter, {
      val: 100,
      duration: 2.5,
      ease: 'power2.inOut',
      onUpdate: () => setPercent(Math.floor(counter.val))
    });

    // Animate Letters
    tl.fromTo('.loading-letter',
      { y: 100, opacity: 0, rotateX: -90 },
      { y: 0, opacity: 1, rotateX: 0, duration: 1, stagger: 0.05, ease: 'back.out(1.7)' },
      '-=0.5'
    );

    // Progress Bar
    tl.fromTo(progressRef.current,
      { width: '0%' },
      { width: '100%', duration: 2, ease: 'power4.inOut' },
      '<'
    );

    // Outro
    tl.to('.loading-content', {
      opacity: 0,
      y: -50,
      duration: 0.5,
      ease: 'power4.in',
      delay: 0.2
    });

    return () => tl.kill();
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        backgroundColor: 'var(--background)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        overflow: 'hidden',
        perspective: '1000px'
      }}
    >
      {/* Ambient Glows */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, var(--primary-container) 0%, transparent 70%)',
        opacity: 0.15,
        filter: 'blur(80px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* Subtle Dynamic Grid */}
      <div
        ref={gridRef}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, var(--outline-variant) 1px, transparent 1px),
            linear-gradient(to bottom, var(--outline-variant) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          opacity: 0.05,
          maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
          pointerEvents: 'none'
        }}
      />

      <div className="loading-content" style={{ position: 'relative', textAlign: 'center', zIndex: 10 }}>
        {/* Brand Letters with Glow */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '60px', justifyContent: 'center' }}>
          {'LUMINA'.split('').map((char, i) => (
            <span
              key={i}
              className="loading-letter"
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: 'clamp(4rem, 12vw, 8rem)',
                fontWeight: '900',
                color: 'var(--primary)',
                display: 'inline-block',
                letterSpacing: '-0.02em',
                textShadow: '0 0 40px rgba(var(--primary-rgb), 0.4)',
                WebkitTextStroke: '1px rgba(255,255,255,0.1)'
              }}
            >
              {char}
            </span>
          ))}
        </div>

        {/* Premium Progress System */}
        <div style={{ position: 'relative', width: '340px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '18px',
            padding: '0 4px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span className="shimmer-text" style={{
                fontSize: '11px',
                fontWeight: '900',
                color: 'var(--primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.4em',
                opacity: 0.9,
                marginBottom: '2px'
              }}>
                Setting up your workspace
              </span>
              <div style={{ 
                height: '2px', 
                width: '40px', 
                backgroundColor: 'var(--primary)', 
                borderRadius: '1px',
                opacity: 0.3
              }} />
            </div>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '22px',
              fontWeight: '900',
              color: 'var(--primary)',
              lineHeight: '1',
              textShadow: '0 0 20px rgba(var(--primary-rgb), 0.5)'
            }}>
              {percent.toString().padStart(3, '0')}%
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '20px',
              overflow: 'hidden',
              border: '1px solid var(--outline-variant)',
              position: 'relative',
              backdropFilter: 'blur(10px)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            {/* Shimmer Track */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                animation: 'shimmer 2s infinite linear'
              }}
            />

            <div
              ref={progressRef}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                width: '0%',
                borderRadius: '20px',
                boxShadow: '0 0 30px rgba(var(--primary-rgb), 0.6)',
                position: 'relative',
                transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Animated Leading Edge */}
              <div style={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translate(50%, -50%)',
                width: '20px',
                height: '40px',
                background: 'var(--primary)',
                filter: 'blur(15px)',
                opacity: 0.8
              }} />
            </div>
          </div>

          {/* Data Particles - Ambient deco */}
          <div className="particles-container" style={{
            position: 'absolute',
            bottom: '-40px',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            gap: '20px'
          }}>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="loading-dot"
                style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  animation: `pulse 1.5s infinite ${i * 0.3}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer-text {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, var(--primary), #fff, var(--primary));
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer-text 3s linear infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.5); opacity: 1; filter: blur(1px); }
        }
        :root {
          --primary-rgb: 208, 188, 255; /* Approximate for Lavender Mist default */
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
