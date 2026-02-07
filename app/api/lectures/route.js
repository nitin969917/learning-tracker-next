import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { extractVideoId } from '@/lib/youtube';

export async function POST(req) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        const { course_id, title, youtube_url, order_index, difficulty } = await req.json();

        if (!course_id || !title) {
            return NextResponse.json({ error: 'Course ID and title are required' }, { status: 400 });
        }

        // Verify course ownership
        const [courses] = await pool.execute(
            'SELECT id FROM courses WHERE id = ? AND user_id = ?',
            [course_id, userId]
        );

        if (courses.length === 0) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        // Extract video ID
        const videoId = youtube_url ? extractVideoId(youtube_url) : null;

        const [result] = await pool.execute(
            'INSERT INTO lectures (course_id, title, youtube_url, youtube_video_id, order_index, difficulty) VALUES (?, ?, ?, ?, ?, ?)',
            [course_id, title, youtube_url || null, videoId, order_index || 0, difficulty || 'Medium']
        );

        const [newLecture] = await pool.execute(
            'SELECT * FROM lectures WHERE id = ?',
            [result.insertId]
        );

        return NextResponse.json(newLecture[0], { status: 201 });
    } catch (error) {
        console.error('Create lecture error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
