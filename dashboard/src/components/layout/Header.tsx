import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useGuild } from '../../contexts/GuildContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../ui/Icon';
import { Avatar } from '../ui/Avatar';
import { Breadcrumb } from '../ui/Breadcrumb';
import { SearchInput } from '../ui/SearchInput';
import { getGuildIconUrl } from '../../lib/utils';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { activeGuild } = useGuild();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [search, setSearch] = useState('');

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbItems = pathSegments.map((_segment, index) => ({
    href: '/' + pathSegments.slice(0, index + 1).join('/'),
  }));

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-eltron-surface border-b border-eltron-border flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="md:hidden btn-icon"
          aria-label="Toggle menu"
        >
          <Icon name="Menu" size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-2.5">
          {activeGuild && (
            <>
              {activeGuild.icon ? (
                <img
                  src={getGuildIconUrl(activeGuild.id, activeGuild.icon, 32)!}
                  alt=""
                  className="w-7 h-7 rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-eltron-elevated flex items-center justify-center text-xs font-bold text-eltron-muted">
                  {activeGuild.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-eltron-text truncate">{activeGuild.name}</p>
              </div>
            </>
          )}
        </div>

        <div className="hidden lg:block">
          {breadcrumbItems.length > 0 && <Breadcrumb items={breadcrumbItems} />}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:block w-48">
          <SearchInput value={search} onChange={setSearch} placeholder="Search..." />
        </div>

        <button
          onClick={toggleTheme}
          className="btn-icon"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <Icon name={theme === 'dark' ? 'Star' : 'Info'} size={18} />
        </button>

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-eltron-border">
            <Avatar userId={user.id} src={user.avatar} alt={user.username} size="sm" />
            <span className="hidden md:block text-sm font-medium text-eltron-text">
              {user.global_name || user.username}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
