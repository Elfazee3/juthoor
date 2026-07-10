'use client';
import { LoginOtpTab } from '@/components/Auth/LoginOtpTab';
import { EmailAndPassword } from '@/components/Auth/EmailAndPassword';
import { RedirectingPleaseWaitCard } from '@/components/Auth/RedirectingPleaseWaitCard';
import { RenderProviders } from '@/components/Auth/RenderProviders';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  signInWithPasswordAction,
  signInWithProviderAction,
} from '@/data/auth/auth';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { OTP_LENGTH } from '@/lib/auth/otpConfig';

export function Login({
  next,
  nextActionType: _nextActionType,
}: {
  next?: string;
  nextActionType?: string;
}) {
  const [redirectInProgress, setRedirectInProgress] = useState(false);
  const toastRef = useRef<string | number | undefined>(undefined);

  // Render the form client-side only. Form-filler browser extensions
  // stamp attributes (fdprocessedid) onto SSR'd inputs before React
  // hydrates, which breaks hydration and cascades into insertBefore /
  // hooks-order crashes inside the animated tabs. With no SSR'd form
  // there is nothing to corrupt.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const router = useRouter();

  function redirectToDashboard() {
    if (next) {
      router.push(`/auth/callback?next=${encodeURIComponent(next)}`);
    } else {
      router.push('/dashboard');
    }
  }

  const { execute: executePassword, status: passwordStatus } = useAction(
    signInWithPasswordAction,
    {
      onExecute: () => {
        toastRef.current = toast.loading('Logging in...');
      },
      onSuccess: () => {
        toast.success('Logged in!', {
          id: toastRef.current,
        });
        toastRef.current = undefined;
        redirectToDashboard();
        setRedirectInProgress(true);
      },
      onError: (error) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Sign in account failed ${String(error)}`;
        toast.error(errorMessage, {
          id: toastRef.current,
        });
        toastRef.current = undefined;
      },
    }
  );

  const { execute: executeProvider, status: providerStatus } = useAction(
    signInWithProviderAction,
    {
      onExecute: () => {
        toastRef.current = toast.loading('Requesting login...');
      },
      onSuccess: (payload) => {
        toast.success('Redirecting...', {
          id: toastRef.current,
        });
        toastRef.current = undefined;
        window.location.href = payload.data?.url || '/';
      },
      onError: () => {
        toast.error('Failed to login', {
          id: toastRef.current,
        });
        toastRef.current = undefined;
      },
    }
  );

  if (!mounted) {
    return (
      <div
        className="container max-w-lg mx-auto min-h-[470px]"
        aria-busy="true"
      />
    );
  }

  return (
    <div className="container items-center text-left max-w-lg mx-auto overflow-auto min-h-[470px]">
      {redirectInProgress ? (
        <RedirectingPleaseWaitCard
          message="Please wait while we redirect you to your dashboard."
          heading="Redirecting to Dashboard"
        />
      ) : (
        <div className="space-y-8 bg-background p-6 rounded-lg shadow-sm dark:border">
          <Tabs defaultValue="password" className="md:min-w-[400px]">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="otp">OTP Code</TabsTrigger>
              <TabsTrigger value="social-login">Social</TabsTrigger>
            </TabsList>
            <TabsContent value="otp">
              <Card className="border-none shadow-none">
                <CardHeader className="py-6 px-0">
                  <CardTitle>تسجيل الدخول إلى جذور</CardTitle>
                  <CardDescription>
                    سنرسل رمزًا من {OTP_LENGTH} أرقام إلى بريدك. We&apos;ll
                    email you an {OTP_LENGTH}-digit code.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 p-0">
                  <LoginOtpTab next={next} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="password">
              <Card className="border-none shadow-none">
                <CardHeader className="py-6 px-0">
                  <CardTitle>تسجيل الدخول إلى جذور</CardTitle>
                  <CardDescription>
                    ادخل بحسابك الذي أنشأته لجذور. Login with your Juthoor account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 p-0">
                  <EmailAndPassword
                    isLoading={passwordStatus === 'executing'}
                    onSubmit={(data) => {
                      executePassword({
                        email: data.email,
                        password: data.password,
                      });
                    }}
                    view="sign-in"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* magic-link tab removed — replaced by the OTP tab above */}
            <TabsContent value="social-login">
              <Card className="border-none shadow-none">
                <CardHeader className="py-6 px-0">
                  <CardTitle>تسجيل الدخول إلى جذور</CardTitle>
                  <CardDescription>
                    ادخل عبر حسابك على Google أو GitHub.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 p-0">
                  <RenderProviders
                    providers={['google', 'github', 'twitter']}
                    isLoading={providerStatus === 'executing'}
                    onProviderLoginRequested={(
                      provider: 'google' | 'github' | 'twitter'
                    ) => executeProvider({ provider, next })}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
