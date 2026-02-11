import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { searchYouTube } from '@/lib/youtube';

export async function GET(req) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.user.id;

        // 1. Get user's field of study
        const [users] = await pool.execute(
            'SELECT field_of_study FROM educational_details WHERE user_id = ?',
            [userId]
        );

        let fieldOfStudy = users.length > 0 ? users[0].field_of_study : null;

        // 2. Determine search query
        // If no field of study, use a generic educational query
        const searchQuery = fieldOfStudy
            ? `${fieldOfStudy} engineering playlist computer science subjects`
            : 'best educational youtube playlists for students';

        // 3. Search YouTube
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
        }

        const suggestions = await searchYouTube(searchQuery, apiKey);

        // Filter to prioritize playlists if any found, but return both
        return NextResponse.json(suggestions);
    } catch (error) {
        console.error('Suggestions API error:', error);
        return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
    }
}
