import { getAvatarUrl, classNames } from '../../lib/utils';

interface AvatarProps {
  userId?: string;
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  xs: 'w-5 h-5 text-2xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

export function Avatar({ userId, src, alt, size = 'md', className }: AvatarProps) {
  const imageUrl = src && src.startsWith('http') ? src : (userId ? getAvatarUrl(userId, src || null) : null);
  const initials = alt.charAt(0).toUpperCase();

  return (
    <div
      className={classNames(
        'relative inline-flex items-center justify-center rounded-full bg-eltron-elevated text-eltron-muted font-medium overflow-hidden flex-shrink-0',
        sizeStyles[size],
        className
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
