'use client';

import { useRouter } from 'next/navigation';
import GoogleSignIn from '@/components/GoogleSignIn';

export default function LoginPage() {
    const router = useRouter();

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Login</h1>
                <p className="auth-subtitle">
                    Sign in with your Google account to continue.
                </p>

                <GoogleSignIn onSuccess={() => router.push('/dashboard')} />

                <p className="auth-footer">
                    Don&apos;t have an account? Just continue with Google and we’ll create one
                    for you.
                </p>
            </div>
        </div>
    );
}
