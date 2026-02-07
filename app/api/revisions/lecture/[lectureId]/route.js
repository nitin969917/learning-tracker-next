import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(req, { params }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        const { lectureId } = await params;

        const [revisions] = await pool.execute(
            'SELECT * FROM revisions WHERE user_id = ? AND lecture_id = ?',
            [userId, lectureId]
        );

        if (revisions.length === 0) {
            return NextResponse.json({ revision_count: 0, last_revised_at: null });
        }

        return NextResponse.json(revisions[0]);
    } catch (error) {
        console.error('Get revision error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(req, { params }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        const { lectureId } = await params;

        // Verify lecture access
        const [lectures] = await pool.execute(
            `SELECT l.id 
       FROM lectures l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = ? AND c.user_id = ?`,
            [lectureId, userId]
        );

        if (lectures.length === 0) {
            return NextResponse.json({ error: 'Lecture not found' }, { status: 404 });
        }

        // Check if revision exists
        const [existingRevisions] = await pool.execute(
            'SELECT * FROM revisions WHERE user_id = ? AND lecture_id = ?',
            [userId, lectureId]
        );

        if (existingRevisions.length > 0) {
            // Update revision count
            await pool.execute(
                'UPDATE revisions SET revision_count = revision_count + 1, last_revised_at = NOW() WHERE user_id = ? AND lecture_id = ?',
                [userId, lectureId]
            );
        } else {
            // Create new revision record
            await pool.execute(
                'INSERT INTO revisions (user_id, lecture_id, revision_count, last_revised_at) VALUES (?, ?, 1, NOW())',
                [userId, lectureId]
            );
        }

        const [updatedRevision] = await pool.execute(
            'SELECT * FROM revisions WHERE user_id = ? AND lecture_id = ?',
            [userId, lectureId]
        );

        return NextResponse.json(updatedRevision[0]);
    } catch (error) {
        console.error('Mark revision error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
