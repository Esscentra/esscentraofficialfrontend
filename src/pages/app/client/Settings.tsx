import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Building2,
  Camera,
  LifeBuoy,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section } from '@/components/finance/Controls';
import { CardGridSkeleton, ErrorState, InfoNote } from '@/components/finance/States';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  getClientCompany,
  updateClientCompany,
  type ClientCompany,
} from '@/lib/clientApi';
import { getProfile } from '@/lib/userApi';
import { useClientData } from './useClientData';
import { getErrorMessage } from '@/lib/utils';

/**
 * ============================================================================
 *  CLIENT SETTINGS — your company
 * ============================================================================
 *
 * The client maintains their own company record: name, logo, description,
 * industry and contact details. Once it is filled in, that company name is
 * what the app calls them everywhere — a client is dealt with as a company,
 * not as an individual.
 *
 * Saving refreshes the session profile so the header updates immediately
 * rather than after the next sign-in.
 * ============================================================================
 */
export default function ClientSettings() {
  const toast = useToast();
  const { user, setUser } = useAuth();

  const { data, loading, error, reload } = useClientData<ClientCompany>(
    () => getClientCompany(),
    [],
  );

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Revoke the object URL when it is replaced, so picking five logos in a row
  // does not leak five blobs.
  useEffect(() => {
    if (!logoFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const companyName = String(form.get('companyName') ?? '').trim();
    if (!companyName) {
      toast.error('Company name is required', 'It appears on every document.');
      return;
    }

    setSaving(true);
    try {
      await updateClientCompany({
        companyName,
        description: String(form.get('description') ?? ''),
        industry: String(form.get('industry') ?? ''),
        website: String(form.get('website') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('phone') ?? ''),
        address: String(form.get('address') ?? ''),
        city: String(form.get('city') ?? ''),
        state: String(form.get('state') ?? ''),
        country: String(form.get('country') ?? ''),
        ...(logoFile ? { logo: logoFile } : {}),
      });

      // Pull the session profile again so the header shows the new company
      // name and logo straight away.
      try {
        setUser(await getProfile());
      } catch {
        // A stale header is a cosmetic problem; the save itself succeeded.
      }

      setLogoFile(null);
      reload();
      toast.success('Company saved', 'This is how we will refer to you from now on.');
    } catch (thrown) {
      toast.error('Could not save', getErrorMessage(thrown));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Your account" title="Settings" />
        <CardGridSkeleton count={2} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader eyebrow="Your account" title="Settings" />
        <ErrorState message={error ?? 'No data was returned.'} onRetry={reload} />
      </div>
    );
  }

  const logoSrc = preview ?? data.logo;
  const incomplete = !data.description || !data.industry || !data.logo;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Your account"
        title="Settings"
        subtitle="Your company as we hold it. This name and logo are what you are known by across Esscentra."
      />

      {incomplete && (
        <InfoNote tone="info">
          Fill in your logo, industry and a short description — they appear on
          your portal and on the documents we raise for you.
        </InfoNote>
      )}

      <form onSubmit={onSubmit}>
        <Section
          title="Company details"
          description="Used on every invoice and agreement, and shown in place of your personal name."
        >
          <div className="glass-card p-6">
            {/* ------------------------------ identity ------------------------- */}
            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="group relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-400/30 to-brand-700/15 text-brand-200 ring-1 ring-brand-400/30"
                aria-label="Change company logo"
              >
                {logoSrc ? (
                  <img src={logoSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-8 w-8" />
                )}
                <span className="absolute inset-0 grid place-items-center bg-black/55 opacity-0 transition group-hover:opacity-100">
                  <Camera className="h-5 w-5 text-white" />
                </span>
              </button>

              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
              />

              <div className="min-w-0 flex-1">
                <Input
                  label="Company name"
                  name="companyName"
                  defaultValue={data.companyName}
                  placeholder="Acme Technologies Pvt Ltd"
                  required
                />
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {logoFile
                    ? 'New logo ready — save to apply it.'
                    : 'Click the logo to upload a new one. Square images work best.'}
                </p>
              </div>
            </div>

            {/* ------------------------------- about --------------------------- */}
            <div className="mt-6 space-y-4">
              <Textarea
                label="About the company"
                name="description"
                rows={4}
                defaultValue={data.description ?? ''}
                placeholder="What your company does, in a couple of sentences."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Industry"
                  name="industry"
                  defaultValue={data.industry ?? ''}
                  placeholder="Manufacturing, SaaS, Retail…"
                />
                <Input
                  label="Website"
                  name="website"
                  defaultValue={data.website ?? ''}
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Billing email"
                  name="email"
                  type="email"
                  defaultValue={data.email ?? ''}
                />
                <Input label="Phone" name="phone" defaultValue={data.phone ?? ''} />
              </div>

              <Input
                label="Address"
                name="address"
                defaultValue={data.address ?? ''}
                placeholder="Street and building"
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="City" name="city" defaultValue={data.city ?? ''} />
                <Input label="State" name="state" defaultValue={data.state ?? ''} />
                <Input label="Country" name="country" defaultValue={data.country ?? ''} />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save company details'}
              </Button>
            </div>
          </div>
        </Section>
      </form>

      <Section title="Where to go next" description="The rest of your account.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Action
            to="/profile"
            icon={UserRound}
            title="Your profile"
            hint={`Signed in as ${user?.email ?? 'your account'}`}
          />
          <Action
            to="/kyc"
            icon={ShieldCheck}
            title="Verification"
            hint="Complete or review your KYC"
          />
          <Action
            to="/app/tickets"
            icon={LifeBuoy}
            title="Raise a ticket"
            hint="Anything we can help with"
          />
        </div>
      </Section>

      <Section
        title="Notifications"
        description="How we reach you about your projects."
      >
        <div className="glass-card flex items-start gap-4 p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30">
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">
              Email and in-app alerts are on
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              We notify you when a project is delivered, an invoice is raised,
              and whenever someone replies to one of your tickets. Everything
              also appears under the bell in the header.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Action({
  to,
  icon: Icon,
  title,
  hint,
}: {
  to: string;
  icon: typeof Mail;
  title: string;
  hint: string;
}) {
  return (
    <Link to={to} className="glass-card card-lift flex items-start gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400/25 to-brand-700/10 text-brand-300 ring-1 ring-brand-500/30">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
      </div>
    </Link>
  );
}
