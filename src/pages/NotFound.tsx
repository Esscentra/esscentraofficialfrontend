import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <AuthLayout title="Page not found" subtitle="The page you’re looking for doesn’t exist or has moved.">
      <div className="mb-6 text-center">
        <p className="bg-gradient-to-r from-brand-300 to-brand-600 bg-clip-text text-7xl font-black text-transparent">
          404
        </p>
      </div>
      <Button size="lg" fullWidth onClick={() => navigate('/login')}>
        Back to sign in
      </Button>
    </AuthLayout>
  );
}
