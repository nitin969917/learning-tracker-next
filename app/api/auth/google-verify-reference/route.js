import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import pool from '@/lib/db';
import { sign } from 'jsonwebtoken';
import { cookies } from 'next/headers';

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(req) {
    try {
        const { credential, educationalDetails } = await req.json();

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        // Check if user exists
        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        let user = users[0];
        let isNewUser = false;

        if (!user) {
            isNewUser = true;
            // Create user
            const [result] = await pool.execute(
                'INSERT INTO users (username, email, password, auth_provider, google_id, profile_picture) VALUES (?, ?, ?, ?, ?, ?)',
                [name, email, null, 'google', googleId, picture]
            );
            const userId = result.insertId;
            user = { id: userId, username: name, email, profile_picture: picture, auth_provider: 'google' };

            // Save educational details if provided
            if (educationalDetails) {
                await pool.execute(
                    `INSERT INTO educational_details 
            (user_id, degree, institution, graduation_year, field_of_study, current_level)
            VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        educationalDetails.degree || null,
                        educationalDetails.institution || null,
                        educationalDetails.graduation_year || null,
                        educationalDetails.field_of_study || null,
                        educationalDetails.current_level || null
                    ]
                );
            }
        } else {
            // Update Google ID if missing (linking accounts)
            if (!user.google_id) {
                await pool.execute('UPDATE users SET google_id = ?, auth_provider = ?, profile_picture = ? WHERE id = ?', [googleId, 'google', picture, user.id]);
            }
        }

        // Since we are using NextAuth, we ideally want to create a NextAuth session.
        // However, NextAuth Credentials provider doesn't easily support external tokens validation unless we hack it.
        // Alternative: We return success here, and the client calls signIn('credentials') with a special flag or token?
        // OR we use the "Custom Provider" approach.
        // BETTER APPROACH for seamless integration: Custom Credentials Provider that accepts { googleIdToken: ... }

        // BUT since I am already rewriting `useAuth`, I can make `useAuth` call `signIn('credentials', { googleIdToken: credential })`.
        // Then I update `lib/auth.js` to handle this case in `authorize`.

        return NextResponse.json({ success: true, user, isNewUser });
    } catch (error) {
        console.error('Google Auth Error:', error);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 400 });
    }
}
