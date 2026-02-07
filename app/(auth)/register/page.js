'use client';

import { useRouter } from 'next/navigation';
import GoogleSignIn from '@/components/GoogleSignIn';

export default function RegisterPage() {
    const router = useRouter();

    const handleGoogleSuccess = () => {
        router.push('/dashboard');
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Register</h1>
                <p className="auth-subtitle">
                    Use your Google account to create your learning tracker profile.
                </p>

                <GoogleSignIn onSuccess={handleGoogleSuccess} showEducationalForm={true} />

                <p className="auth-footer">
                    Already have an account? Just login with the same Google account.
                </p>
            </div>
        </div>
    );
}
