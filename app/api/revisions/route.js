import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(req) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.user.id;

        const [revisions] = await pool.execute(
            `SELECT r.*, l.title as lecture_title, c.title as course_title
       FROM revisions r
       JOIN lectures l ON r.lecture_id = l.id
       JOIN courses c ON l.course_id = c.id
       WHERE r.user_id = ?
       ORDER BY r.last_revised_at DESC`,
            [userId]
        );

        return NextResponse.json(revisions);
    } catch (error) {
        console.error('Get revisions error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
