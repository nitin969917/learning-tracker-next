'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import './dashboard.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

export default function DashboardPage() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const response = await fetch('/api/analytics');
            if (!response.ok) throw new Error('Failed to fetch analytics');
            const data = await response.json();
            setAnalytics(data);
        } catch (err) {
            setError('Failed to load analytics');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    if (!analytics) {
        return <div className="loading">No data available</div>;
    }

    // Prepare weekly activity chart data
    const weeklyLabels = [];
    const weeklyData = [];

    if (analytics.weekly_activity) {
        // Logic to recreate the last 7 days chart from analytics
        // Assuming analytics.weekly_activity comes from API as logic existed in Express
        // But based on my analytics API route implementation, I returned the query result directly.
        // I need to process it similar to the frontend code.

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            weeklyLabels.push(dayName);

            const activity = analytics.weekly_activity.find(a => a.date === dateStr || a.date.split('T')[0] === dateStr);
            weeklyData.push(activity ? activity.lectures_completed : 0);
        }
    }

    const weeklyChartData = {
        labels: weeklyLabels,
        datasets: [
            {
                label: 'Lectures Completed',
                data: weeklyData,
                borderColor: 'rgb(102, 126, 234)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }
        ]
    };

    // Course progress chart
    const courseProgressData = {
        labels: analytics.course_progress.map(c => c.title),
        datasets: [
            {
                label: 'Completion %',
                data: analytics.course_progress.map(c => c.completion_percentage),
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)'
                ]
            }
        ]
    };

    return (
        <div className="dashboard">
            <div className="container">
                <h1 className="page-title">Dashboard</h1>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{analytics.total_courses}</div>
                        <div className="stat-label">Total Courses</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{analytics.completed_lectures}</div>
                        <div className="stat-label">Completed Lectures</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{analytics.completion_percentage}%</div>
                        <div className="stat-label">Overall Progress</div>
                    </div>
                    <div className="stat-card streak-card">
                        <div className="stat-value">🔥 {analytics.current_streak}</div>
                        <div className="stat-label">Day Streak</div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-2">
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Weekly Activity</h2>
                        </div>
                        <Line data={weeklyChartData} options={{
                            responsive: true,
                            plugins: {
                                legend: { display: false }
                            },
                            scales: {
                                y: { beginAtZero: true }
                            }
                        }} />
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Course Progress</h2>
                        </div>
                        {analytics.course_progress.length > 0 ? (
                            <Bar data={courseProgressData} options={{
                                responsive: true,
                                plugins: {
                                    legend: { display: false }
                                },
                                scales: {
                                    y: { beginAtZero: true, max: 100 }
                                }
                            }} />
                        ) : (
                            <p className="no-data">No courses yet. Create your first course!</p>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Quick Actions</h2>
                    </div>
                    <div className="quick-actions">
                        <Link href="/courses" className="btn btn-primary">
                            View All Courses
                        </Link>
                        <Link href="/courses?new=true" className="btn btn-success">
                            Create New Course
                        </Link>
                    </div>
                </div>

                {/* Recent Courses */}
                {analytics.course_progress.length > 0 && (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Your Courses</h2>
                        </div>
                        <div className="courses-list">
                            {analytics.course_progress.slice(0, 5).map((course) => (
                                <Link
                                    key={course.id}
                                    href={`/courses/${course.id}`}
                                    className="course-item"
                                >
                                    <div className="course-info">
                                        <h3>{course.title}</h3>
                                        <p>
                                            {course.completed_lectures} / {course.total_lectures} lectures completed
                                        </p>
                                    </div>
                                    <div className="course-progress">
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${course.completion_percentage}%` }}
                                            ></div>
                                        </div>
                                        <span>{course.completion_percentage}%</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
