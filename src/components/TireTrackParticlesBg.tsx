import React, { useEffect, useState } from 'react';

interface Particle {
  id: number;
  left: number; // percentage
  top: number; // percentage
  size: number; // px
  color: 'orange' | 'blue' | 'emerald';
  duration: number; // seconds
  delay: number; // seconds
  drift: number; // px
}

export default function TireTrackParticlesBg() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate simple particle metadata on client-mount to avoid server hydration mismatches
    const colors: ('orange' | 'blue' | 'emerald')[] = ['orange', 'blue', 'emerald'];
    const count = window.innerWidth < 768 ? 6 : 12; // Fewer particles on mobile for extreme performance

    const generated: Particle[] = Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 80 + 10,
      size: Math.random() * 4 + 3, // 3px to 7px
      color: colors[i % colors.length],
      duration: Math.random() * 8 + 6, // 6s to 14s
      delay: Math.random() * -12, // negative delay so they are instantly visible
      drift: Math.random() * 30 - 15, // horizontal drift
    }));
    setParticles(generated);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      {/* 
        HIGH PERFORMANCE GPU-ACCELERATED CSS ANIMATIONS 
        We use translate3d instead of background-position-y so the GPU can handle the layer directly without causing layout repaints.
      */}
      <style>{`
        @keyframes scrollTreadDown {
          0% {
            transform: translate3d(0, -60px, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes scrollTreadUp {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(0, -60px, 0);
          }
        }
        @keyframes pulseTrackOpacity {
          0%, 100% { opacity: 0.04; }
          50% { opacity: 0.12; }
        }
        @keyframes pulseTrackOpacitySubtle {
          0%, 100% { opacity: 0.01; }
          50% { opacity: 0.04; }
        }
        @keyframes floatUpCSS {
          0% {
            transform: translate3d(0, 0, 0) scale(0.8);
            opacity: 0;
          }
          15% {
            opacity: 0.7;
          }
          85% {
            opacity: 0.7;
          }
          100% {
            transform: translate3d(var(--drift), -120px, 0) scale(1);
            opacity: 0;
          }
        }
        .animate-tread-down {
          animation: scrollTreadDown 5s linear infinite;
          will-change: transform;
        }
        .animate-tread-up {
          animation: scrollTreadUp 6s linear infinite;
          will-change: transform;
        }
        .animate-pulse-track-1 {
          animation: pulseTrackOpacity 12s ease-in-out infinite;
        }
        .animate-pulse-track-2 {
          animation: pulseTrackOpacity 9s ease-in-out infinite;
        }
        .animate-pulse-track-3 {
          animation: pulseTrackOpacitySubtle 15s ease-in-out infinite;
        }
        .gpu-particle {
          animation: floatUpCSS var(--duration) linear infinite;
          animation-delay: var(--delay);
          will-change: transform, opacity;
        }
      `}</style>

      {/* Tire Track Left (Orange, rotating parent, translating child to separate concerns) */}
      <div 
        className="absolute top-[-15%] bottom-[-15%] left-[6%] md:left-[12%] w-[50px] overflow-hidden animate-pulse-track-1"
        style={{
          transform: 'rotate(11deg)',
          maskImage: 'linear-gradient(to bottom, transparent, white 20%, white 80%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, white 20%, white 80%, transparent)',
        }}
      >
        <div 
          className="absolute inset-x-0 top-[-100px] bottom-[-100px] animate-tread-down"
          style={{
            backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'60\'><path d=\'M 4,5 L 14,12 L 14,20 L 4,13 Z M 4,25 L 14,32 L 14,40 L 4,33 Z M 4,45 L 14,52 L 14,60 L 4,53 Z M 36,15 L 26,22 L 26,30 L 36,23 Z M 36,35 L 26,42 L 26,50 L 36,43 Z\' fill=\'%23f97316\' /></svg>")',
            backgroundSize: '40px 60px',
            backgroundRepeat: 'repeat-y',
          }}
        />
      </div>

      {/* Tire Track Right (Blue, rotating parent, translating child) */}
      <div 
        className="absolute top-[-15%] bottom-[-15%] right-[5%] md:right-[15%] w-[50px] overflow-hidden animate-pulse-track-2"
        style={{
          transform: 'rotate(-14deg)',
          maskImage: 'linear-gradient(to bottom, transparent, white 15%, white 85%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, white 15%, white 85%, transparent)',
        }}
      >
        <div 
          className="absolute inset-x-0 top-[-100px] bottom-[-100px] animate-tread-up"
          style={{
            backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'60\'><path d=\'M 4,5 L 14,12 L 14,20 L 4,13 Z M 4,25 L 14,32 L 14,40 L 4,33 Z M 4,45 L 14,52 L 14,60 L 4,53 Z M 36,15 L 26,22 L 26,30 L 36,23 Z M 36,35 L 26,42 L 26,50 L 36,43 Z\' fill=\'%2360a5fa\' /></svg>")',
            backgroundSize: '40px 60px',
            backgroundRepeat: 'repeat-y',
          }}
        />
      </div>

      {/* Subtle dirt tire imprint dust track (alternating phase 3) */}
      <div 
        className="absolute top-[-15%] bottom-[-15%] left-[26%] w-[40px] overflow-hidden animate-pulse-track-3 hidden sm:block"
        style={{
          transform: 'rotate(4deg)',
        }}
      >
        <div 
          className="absolute inset-x-0 top-[-100px] bottom-[-100px] animate-tread-down"
          style={{
            backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'60\'><path d=\'M 4,5 L 14,12 L 14,20 L 4,13 Z M 36,15 L 26,22 L 26,30 L 36,23 Z\' fill=\'%23ffffff\' /></svg>")',
            backgroundSize: '40px 60px',
            backgroundRepeat: 'repeat-y',
          }}
        />
      </div>

      {/* Ambient background glow points to blend everything nicely */}
      <div className="absolute top-1/4 left-1/3 w-[260px] md:w-[350px] h-[260px] md:h-[350px] bg-orange-600/5 rounded-full blur-[90px] md:blur-[110px] pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/4 w-[300px] md:w-[400px] h-[300px] md:h-[400px] bg-blue-600/5 rounded-full blur-[100px] md:blur-[130px] pointer-events-none"></div>

      {/* Floating logistics particles (Pure CSS animated, fully composite-accelerated) */}
      {particles.map((p) => {
        const colorClasses = {
          orange: 'bg-orange-500/25 border-orange-400/30 shadow-[0_0_6px_rgba(249,115,22,0.2)]',
          blue: 'bg-blue-500/25 border-blue-400/30 shadow-[0_0_6px_rgba(59,130,246,0.2)]',
          emerald: 'bg-emerald-500/25 border-emerald-400/30 shadow-[0_0_6px_rgba(16,185,129,0.2)]',
        };

        return (
          <div
            key={p.id}
            className={`absolute rounded-full border gpu-particle ${colorClasses[p.color]}`}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              // Pass values to CSS custom properties
              ['--duration' as any]: `${p.duration}s`,
              ['--delay' as any]: `${p.delay}s`,
              ['--drift' as any]: `${p.drift}px`,
            }}
          />
        );
      })}
    </div>
  );
}
