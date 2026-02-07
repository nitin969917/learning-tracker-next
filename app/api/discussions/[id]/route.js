import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

export async function PUT(req, { params }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        const { id } = await params;
        const discussionId = id;
        const { content } = await req.json();

        // Verify ownership
        const [discussions] = await pool.execute(
            'SELECT id FROM discussions WHERE id = ? AND user_id = ?',
            [discussionId, userId]
        );

        if (discussions.length === 0) {
            return NextResponse.json({ error: 'Discussion not found' }, { status: 404 });
        }

        await pool.execute(
            'UPDATE discussions SET content = ? WHERE id = ?',
            [content, discussionId]
        );

        const [updatedDiscussion] = await pool.execute(
            `SELECT d.*, u.username 
       FROM discussions d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = ?`,
            [discussionId]
        );

        return NextResponse.json(updatedDiscussion[0]);
    } catch (error) {
        console.error('Update discussion error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        const { id } = await params;
        const discussionId = id;

        // Verify ownership
        const [discussions] = await pool.execute(
            'SELECT id FROM discussions WHERE id = ? AND user_id = ?',
            [discussionId, userId]
        );

        if (discussions.length === 0) {
            return NextResponse.json({ error: 'Discussion not found' }, { status: 404 });
        }

        await pool.execute('DELETE FROM discussions WHERE id = ?', [discussionId]);

        return NextResponse.json({ message: 'Discussion deleted successfully' });
    } catch (error) {
        console.error('Delete discussion error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
