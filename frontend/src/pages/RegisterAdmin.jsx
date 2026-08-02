import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ShieldPlus, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { AuthShell } from '@/pages/partials/AuthShell';
import { GoogleAuthButton } from '@/components/common/GoogleAuthButton';

const schema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
  companyName: z.string().min(1, 'Workspace / company name is required'),
});

const PERKS = [
  'Invite your team by email',
  'Grant each person only the features they need',
  'Everyone shares your workspace API keys',
];

export default function RegisterAdmin() {
  const { register: registerUser, googleAuth } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', companyName: '' },
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await registerUser(values);
      toast.success('Admin workspace ready — invite your team from the Users page.');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not create your workspace'));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleCredential = useCallback(
    async (credential) => {
      setGoogleSubmitting(true);
      try {
        await googleAuth({ credential, companyName: getValues('companyName') || '' });
        toast.success('Admin workspace ready — invite your team from the Users page.');
        navigate('/', { replace: true });
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not continue with Google'));
      } finally {
        setGoogleSubmitting(false);
      }
    },
    [getValues, googleAuth, navigate],
  );

  return (
    <AuthShell
      title="Create your Admin workspace"
      subtitle="Run outreach with a team — you invite users and control what each can do."
    >
      <div className="mb-5 space-y-2 rounded-xl border border-brand-200 bg-brand-50 p-3.5">
        {PERKS.map((p) => (
          <p key={p} className="flex items-center gap-2 text-[13px] text-brand-800">
            <Check className="h-4 w-4 flex-shrink-0 text-brand-600" /> {p}
          </p>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Alex Morgan" {...register('name')} />
          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="companyName">Workspace / company name</Label>
          <Input id="companyName" placeholder="BrightPixel Studio" {...register('companyName')} />
          {errors.companyName ? (
            <p className="text-xs text-destructive">{errors.companyName.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" placeholder="At least 8 characters" {...register('password')} />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldPlus className="h-4 w-4" />}
          Create Admin workspace
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleAuthButton
        text="signup_with"
        disabled={submitting || googleSubmitting}
        onCredential={onGoogleCredential}
      />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Just need a personal account?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Sign up here
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
