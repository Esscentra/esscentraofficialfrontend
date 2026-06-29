import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Lock, ShieldX } from 'lucide-react';
import { AuthLayout, AuthLink } from '@/components/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PasswordStrength } from '@/components/PasswordStrength';
import { useToast } from '@/components/ui/Toast';
import { resetPassword } from '@/lib/authApi';
import { ApiError } from '@/lib/api';
import { resetSchema, type ResetValues } from '@/lib/validation';

type Status = 'form' | 'invalid' | 'success';

export default function ResetPassword() {
  const { token = '' } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  // No token in the URL → nothing to reset.
  const [status, setStatus] = useState<Status>(token ? 'form' : 'invalid');
  const [errorMsg, setErrorMsg] = useState('This reset link is invalid or has expired.');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const password = watch('password');

  const onSubmit = async (values: ResetValues) => {
    try {
      const message = await resetPassword(token, values.password);
      setStatus('success');
      toast.success('Password updated', message);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not reset your password.';
      toast.error('Reset failed', message);
      // 400 means the token is invalid/expired — show the dead-end state.
      if (err instanceof ApiError && err.status === 400) {
        setErrorMsg(message);
        setStatus('invalid');
      }
    }
  };

  if (status === 'invalid') {
    return (
      <AuthLayout
        title="Link expired"
        subtitle={errorMsg}
        footer={
          <>
            Need a new one? <AuthLink to="/forgot-password">Request another link</AuthLink>
          </>
        }
      >
        <div className="mb-7 grid place-items-center">
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
            <ShieldX className="h-10 w-10" />
          </span>
        </div>
        <Button size="lg" variant="secondary" fullWidth onClick={() => navigate('/forgot-password')}>
          Request a new link
        </Button>
      </AuthLayout>
    );
  }

  if (status === 'success') {
    return (
      <AuthLayout title="All set" subtitle="Your password has been updated successfully.">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 16 }}
          className="mb-7 grid place-items-center"
        >
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <CheckCircle2 className="h-10 w-10" />
          </span>
        </motion.div>
        <Button size="lg" fullWidth onClick={() => navigate('/login')}>
          Continue to sign in
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password you haven’t used before."
      footer={
        <>
          Changed your mind? <AuthLink to="/login">Back to sign in</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Input
            label="New password"
            password
            autoComplete="new-password"
            placeholder="Create a strong password"
            icon={<Lock />}
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrength value={password} />
        </div>
        <Input
          label="Confirm new password"
          password
          autoComplete="new-password"
          placeholder="Re-enter your password"
          icon={<Lock />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
