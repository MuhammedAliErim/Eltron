import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Badge } from '../ui/Badge';
import type { IconName } from '../../lib/icons';
import { classNames } from '../../lib/utils';

interface ActivityItem {
  id: string;
  type: 'message' | 'moderation' | 'member' | 'ticket' | 'giveaway';
  description: string;
  timestamp: string;
}

const typeConfig: Record<ActivityItem['type'], { icon: IconName; color: string; badgeVariant: 'default' | 'success' | 'warning' | 'danger' | 'info' }> = {
  message: { icon: 'Message', color: 'text-eltron-accent', badgeVariant: 'info' },
  moderation: { icon: 'Shield', color: 'text-eltron-danger', badgeVariant: 'danger' },
  member: { icon: 'Members', color: 'text-eltron-success', badgeVariant: 'success' },
  ticket: { icon: 'Tickets', color: 'text-eltron-warning', badgeVariant: 'warning' },
  giveaway: { icon: 'Giveaways', color: 'text-eltron-accent', badgeVariant: 'info' },
};

export function ActivityFeed() {
  const activities: ActivityItem[] = [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <div>
        {activities.length === 0 ? (
          <div className="py-8 text-center">
            <Icon name="Activity" size={24} className="text-eltron-subtle mx-auto mb-2" />
            <p className="text-sm text-eltron-muted">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((item) => {
              const config = typeConfig[item.type];
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-eltron-elevated/50 transition-colors"
                >
                  <div className={classNames('p-1.5 rounded-md bg-eltron-elevated', config.color)}>
                    <Icon name={config.icon} size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-eltron-text truncate">{item.description}</p>
                  </div>
                  <Badge variant={config.badgeVariant} size="sm">{item.type}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
