import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { extractPlaylistId, fetchPlaylistItems, extractVideoId, fetchVideoDetails } from '@/lib/youtube';

export async function GET(req) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.user.id;

        const [courses] = await pool.execute(
            `SELECT c.*, 
        COUNT(l.id) as total_lectures,
        SUM(CASE WHEN l.is_completed = 1 THEN 1 ELSE 0 END) as completed_lectures,
        COALESCE(SUM(l.duration_seconds), 0) as total_duration_seconds,
        COALESCE(SUM(CASE WHEN l.is_completed = 1 THEN l.duration_seconds ELSE 0 END), 0) as completed_duration_seconds
      FROM courses c
      LEFT JOIN lectures l ON c.id = l.course_id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC`,
            [userId]
        );

        // Calculate completion percentage and format hours
        const coursesWithProgress = courses.map(course => {
            const totalHours = (course.total_duration_seconds || 0) / 3600;
            const completedHours = (course.completed_duration_seconds || 0) / 3600;

            return {
                ...course,
                completion_percentage: course.total_lectures > 0
                    ? Math.round((course.completed_lectures / course.total_lectures) * 100)
                    : 0,
                total_hours: parseFloat(totalHours.toFixed(2)),
                completed_hours: parseFloat(completedHours.toFixed(2))
            };
        });

        return NextResponse.json(coursesWithProgress);
    } catch (error) {
        console.error('Get courses error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(req) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.user.id;
        const { title, description, course_type, playlist_url } = await req.json();

        const isPlaylistType = course_type === 'YouTube Playlist';

        if (!title && !playlist_url) {
            return NextResponse.json({ error: 'Course title or YouTube URL is required' }, { status: 400 });
        }

        let finalTitle = title;
        let finalDescription = description || '';
        let finalCourseType = course_type || 'Custom Subject';
        let playlistId = null;
        let videoId = null;
        let autoImport = false;

        // Detect YouTube Content
        if (playlist_url) {
            playlistId = extractPlaylistId(playlist_url);
            if (!playlistId) {
                // Check if it's a single video
                const extractedVideoId = extractVideoId(playlist_url);
                if (extractedVideoId) {
                    videoId = extractedVideoId;
                }
            }
        }

        // Single Video Import Logic
        if (videoId && !playlistId) {
            // It's a single video
            autoImport = true;
            // We'll treat single videos as "Custom Subject" with 1 lecture effectively
            finalCourseType = 'Custom Subject';

            if (process.env.YOUTUBE_API_KEY) {
                const details = await fetchVideoDetails(videoId, process.env.YOUTUBE_API_KEY);
                if (details) {
                    finalTitle = finalTitle || details.title;
                    finalDescription = finalDescription || 'Single YouTube Video Import';
                }
            }
            if (!finalTitle) finalTitle = 'YouTube Video Course';
        } else if (playlistId) {
            // Playlist Logic
            finalCourseType = 'YouTube Playlist';
            autoImport = true;
            if (!finalTitle) finalTitle = 'YouTube Playlist Course'; // Fallback
        }

        if (!finalTitle) {
            return NextResponse.json({ error: 'Course title needed' }, { status: 400 });
        }

        // Insert course
        const [result] = await pool.execute(
            'INSERT INTO courses (user_id, title, description, course_type, playlist_url, playlist_id) VALUES (?, ?, ?, ?, ?, ?)',
            [
                userId,
                finalTitle,
                finalDescription,
                finalCourseType,
                playlist_url || null,
                playlistId || null
            ]
        );

        let importedLectures = 0;

        // Import Logic
        if (autoImport && process.env.YOUTUBE_API_KEY) {
            try {
                if (playlistId) {
                    // Import Playlist
                    const items = await fetchPlaylistItems(
                        playlistId,
                        process.env.YOUTUBE_API_KEY
                    );

                    if (items.length > 0) {
                        let orderIndex = 0;
                        for (const item of items) {
                            const youtubeUrl = `https://www.youtube.com/watch?v=${item.videoId}&list=${playlistId}`;
                            await pool.execute(
                                'INSERT INTO lectures (course_id, title, youtube_url, youtube_video_id, duration_seconds, order_index, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)',
                                [
                                    result.insertId,
                                    item.title,
                                    youtubeUrl,
                                    item.videoId,
                                    item.duration_seconds || 0,
                                    orderIndex++,
                                    'Medium'
                                ]
                            );
                            importedLectures++;
                        }
                    }
                } else if (videoId) {
                    // Import Single Video
                    const details = await fetchVideoDetails(videoId, process.env.YOUTUBE_API_KEY);
                    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

                    await pool.execute(
                        'INSERT INTO lectures (course_id, title, youtube_url, youtube_video_id, duration_seconds, order_index, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [
                            result.insertId,
                            details?.title || finalTitle,
                            youtubeUrl,
                            videoId,
                            details?.duration_seconds || 0,
                            0,
                            'Medium'
                        ]
                    );
                    importedLectures++;
                }
            } catch (importError) {
                console.error('Import error:', importError);
            }
        }

        const [newCourse] = await pool.execute(
            'SELECT * FROM courses WHERE id = ?',
            [result.insertId]
        );

        return NextResponse.json({
            ...newCourse[0],
            playlist_imported_lectures: importedLectures
        }, { status: 201 });

    } catch (error) {
        console.error('Create course error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
