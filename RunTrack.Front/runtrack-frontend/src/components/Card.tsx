import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
}

export default function Card({ children, className = '', gradient = false }: CardProps) {
  return (
    <div
      className={`
        rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]
        ${gradient 
          ? 'bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 shadow-xl shadow-primary-500/10' 
          : 'bg-slate-800/40 border border-slate-700/50'
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}
