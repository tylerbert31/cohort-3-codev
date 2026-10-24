import React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarItem {
  id: string;
  name: string;
  imageUrl?: string | null;
}

export interface AvatarStackProps {
  avatars: AvatarItem[];
  max?: number;
  className?: string;
  size?: 'sm' | 'md';
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  avatars,
  max = 4,
  className,
  size = 'md',
}) => {
  const visible = avatars.slice(0, max);
  const remaining = Math.max(0, avatars.length - max);

  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-xs';

  return (
    <div className={cn('flex items-center -space-x-2 overflow-hidden', className)}>
      {visible.map((av) => (
        <div
          key={av.id}
          className={cn(
            'inline-block rounded-full ring-2 ring-white bg-pine-100 text-pine-800 font-semibold flex items-center justify-center shrink-0',
            sizeClasses
          )}
          title={av.name}
        >
          {av.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={av.imageUrl}
              alt={av.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{av.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'inline-block rounded-full ring-2 ring-white bg-canvas-muted text-ink font-semibold flex items-center justify-center shrink-0',
            sizeClasses
          )}
          title={`${remaining} more`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};
