/**
 * theme.config.ts
 * Premium design tokens for "Midnight Industrial" Enterprise UI/UX.
 */

export const THEME = {
  colors: {
    background: '#0F172A', // Deep primary slate
    container: '#1E293B',  // Slate secondary container
    border: 'rgba(255, 255, 255, 0.05)',
    emerald: {
      lightBg: 'rgba(16, 185, 129, 0.05)',
      primary: '#10B981',
      border: 'rgba(16, 185, 129, 0.15)',
    },
    indigo: {
      lightBg: 'rgba(99, 102, 241, 0.05)',
      primary: '#6366F1',
      border: 'rgba(99, 102, 241, 0.15)',
    },
    rose: {
      lightBg: 'rgba(244, 63, 94, 0.05)',
      primary: '#F43F5E',
      border: 'rgba(244, 63, 94, 0.15)',
    },
    amber: {
      lightBg: 'rgba(245, 158, 11, 0.05)',
      primary: '#F59E0B',
      border: 'rgba(245, 158, 11, 0.15)',
    },
    slate: {
      textMuted: '#94A3B8',
      textDull: '#64748B',
      lightBorder: '#334155'
    }
  },
  glass: "backdrop-blur-[12px] bg-[#1E293B]/60 border border-white/[0.05] rounded-2xl",
  shadows: "shadow-2xl shadow-slate-950/40",
  transitions: {
    springHover: {
      type: "spring" as const,
      stiffness: 300,
      damping: 20
    },
    smoothLayout: {
      layout: {
        type: "spring" as const,
        stiffness: 260,
        damping: 30
      }
    }
  }
};
