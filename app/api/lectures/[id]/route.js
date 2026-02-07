import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { extractVideoId } from '@/lib/youtube';

export async function GET(req, { params }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        const { id } = await params;
        const lectureId = id;

        const [lectures] = await pool.execute(
            `SELECT l.*, c.user_id 
       FROM lectures l
       JOIN courses c ON l.course_id = c.id
       WHERE l.id = ? AND c.user_id = ?`,
            [lectureId, userId]
        );

        if (lectures.length === 0) {
            return NextResponse.json({ error: 'Lecture not found' }, { status: 404 });
        }

        return NextResponse.json(lectures[0]);
    } catch (error) {
        console.error('Get lecture error:', error);
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
        const lectureId = id;
        const { title, youtube_url, order_index, difficulty, is_completed } = await req.json();

        // Verify ownership
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

        // Extract video ID if URL provided
        let videoId = null;
        if (youtube_url) {
            videoId = extractVideoId(youtube_url);
        }

        // Update lecture
        const updateFields = [];
        const updateValues = [];

        if (title !== undefined) {
            updateFields.push('title = ?');
            updateValues.push(title);
        }
        if (youtube_url !== undefined) {
            updateFields.push('youtube_url = ?');
            updateValues.push(youtube_url);
            updateFields.push('youtube_video_id = ?');
            updateValues.push(videoId);
        }
        if (order_index !== undefined) {
            updateFields.push('order_index = ?');
            updateValues.push(order_index);
        }
        if (difficulty !== undefined) {
            updateFields.push('difficulty = ?');
            updateValues.push(difficulty);
        }
        if (is_completed !== undefined) {
            updateFields.push('is_completed = ?');
            updateValues.push(is_completed);
            if (is_completed) {
                updateFields.push('completed_at = NOW()');
            } else {
                updateFields.push('completed_at = NULL');
            }
        }

        if (updateFields.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        updateValues.push(lectureId);

        await pool.execute(
            `UPDATE lectures SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Track study activity if completed
        if (is_completed) {
            const today = new Date().toISOString().split('T')[0];
            await pool.execute(
                `INSERT INTO study_activity (user_id, activity_date, lectures_completed)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE lectures_completed = lectures_completed + 1`,
                [userId, today]
            );
        }

        const [updatedLecture] = await pool.execute(
            'SELECT * FROM lectures WHERE id = ?',
            [lectureId]
        );

        return NextResponse.json(updatedLecture[0]);
    } catch (error) {
        console.error('Update lecture error:', error);
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
        const lectureId = id;

        // Verify ownership
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

        await pool.execute('DELETE FROM lectures WHERE id = ?', [lectureId]);

        return NextResponse.json({ message: 'Lecture deleted successfully' });
    } catch (error) {
        console.error('Delete lecture error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
