import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AtSign, Lock, User, UserPlus, MailCheck, LogIn } from 'lucide-react';
import { AuthLayout, AuthLink } from '@/components/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PasswordStrength } from '@/components/PasswordStrength';
import { useToast } from '@/components/ui/Toast';
import { registerAccount } from '@/lib/authApi';
import { ApiError } from '@/lib/api';
import { registerSchema, type RegisterValues } from '@/lib/validation';

export default function Register() {
  const toast = useToast();
  const [done, setDone] = useState<{ email: string; firstName: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: true,
    },
  });

  const password = watch('password');

  const onSubmit = async (values: RegisterValues) => {
    try {
      const { account, message } = await registerAccount({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
      });
      toast.success('Account created', message || 'Verify your email to activate it.');
      setDone({ email: account.email, firstName: account.firstName });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not create your account. Please try again.';
      // Surface a duplicate-email conflict on the field itself.
      if (err instanceof ApiError && err.status === 409) {
        setError('email', { type: 'server', message });
      }
      toast.error('Registration failed', message);
    }
  };

  if (done) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle={
          <>
            We sent a verification link to <span className="text-slate-200">{done.email}</span>. Click
            it to activate your account.
          </>
        }
        footer={
          <>
            Wrong email? <AuthLink to="/register">Start over</AuthLink>
          </>
        }
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="mb-6 grid place-items-center"
        >
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <MailCheck className="h-8 w-8" />
          </span>
        </motion.div>

        <p className="mb-6 text-center text-sm text-slate-400">
          Welcome aboard, {done.firstName}. The link expires soon — if it doesn’t arrive in a few
          minutes, check your spam folder.
        </p>

        <Link to="/login">
          <Button size="lg" fullWidth>
            <LogIn className="h-4 w-4" /> Go to sign in
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start managing your agency in minutes."
      footer={
        <>
          Already have an account? <AuthLink to="/login">Sign in</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="First name"
            autoComplete="given-name"
            placeholder="Aria"
            icon={<User />}
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label="Last name"
            autoComplete="family-name"
            placeholder="Sharma"
            icon={<User />}
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          icon={<AtSign />}
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="space-y-2">
          <Input
            label="Password"
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
          label="Confirm password"
          password
          autoComplete="new-password"
          placeholder="Re-enter your password"
          icon={<Lock />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-400">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500/40"
            {...register('acceptTerms')}
          />
          <span>
            I agree to the{' '}
            <a href="#" className="font-medium text-brand-300 hover:underline">
              Terms
            </a>{' '}
            and{' '}
            <a href="#" className="font-medium text-brand-300 hover:underline">
              Privacy Policy
            </a>
            .
          </span>
        </label>
        {errors.acceptTerms && <p className="-mt-3 text-xs text-rose-400">{errors.acceptTerms.message}</p>}

        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          {!isSubmitting && <UserPlus className="h-4 w-4" />} Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
