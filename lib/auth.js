import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import pool from "@/lib/db";

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // Support Google ID Token login
                if (credentials?.googleIdToken) {
                    console.log("Authorize called with googleIdToken");
                    try {
                        const { OAuth2Client } = require('google-auth-library');
                        const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

                        const ticket = await client.verifyIdToken({
                            idToken: credentials.googleIdToken,
                            audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                        });
                        const payload = ticket.getPayload();
                        console.log("Google Payload verified:", payload.email);
                        const { email, name, picture, sub: googleId } = payload;

                        // Check user in DB
                        console.log("Checking DB for user:", email);
                        const [users] = await pool.execute(
                            "SELECT * FROM users WHERE email = ?",
                            [email]
                        );

                        let user = users[0];

                        // If not exists, create
                        if (!user) {
                            console.log("User not found, creating new user");
                            const [result] = await pool.execute(
                                'INSERT INTO users (username, email, password, auth_provider, google_id, profile_picture) VALUES (?, ?, ?, ?, ?, ?)',
                                [name, email, null, 'google', googleId, picture]
                            );
                            user = { id: result.insertId, username: name, email, profile_picture: picture, auth_provider: 'google' };
                            console.log("New user created:", user.id);
                        } else {
                            console.log("User found:", user.id);
                            // Link account if needed
                            if (!user.google_id) {
                                console.log("Linking Google ID to existing user");
                                await pool.execute('UPDATE users SET google_id = ?, auth_provider = ?, profile_picture = ? WHERE id = ?', [googleId, 'google', picture, user.id]);
                            }
                        }

                        console.log("Returning user for session:", user.id);
                        return {
                            id: user.id.toString(),
                            name: user.username,
                            email: user.email,
                            image: user.profile_picture
                        };
                    } catch (e) {
                        console.error("Google Token Verification Failed", e);
                        return null;
                    }
                }

                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                try {
                    const [users] = await pool.execute(
                        "SELECT * FROM users WHERE email = ?",
                        [credentials.email]
                    );

                    const user = users[0];

                    if (!user || !user.password) {
                        throw new Error("Invalid credentials");
                    }

                    const isValid = await compare(credentials.password, user.password);

                    if (!isValid) {
                        throw new Error("Invalid credentials");
                    }

                    return {
                        id: user.id.toString(),
                        name: user.username,
                        email: user.email,
                        image: user.profile_picture
                    };
                } catch (error) {
                    console.error("Auth error:", error);
                    return null;
                }
            }
        }),
        // Note: GoogleProvider requires a Client Secret which is not in the original .env.
        // We will need to obtain one or use a different flow. For now keeping it commented or basic.

    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.picture = user.image;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.name = token.name;
                session.user.image = token.picture;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
        error: "/login"
    }
};
