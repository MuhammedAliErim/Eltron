import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useGuild } from '../../contexts/GuildContext';
import { Icon } from '../ui/Icon';
import { Avatar } from '../ui/Avatar';
import { Tooltip } from '../ui/Tooltip';
import { NAV_ITEMS, NAV_SECTIONS, SECTION_LABELS } from '../../lib/constants';
import { getGuildIconUrl, classNames } from '../../lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const { guilds, activeGuild, setActiveGuild } = useGuild();
  const location = useLocation();

  return (
    <aside
      className={classNames(
        'hidden md:flex flex-col bg-eltron-surface border-r border-eltron-border transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between h-14 px-3 border-b border-eltron-border">
        {!collapsed && (
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-eltron-accent flex items-center justify-center">
              <Icon name="Bot" size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-eltron-text tracking-tight">Eltron</span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="btn-icon"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name={collapsed ? 'ChevronRight' : 'ChevronLeft'} size={18} />
        </button>
      </div>

      <div className="p-2 border-b border-eltron-border">
        {!collapsed && (
          <p className="px-2 py-1 text-2xs font-semibold text-eltron-subtle uppercase tracking-wider">Servers</p>
        )}
        <div className="space-y-0.5 max-h-40 overflow-y-auto">
          {guilds.map((guild) => {
            const content = (
              <button
                key={guild.id}
                onClick={() => setActiveGuild(guild)}
                className={classNames(
                  'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
                  activeGuild?.id === guild.id
                    ? 'bg-eltron-accent-muted text-eltron-accent'
                    : 'text-eltron-muted hover:text-eltron-text hover:bg-eltron-elevated'
                )}
              >
                {guild.icon ? (
                  <img
                    src={getGuildIconUrl(guild.id, guild.icon, 32)!}
                    alt=""
                    className="w-6 h-6 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-eltron-elevated flex items-center justify-center text-2xs font-bold text-eltron-muted flex-shrink-0">
                    {guild.name.charAt(0)}
                  </div>
                )}
                {!collapsed && (
                  <span className="truncate text-sm">{guild.name}</span>
                )}
              </button>
            );

            return collapsed ? (
              <Tooltip key={guild.id} content={guild.name} side="right">
                {content}
              </Tooltip>
            ) : (
              <div key={guild.id}>{content}</div>
            );
          })}
          {guilds.length === 0 && !collapsed && (
            <p className="px-2 py-4 text-xs text-eltron-subtle text-center">No servers found</p>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-4" aria-label="Main navigation">
        {NAV_SECTIONS.map((section) => {
          const sectionItems = NAV_ITEMS.filter((item) => item.section === section);
          if (sectionItems.length === 0) return null;

          return (
            <div key={section}>
              {!collapsed && (
                <p className="px-2.5 pb-1 text-2xs font-semibold text-eltron-subtle uppercase tracking-wider">
                  {SECTION_LABELS[section] || section}
                </p>
              )}
              <div className="space-y-0.5">
                {sectionItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  const content = (
                    <Link
                      key={item.href}
                      to={item.disabled ? '#' : item.href}
                      onClick={(e) => item.disabled && e.preventDefault()}
                      className={classNames(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-eltron-accent-muted text-eltron-accent'
                          : 'text-eltron-muted hover:text-eltron-text hover:bg-eltron-elevated',
                        item.disabled && 'opacity-40 cursor-not-allowed'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon name={item.icon} size={18} className="flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );

                  return collapsed ? (
                    <Tooltip key={item.href} content={item.label} side="right">
                      {content}
                    </Tooltip>
                  ) : (
                    <div key={item.href}>{content}</div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {user && (
        <div className="p-2 border-t border-eltron-border">
          <div className={classNames(
            'flex items-center gap-2.5 px-2 py-2 rounded-lg',
            collapsed ? 'justify-center' : ''
          )}>
            <Avatar userId={user.id} src={user.avatar} alt={user.username} size="sm" />
            {!collapsed ? (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-eltron-text truncate">
                    {user.global_name || user.username}
                  </p>
                  <p className="text-2xs text-eltron-subtle truncate">@{user.username}</p>
                </div>
                <button
                  onClick={logout}
                  className="btn-icon"
                  aria-label="Logout"
                  title="Logout"
                >
                  <Icon name="LogOut" size={16} />
                </button>
              </>
            ) : (
              <Tooltip content="Logout" side="right">
                <button
                  onClick={logout}
                  className="btn-icon"
                  aria-label="Logout"
                >
                  <Icon name="LogOut" size={16} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
