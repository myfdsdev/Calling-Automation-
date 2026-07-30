import { useCallback, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PhoneCall, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { AuthShell } from '@/pages/partials/AuthShell';
import { GoogleAuthButton } from '@/components/common/GoogleAuthButton';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const { login, googleAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await login(values);
      toast.success('Welcome back!');
      navigate(
        localStorage.getItem('pendingInviteToken')
          ? '/accept-invite'
          : location.state?.from?.pathname || '/',
        { replace: true },
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not sign in'));
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleCredential = useCallback(
    async (credential) => {
      setGoogleSubmitting(true);
      try {
        await googleAuth({ credential });
        toast.success('Welcome back!');
        navigate(
        localStorage.getItem('pendingInviteToken')
          ? '/accept-invite'
          : location.state?.from?.pathname || '/',
        { replace: true },
      );
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not sign in with Google'));
      } finally {
        setGoogleSubmitting(false);
      }
    },
    [googleAuth, location.state?.from?.pathname, navigate],
  );

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your LeadCall AI workspace.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" {...register('email')} />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput id="password" placeholder="••••••••" {...register('password')} />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
          Sign in
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleAuthButton
        text="signin_with"
        disabled={submitting || googleSubmitting}
        onCredential={onGoogleCredential}
      />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}
