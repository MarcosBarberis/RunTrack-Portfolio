import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  color: 'blue' | 'orange' | 'green' | 'purple' | 'red';
}

const colorClasses = {
  blue: {
    bg: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30',
    icon: 'bg-blue-500/20 text-blue-400',
    text: 'text-blue-400',
    shadow: 'shadow-blue-500/20',
  },
  orange: {
    bg: 'from-orange-500/20 to-amber-500/20',
    border: 'border-orange-500/30',
    icon: 'bg-orange-500/20 text-orange-400',
    text: 'text-orange-400',
    shadow: 'shadow-orange-500/20',
  },
  green: {
    bg: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30',
    icon: 'bg-green-500/20 text-green-400',
    text: 'text-green-400',
    shadow: 'shadow-green-500/20',
  },
  purple: {
    bg: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30',
    icon: 'bg-purple-500/20 text-purple-400',
    text: 'text-purple-400',
    shadow: 'shadow-purple-500/20',
  },
  red: {
    bg: 'from-red-500/20 to-rose-500/20',
    border: 'border-red-500/30',
    icon: 'bg-red-500/20 text-red-400',
    text: 'text-red-400',
    shadow: 'shadow-red-500/20',
  },
};

export default function KPICard({ title, value, icon: Icon, trend, color }: KPICardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`rounded-2xl p-6 bg-gradient-to-br ${colors.bg} border ${colors.border} shadow-xl ${colors.shadow} backdrop-blur-sm transition-all duration-300 hover:scale-105`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400 font-body mb-2">{title}</p>
          <p className={`text-3xl font-bold font-display ${colors.text}`}>{value}</p>
          {trend && (
            <div className="mt-3 flex items-center gap-1">
              <span className={`text-xs font-semibold ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
                {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-slate-500">vs last week</span>
            </div>
          )}
        </div>
        <div className={`rounded-xl p-3 ${colors.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
