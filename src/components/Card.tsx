import React from 'react';

export interface CardProps {
  title: string;
  icon: string;
  subtitle?: string;
  content: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  isConfirmed?: boolean;
}

export default function Card({
  title,
  icon,
  subtitle,
  content,
  badge,
  action,
  isConfirmed = false
}: CardProps) {
  return (
    <div className={`card flex flex-col h-full border-t-2 border-t-[var(--accent-sage)] shadow-sm hover:shadow-md transition-all ${isConfirmed ? 'opacity-50 grayscale bg-gray-50' : ''}`}>
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono uppercase text-[var(--text-muted)]">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="mt-2 flex-grow">
        <p className={`text-lg font-bold leading-tight ${isConfirmed ? 'text-[var(--text-muted)]' : ''}`}>{content}</p>
        {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
        {badge && (
          <div className="mt-2">
            {typeof badge === 'string' ? (
              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-bold uppercase">
                {badge}
              </span>
            ) : (
              badge
            )}
          </div>
        )}
      </div>
      {action && <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">{action}</div>}
    </div>
  );
}
