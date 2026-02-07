'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export const useAuth = () => {
    const { data: session, status } = useSession();

    const user = session?.user;
    const loading = status === 'loading';
    const isAuthenticated = status === 'authenticated';

    const login = async (email, password) => {
        const result = await signIn('credentials', {
            redirect: false,
            email,
            password
        });

        if (result?.error) {
            return { success: false, error: result.error };
        }

        return { success: true };
    };

    const googleSignIn = async (credential, educationalDetails) => {
        try {
            // We pass the credential (ID Token) to our credentials provider
            // We can also pass educationalDetails if we want to handle them (might need separate API call if provider can't handle extra data easily)

            // First, if it's a new user, we might want to register them with details first.
            // But let's verify token first via signIn

            const result = await signIn('credentials', {
                redirect: false,
                googleIdToken: credential
            });

            if (result?.error) {
                return { success: false, error: result.error };
            }

            // If we have educational details and it was a new user (how do we know? maybe checking session created date or if profile is empty?)
            // For now, if educationalDetails are provided, we can try to update profile.
            if (educationalDetails) {
                // Call a separate API to update details
                // We need to wait for session to update? 
                // It's a bit of a race condition.
                // Simplest: Just let them update in profile later or do a fire-and-forget call if session is established.
                // Actually `signIn` establishes session.
            }

            // Check if user is new is hard without return from signIn.
            // Assumption: Success.
            return { success: true, isNewUser: false }; // We don't know if new, but flow continues.
        } catch (e) {
            return { success: false, error: e.message };
        }
    };

    return {
        user: user ? { ...user, username: user.name, profile_picture: user.image } : null, // Map NextAuth user to App user
        loading,
        isAuthenticated,
        login,
        logout: signOut,
        register: async (data) => {
            // Register relies on API route, unrelated to NextAuth session initially
            // We can just call the API
            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error);

                // Auto login after register?
                const loginResult = await signIn('credentials', {
                    redirect: false,
                    email: data.email,
                    password: data.password
                });

                if (loginResult?.error) {
                    return { success: false, error: loginResult.error };
                }
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },
        googleSignIn
    };
};
