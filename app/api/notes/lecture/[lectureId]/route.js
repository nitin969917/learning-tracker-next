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

        const [notes] = await pool.execute(
            'SELECT * FROM notes WHERE user_id = ? AND lecture_id = ?',
            [userId, lectureId]
        );

        if (notes.length === 0) {
            return NextResponse.json({ content: '' });
        }

        return NextResponse.json(notes[0]);
    } catch (error) {
        console.error('Get note error:', error);
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
        const { content } = await req.json();

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

        // Check if note exists
        const [existingNotes] = await pool.execute(
            'SELECT id FROM notes WHERE user_id = ? AND lecture_id = ?',
            [userId, lectureId]
        );

        if (existingNotes.length > 0) {
            // Update existing note
            await pool.execute(
                'UPDATE notes SET content = ? WHERE user_id = ? AND lecture_id = ?',
                [content || '', userId, lectureId]
            );
        } else {
            // Create new note
            await pool.execute(
                'INSERT INTO notes (user_id, lecture_id, content) VALUES (?, ?, ?)',
                [userId, lectureId, content || '']
            );
        }

        const [updatedNote] = await pool.execute(
            'SELECT * FROM notes WHERE user_id = ? AND lecture_id = ?',
            [userId, lectureId]
        );

        return NextResponse.json(updatedNote[0] || { content: content || '' });
    } catch (error) {
        console.error('Save note error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
