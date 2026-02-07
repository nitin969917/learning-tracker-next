import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchYouTube } from '@/lib/youtube';

export async function GET(req) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');

        if (!q) {
            return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
        }

        if (!process.env.YOUTUBE_API_KEY) {
            return NextResponse.json({ error: 'YouTube API is not configured on server' }, { status: 503 });
        }

        const results = await searchYouTube(q, process.env.YOUTUBE_API_KEY);
        return NextResponse.json(results);
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
