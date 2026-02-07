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
            const result = await signIn('credentials', {
                redirect: false,
                googleIdToken: credential
            });

            console.log("SignIn Result Full Object:", result);

            if (result?.error) {
                console.error("Sign in failed:", result.error);
                return { success: false, error: result.error };
            }

            if (result?.ok) {
                // You might want to do something here, like force a session update if needed
                // mostly session updates automatically.
                return { success: true, isNewUser: false };
            }

            return { success: false, error: "Unknown error during sign in" };
        } catch (e) {
            console.error("Google sign in exception:", e);
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
