import React, { useEffect, useState } from 'react';

export default function TireTrackParticlesBg() {
  const [isMobile, setIsMobile] = useState<boolean>(true);
  const [particles, setParticles] = useState<{ id: number; left: number; top: number; size: number; color: string }[]>([]);

  useEffect(() => {
    // Determine screen size on client-mount
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      return mobile;
    };

    const mobile = checkMobile();

    // Only generate particles if NOT on mobile to maximize phone rendering performance
    if (!mobile) {
      const colors = ['orange', 'blue', 'emerald'];
      const generated = Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 80 + 10,
        size: Math.random() * 4 + 3,
        color: colors[i % colors.length],
      }));
      setParticles(generated);
    }

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // On Mobile, return a completely static background with zero overhead
  if (isMobile) {
    return (
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-[#0b1b3d]/90">
        {/* Subtle, non-animated gradient spots for depth */}
        <div className="absolute top-1/4 left-10 w-[150px] h-[150px] bg-orange-600/5 rounded-full blur-[60px]" />
        <div className="absolute bottom-1/4 right-10 w-[150px] h-[150px] bg-blue-600/5 rounded-full blur-[60px]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      <style>{`
        @keyframes scrollTreadDown {
          0% { transform: translate3d(0, -60px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        @keyframes scrollTreadUp {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(0, -60px, 0); }
        }
        @keyframes floatUp {
          0% { transform: translate3d(0, 0, 0) scale(0.8); opacity: 0; }
          15% { opacity: 0.6; }
          85% { opacity: 0.6; }
          100% { transform: translate3d(0, -100px, 0) scale(1.1); opacity: 0; }
        }
        .animate-tread-down {
          animation: scrollTreadDown 8s linear infinite;
          will-change: transform;
        }
        .animate-tread-up {
          animation: scrollTreadUp 9s linear infinite;
          will-change: transform;
        }
        .desktop-particle {
          animation: floatUp 12s linear infinite;
          will-change: transform, opacity;
        }
      `}</style>

      {/* Tire Track Left (Desktop Only) */}
      <div 
        className="absolute top-[-10%] bottom-[-10%] left-[12%] w-[45px] overflow-hidden opacity-[0.05]"
        style={{
          transform: 'rotate(10deg)',
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

      {/* Tire Track Right (Desktop Only) */}
      <div 
        className="absolute top-[-10%] bottom-[-10%] right-[15%] w-[45px] overflow-hidden opacity-[0.04]"
        style={{
          transform: 'rotate(-12deg)',
          maskImage: 'linear-gradient(to bottom, transparent, white 20%, white 80%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, white 20%, white 80%, transparent)',
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

      {/* Static ambient background glow points */}
      <div className="absolute top-1/4 left-1/3 w-[350px] h-[350px] bg-orange-600/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[130px] pointer-events-none" />

      {/* High-performance desktop particles */}
      {particles.map((p) => {
        const colorClasses: Record<string, string> = {
          orange: 'bg-orange-500/20 border-orange-400/30',
          blue: 'bg-blue-500/20 border-blue-400/30',
          emerald: 'bg-emerald-500/20 border-emerald-400/30',
        };

        return (
          <div
            key={p.id}
            className={`absolute rounded-full border desktop-particle ${colorClasses[p.color]}`}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.id * -1.5}s`,
            }}
          />
        );
      })}
    </div>
  );
}
