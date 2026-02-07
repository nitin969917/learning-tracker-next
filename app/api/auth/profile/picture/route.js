import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../[...nextauth]/route';
import pool from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(req) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        const [users] = await pool.execute('SELECT profile_picture FROM users WHERE id = ?', [userId]);
        const currentPic = users[0]?.profile_picture;

        // Remove from DB
        await pool.execute('UPDATE users SET profile_picture = NULL WHERE id = ?', [userId]);

        // Remove file if local
        if (currentPic && currentPic.startsWith('/uploads/')) {
            const filePath = path.join(process.cwd(), 'public', currentPic);
            try {
                await unlink(filePath);
            } catch (e) {
                console.error('Failed to delete file:', e);
                // Continue even if file delete fails
            }
        }

        // Fetch updated user
        const [updatedUsers] = await pool.execute(
            `SELECT u.id, u.username, u.email, u.profile_picture, u.auth_provider, u.created_at,
        ed.degree, ed.institution, ed.graduation_year, ed.field_of_study, ed.current_level
        FROM users u
        LEFT JOIN educational_details ed ON u.id = ed.user_id
        WHERE u.id = ?`,
            [userId]
        );

        return NextResponse.json({ user: updatedUsers[0] });

    } catch (error) {
        console.error('Delete profile picture error:', error);
        return NextResponse.json({ error: 'Failed to delete profile picture' }, { status: 500 });
    }
}
