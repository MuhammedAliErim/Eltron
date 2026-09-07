import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: 'View Analytics', icon: 'Analytics' as const, href: '/analytics' },
    { label: 'Moderation Log', icon: 'Shield' as const, href: '/moderation' },
    { label: 'Open Tickets', icon: 'Tickets' as const, href: '/tickets' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.href}
            variant="secondary"
            size="sm"
            onClick={() => navigate(action.href)}
          >
            <Icon name={action.icon} size={16} />
            {action.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
