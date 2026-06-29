import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ArrowLeft, AtSign, KeyRound, Send } from 'lucide-react';
import { AuthLayout, AuthLink } from '@/components/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { forgotPassword } from '@/lib/authApi';
import { ApiError } from '@/lib/api';
import { forgotSchema, type ForgotValues } from '@/lib/validation';

export default function ForgotPassword() {
  const toast = useToast();
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });

  const onSubmit = async (values: ForgotValues) => {
    try {
      const message = await forgotPassword(values.email);
      setSentEmail(values.email);
      toast.success('Request received', message);
    } catch (err) {
      toast.error('Something went wrong', err instanceof ApiError ? err.message : undefined);
    }
  };

  if (sentEmail) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle={
          <>
            If an account exists for <span className="text-slate-200">{sentEmail}</span>, a reset
            link is on its way.
          </>
        }
        footer={
          <AuthLink to="/login">
            <span className="inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </span>
          </AuthLink>
        }
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18 }}
          className="mb-6 grid place-items-center"
        >
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
            <KeyRound className="h-8 w-8" />
          </span>
        </motion.div>
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-xs text-slate-400">
          The link expires in 1 hour. If it doesn’t arrive within a few minutes, check your spam
          folder.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="No worries — enter your email and we’ll send a secure reset link."
      footer={
        <AuthLink to="/login">
          <span className="inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </span>
        </AuthLink>
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
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          {!isSubmitting && <Send className="h-4 w-4" />} Send reset link
        </Button>
      </form>
    </AuthLayout>
  );
}
