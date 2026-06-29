import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AtSign, Lock, LogIn } from 'lucide-react';
import { AuthLayout, AuthLink } from '@/components/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { loginSchema, type LoginValues } from '@/lib/validation';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [needsVerify, setNeedsVerify] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/app';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  const onSubmit = async (values: LoginValues) => {
    setNeedsVerify(false);
    try {
      const user = await login(values.email, values.password);
      toast.success('Welcome back', `Signed in as ${user.name}`);
      navigate(from, { replace: true });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Try again.';
      if (err instanceof ApiError && err.status === 403) setNeedsVerify(true);
      toast.error('Sign in failed', message);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Esscentra workspace to continue."
      footer={
        <>
          New to Esscentra? <AuthLink to="/register">Create an account</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          icon={<AtSign />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="space-y-1.5">
          <Input
            label="Password"
            password
            autoComplete="current-password"
            placeholder="••••••••"
            icon={<Lock />}
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex items-center justify-between pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500/40"
                {...register('remember')}
              />
              Remember me
            </label>
            <AuthLink to="/forgot-password">Forgot password?</AuthLink>
          </div>
        </div>

        {needsVerify && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200"
          >
            Your email isn’t verified yet.{' '}
            <Link to="/verify-email" className="font-semibold underline underline-offset-2">
              Resend verification link
            </Link>
            .
          </motion.div>
        )}

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          {!isSubmitting && <LogIn className="h-4 w-4" />} Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
