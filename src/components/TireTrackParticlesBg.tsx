import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: 'orange' | 'blue' | 'emerald';
  duration: number;
  delay: number;
}

export default function TireTrackParticlesBg() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate static random values on client side after mounting to avoid hydration mismatches
    const generated: Particle[] = Array.from({ length: 18 }).map((_, i) => {
      const colors: ('orange' | 'blue' | 'emerald')[] = ['orange', 'blue', 'emerald'];
      return {
        id: i,
        x: Math.random() * 100, // percentage
        y: Math.random() * 100, // percentage
        size: Math.random() * 6 + 3, // 3px to 9px
        color: colors[Math.floor(Math.random() * colors.length)],
        duration: Math.random() * 12 + 8, // 8s to 20s
        delay: Math.random() * -15, // negative delay so they are already spread out
      };
    });
    setParticles(generated);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      {/* Dynamic Keyframe Injection for the seamless tire track rolling effect */}
      <style>{`
        @keyframes scrollTread {
          0% {
            background-position-y: 0px;
          }
          100% {
            background-position-y: 120px;
          }
        }
        .tire-track-scroll {
          animation: scrollTread 8s linear infinite;
        }
      `}</style>

      {/* SVG Pattern Definitions */}
      <svg className="hidden" aria-hidden="true">
        <defs>
          {/* Custom realistic truck/heavy-duty tire track SVG pattern */}
          <pattern id="heavy-truck-tread" width="40" height="60" patternUnits="userSpaceOnUse">
            {/* Background transparent gutter */}
            <rect width="40" height="60" fill="none" />
            
            {/* Center channel */}
            <line x1="20" y1="0" x2="20" y2="60" stroke="#1e293b" strokeWidth="2" strokeDasharray="8 4" opacity="0.3" />
            
            {/* Left tread lugs - diagonal blocks */}
            <path d="M 4,5 L 14,12 L 14,20 L 4,13 Z" fill="currentColor" />
            <path d="M 4,25 L 14,32 L 14,40 L 4,33 Z" fill="currentColor" />
            <path d="M 4,45 L 14,52 L 14,60 L 4,53 Z" fill="currentColor" />
            
            {/* Right tread lugs - offset diagonal blocks */}
            <path d="M 36,15 L 26,22 L 26,30 L 36,23 Z" fill="currentColor" />
            <path d="M 36,35 L 26,42 L 26,50 L 36,43 Z" fill="currentColor" />
            <path d="M 36,55 L 26,62 L 26,70 L 36,63 Z" fill="currentColor" />
          </pattern>
        </defs>
      </svg>

      {/* Tire Track Left (Orange, alternating phase 1) */}
      <motion.div 
        className="absolute top-[-10%] bottom-[-10%] left-[8%] md:left-[12%] w-[50px] text-orange-500 bg-repeat-y tire-track-scroll"
        style={{
          backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'60\'><path d=\'M 4,5 L 14,12 L 14,20 L 4,13 Z M 4,25 L 14,32 L 14,40 L 4,33 Z M 4,45 L 14,52 L 14,60 L 4,53 Z M 36,15 L 26,22 L 26,30 L 36,23 Z M 36,35 L 26,42 L 26,50 L 36,43 Z\' fill=\'%23f97316\' /></svg>")',
          backgroundSize: '40px 60px',
          maskImage: 'linear-gradient(to bottom, transparent, white 20%, white 80%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, white 20%, white 80%, transparent)',
          rotate: 12,
        }}
        animate={{
          opacity: [0.03, 0.14, 0.03],
          x: [0, 12, 0],
          scaleY: [1, 1.02, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Tire Track Right (Blue, alternating phase 2) */}
      <motion.div 
        className="absolute top-[-10%] bottom-[-10%] right-[6%] md:right-[15%] w-[50px] text-blue-400 bg-repeat-y tire-track-scroll"
        style={{
          backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'60\'><path d=\'M 4,5 L 14,12 L 14,20 L 4,13 Z M 4,25 L 14,32 L 14,40 L 4,33 Z M 4,45 L 14,52 L 14,60 L 4,53 Z M 36,15 L 26,22 L 26,30 L 36,23 Z M 36,35 L 26,42 L 26,50 L 36,43 Z\' fill=\'%2360a5fa\' /></svg>")',
          backgroundSize: '40px 60px',
          animationDirection: 'reverse',
          maskImage: 'linear-gradient(to bottom, transparent, white 15%, white 85%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, white 15%, white 85%, transparent)',
          rotate: -15,
        }}
        animate={{
          opacity: [0.14, 0.03, 0.14],
          x: [0, -12, 0],
          scaleY: [1.02, 1, 1.02],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Subtle dirt tire imprint dust track for additional highway detail (alternating phase 3) */}
      <motion.div 
        className="absolute top-[-10%] bottom-[-10%] left-[25%] w-[40px] bg-repeat-y tire-track-scroll"
        style={{
          backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'60\'><path d=\'M 4,5 L 14,12 L 14,20 L 4,13 Z M 36,15 L 26,22 L 26,30 L 36,23 Z\' fill=\'%23ffffff\' /></svg>")',
          backgroundSize: '40px 60px',
          rotate: 4,
        }}
        animate={{
          opacity: [0.01, 0.05, 0.01],
          x: [-6, 6, -6],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Ambient background glow points to blend everything nicely */}
      <div className="absolute top-1/4 left-1/3 w-[350px] h-[350px] bg-orange-600/5 rounded-full blur-[110px] pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[130px] pointer-events-none"></div>

      {/* Floating logistics particles */}
      {particles.map((p) => {
        const colorClasses = {
          orange: 'bg-orange-500/30 border-orange-400/40 shadow-[0_0_8px_rgba(249,115,22,0.3)]',
          blue: 'bg-blue-500/30 border-blue-400/40 shadow-[0_0_8px_rgba(59,130,246,0.3)]',
          emerald: 'bg-emerald-500/30 border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]',
        };

        return (
          <motion.div
            key={p.id}
            className={`absolute rounded-full border ${colorClasses[p.color]}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: [-20, -120],
              x: [0, Math.sin(p.id) * 15],
              opacity: [0, 0.8, 0.8, 0],
              scale: [0.8, 1.2, 1, 0.7],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'linear',
            }}
          />
        );
      })}
    </div>
  );
}
