import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

export async function POST(req) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        const { lecture_id, parent_id, content } = await req.json();

        if (!lecture_id || !content) {
            return NextResponse.json({ error: 'Lecture ID and content are required' }, { status: 400 });
        }

        // Verify lecture access
        const [lectures] = await pool.execute(
            `SELECT l.id 
       FROM lectures l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = ? AND c.user_id = ?`,
            [lecture_id, userId]
        );

        if (lectures.length === 0) {
            return NextResponse.json({ error: 'Lecture not found' }, { status: 404 });
        }

        // If parent_id provided, verify it exists
        if (parent_id) {
            const [parents] = await pool.execute(
                'SELECT id FROM discussions WHERE id = ? AND lecture_id = ?',
                [parent_id, lecture_id]
            );
            if (parents.length === 0) {
                return NextResponse.json({ error: 'Parent discussion not found' }, { status: 404 });
            }
        }

        const [result] = await pool.execute(
            'INSERT INTO discussions (lecture_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
            [lecture_id, userId, parent_id || null, content]
        );

        const [newDiscussion] = await pool.execute(
            `SELECT d.*, u.username 
       FROM discussions d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = ?`,
            [result.insertId]
        );

        return NextResponse.json(newDiscussion[0], { status: 201 });
    } catch (error) {
        console.error('Create discussion error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
