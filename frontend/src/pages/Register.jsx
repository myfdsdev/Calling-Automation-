import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { UserPlus, Loader2, Info } from 'lucide-react';
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
  companyName: z.string().min(1, 'Company name is required'),
});

export default function Register() {
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
      toast.success('Account created — welcome to LeadCall AI!');
      const pending = localStorage.getItem('pendingInviteToken');
      navigate(pending ? `/join/${pending}` : '/', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not create your account'));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleCredential = useCallback(
    async (credential) => {
      setGoogleSubmitting(true);
      try {
        await googleAuth({ credential, companyName: getValues('companyName') || '' });
        toast.success('Account ready - welcome to LeadCall AI!');
        const pending = localStorage.getItem('pendingInviteToken');
        navigate(pending ? `/join/${pending}` : '/', { replace: true });
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
      title="Create your account"
      subtitle="Sign up to accept a workspace invitation from your admin."
    >
      <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-border bg-surface-secondary p-3 text-[13px] text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-info-500" />
        <p>
          This app is invite-only. After signing up, open your invite link to join. Don&apos;t have
          an invite? Ask your admin to send you one.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Alex Morgan" {...register('name')} />
          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="companyName">Company name</Label>
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
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Create account
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
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
