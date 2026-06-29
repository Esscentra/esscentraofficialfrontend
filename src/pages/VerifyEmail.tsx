import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, Loader2, MailWarning, MailCheck } from 'lucide-react';
import { AuthLayout, AuthLink } from '@/components/AuthLayout';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { verifyEmail } from '@/lib/authApi';
import { ApiError } from '@/lib/api';

type Status = 'verifying' | 'success' | 'error' | 'no-token';

export default function VerifyEmail() {
  const { token = '' } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'no-token');
  const [errorMsg, setErrorMsg] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // guard StrictMode double-run
    verifyEmail(token)
      .then((message) => {
        setStatus('success');
        toast.success('Email verified', message || 'You can now sign in.');
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err instanceof ApiError ? err.message : 'Verification failed.');
      });
  }, [token, toast]);

  if (status === 'verifying') {
    return (
      <AuthLayout title="Verifying your email" subtitle="Hold tight — this only takes a moment.">
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 className="h-10 w-10 animate-spin text-brand-300" />
          <p className="text-sm text-slate-400">Confirming your verification link…</p>
        </div>
      </AuthLayout>
    );
  }

  if (status === 'success') {
    return (
      <AuthLayout title="Email verified" subtitle="Your account is now active.">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 16 }}
          className="mb-7 grid place-items-center"
        >
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <BadgeCheck className="h-10 w-10" />
          </span>
        </motion.div>
        <Button size="lg" fullWidth onClick={() => navigate('/login')}>
          Continue to sign in
        </Button>
      </AuthLayout>
    );
  }

  if (status === 'error') {
    return (
      <AuthLayout
        title="Verification failed"
        subtitle={errorMsg}
        footer={
          <>
            Already verified? <AuthLink to="/login">Sign in</AuthLink>
          </>
        }
      >
        <div className="mb-7 grid place-items-center">
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
            <MailWarning className="h-10 w-10" />
          </span>
        </div>
        <Button size="lg" variant="secondary" fullWidth onClick={() => navigate('/login')}>
          Back to sign in
        </Button>
      </AuthLayout>
    );
  }

  // no-token: the page was opened directly, without the emailed link.
  return (
    <AuthLayout
      title="Check your inbox"
      subtitle="Open the verification link we emailed you to activate your account."
      footer={
        <>
          Already verified? <AuthLink to="/login">Sign in</AuthLink>
        </>
      }
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 18 }}
        className="mb-6 grid place-items-center"
      >
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30">
          <MailCheck className="h-8 w-8" />
        </span>
      </motion.div>
      <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-xs text-slate-400">
        The link expires in 24 hours. If it’s missing, check your spam folder or register again with
        the same email.
      </p>
    </AuthLayout>
  );
}
