import { Icons, IconName } from '../../lib/icons';
import { classNames } from '../../lib/utils';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className }: IconProps) {
  const IconComponent = Icons[name];
  return <IconComponent width={size} height={size} className={classNames('flex-shrink-0', className)} />;
}
