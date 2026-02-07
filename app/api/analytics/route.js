import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(req) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.user.id;

        // Total courses
        const [courseCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM courses WHERE user_id = ?',
            [userId]
        );

        // Total lectures and completed
        const [lectureStats] = await pool.execute(
            `SELECT 
        COUNT(*) as total_lectures,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_lectures
       FROM lectures l
       JOIN courses c ON l.course_id = c.id
       WHERE c.user_id = ?`,
            [userId]
        );

        // Weekly activity (last 7 days)
        const [weeklyActivity] = await pool.execute(
            `SELECT 
        DATE(completed_at) as date,
        COUNT(*) as lectures_completed
       FROM lectures l
       JOIN courses c ON l.course_id = c.id
       WHERE c.user_id = ? 
         AND l.is_completed = 1 
         AND l.completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(completed_at)
       ORDER BY date ASC`,
            [userId]
        );

        // Study streak
        const [streakData] = await pool.execute(
            `SELECT activity_date, lectures_completed
       FROM study_activity
       WHERE user_id = ?
       ORDER BY activity_date DESC
       LIMIT 30`,
            [userId]
        );

        // Calculate current streak
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < streakData.length; i++) {
            // Convert yyyy-mm-dd string to date
            const activityDate = new Date(streakData[i].activity_date);
            activityDate.setHours(0, 0, 0, 0);

            const daysDiff = Math.floor((today - activityDate) / (1000 * 60 * 60 * 24));

            if (daysDiff === i && streakData[i].lectures_completed > 0) {
                currentStreak++;
            } else if (i === 0 && daysDiff === 0 && streakData[i].lectures_completed > 0) {
                currentStreak = 1;
            } else {
                break;
            }
        }

        // Revision statistics
        const [revisionStats] = await pool.execute(
            `SELECT 
        COUNT(DISTINCT lecture_id) as lectures_revised,
        SUM(revision_count) as total_revisions
       FROM revisions
       WHERE user_id = ?`,
            [userId]
        );

        // Course-wise completion
        const [courseProgress] = await pool.execute(
            `SELECT 
        c.id,
        c.title,
        COUNT(l.id) as total_lectures,
        SUM(CASE WHEN l.is_completed = 1 THEN 1 ELSE 0 END) as completed_lectures
       FROM courses c
       LEFT JOIN lectures l ON c.id = l.course_id
       WHERE c.user_id = ?
       GROUP BY c.id, c.title
       ORDER BY c.created_at DESC`,
            [userId]
        );

        const courseProgressWithPercentage = courseProgress.map(course => ({
            ...course,
            completion_percentage: course.total_lectures > 0
                ? Math.round((course.completed_lectures / course.total_lectures) * 100)
                : 0
        }));

        return NextResponse.json({
            total_courses: courseCount[0].count,
            total_lectures: lectureStats[0].total_lectures || 0,
            completed_lectures: lectureStats[0].completed_lectures || 0,
            completion_percentage: lectureStats[0].total_lectures > 0
                ? Math.round((lectureStats[0].completed_lectures / lectureStats[0].total_lectures) * 100)
                : 0,
            current_streak: currentStreak,
            weekly_activity: weeklyActivity,
            revision_stats: {
                lectures_revised: revisionStats[0].lectures_revised || 0,
                total_revisions: revisionStats[0].total_revisions || 0
            },
            course_progress: courseProgressWithPercentage
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
