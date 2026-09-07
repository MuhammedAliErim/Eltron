import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-eltron-bg">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-eltron-elevated flex items-center justify-center mx-auto mb-6">
          <Icon name="X" size={32} className="text-eltron-muted" />
        </div>
        <h1 className="text-5xl font-bold text-eltron-text mb-3">404</h1>
        <p className="text-lg text-eltron-muted mb-8">Page not found</p>
        <Button onClick={() => navigate('/dashboard')}>
          <Icon name="ChevronLeft" size={16} />
          Go Home
        </Button>
      </div>
    </div>
  );
}
