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
        const { id } = await params;
        const courseId = id;

        // Get course
        const [courses] = await pool.execute(
            'SELECT * FROM courses WHERE id = ? AND user_id = ?',
            [courseId, userId]
        );

        if (courses.length === 0) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        const course = courses[0];

        // Get lectures
        const [lectures] = await pool.execute(
            'SELECT * FROM lectures WHERE course_id = ? ORDER BY order_index ASC, created_at ASC',
            [courseId]
        );

        // Calculate total and completed hours
        const totalDuration = lectures.reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
        const completedDuration = lectures
            .filter(l => l.is_completed)
            .reduce((sum, l) => sum + (l.duration_seconds || 0), 0);

        return NextResponse.json({
            ...course,
            lectures,
            total_hours: parseFloat((totalDuration / 3600).toFixed(2)),
            completed_hours: parseFloat((completedDuration / 3600).toFixed(2))
        });
    } catch (error) {
        console.error('Get course error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        const { id } = await params;
        const courseId = id;
        const { title, description, course_type } = await req.json();

        // Verify ownership
        const [courses] = await pool.execute(
            'SELECT id FROM courses WHERE id = ? AND user_id = ?',
            [courseId, userId]
        );

        if (courses.length === 0) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        await pool.execute(
            'UPDATE courses SET title = ?, description = ?, course_type = ? WHERE id = ?',
            [title, description, course_type, courseId]
        );

        const [updatedCourse] = await pool.execute(
            'SELECT * FROM courses WHERE id = ?',
            [courseId]
        );

        return NextResponse.json(updatedCourse[0]);
    } catch (error) {
        console.error('Update course error:', error);
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
        const courseId = id;

        // Verify ownership
        const [courses] = await pool.execute(
            'SELECT id FROM courses WHERE id = ? AND user_id = ?',
            [courseId, userId]
        );

        if (courses.length === 0) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        await pool.execute('DELETE FROM courses WHERE id = ?', [courseId]);

        return NextResponse.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Delete course error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
