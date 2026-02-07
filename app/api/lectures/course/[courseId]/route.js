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
        const { courseId } = await params;

        // Verify course ownership
        const [courses] = await pool.execute(
            'SELECT id FROM courses WHERE id = ? AND user_id = ?',
            [courseId, userId]
        );

        if (courses.length === 0) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        const [lectures] = await pool.execute(
            'SELECT * FROM lectures WHERE course_id = ? ORDER BY order_index ASC, created_at ASC',
            [courseId]
        );

        return NextResponse.json(lectures);
    } catch (error) {
        console.error('Get lectures error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
