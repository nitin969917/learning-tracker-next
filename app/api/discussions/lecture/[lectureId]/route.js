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

        // Get all discussions (comments and replies)
        const [discussions] = await pool.execute(
            `SELECT d.*, u.username 
       FROM discussions d
       JOIN users u ON d.user_id = u.id
       WHERE d.lecture_id = ?
       ORDER BY d.created_at ASC`,
            [lectureId]
        );

        // Organize into tree structure
        const comments = discussions.filter(d => d.parent_id === null);
        const replies = discussions.filter(d => d.parent_id !== null);

        const organized = comments.map(comment => {
            const commentReplies = replies
                .filter(r => r.parent_id === comment.id)
                .map(r => ({
                    ...r,
                    replies: []
                }));
            return {
                ...comment,
                replies: commentReplies
            };
        });

        return NextResponse.json(organized);
    } catch (error) {
        console.error('Get discussions error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
