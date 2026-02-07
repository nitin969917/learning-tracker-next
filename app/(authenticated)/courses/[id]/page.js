'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import './course-detail.css';

export default function CourseDetailPage() {
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [lectures, setLectures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        youtube_url: '',
        difficulty: 'Medium',
        order_index: 0
    });

    useEffect(() => {
        fetchCourse();
    }, [id]);

    const fetchCourse = async () => {
        try {
            const response = await fetch(`/api/courses/${id}`);
            if (!response.ok) throw new Error('Failed to fetch course');
            const data = await response.json();
            setCourse(data);
            setLectures(data.lectures || []);
        } catch (err) {
            setError('Failed to load course');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    };

    const formatHours = (hours) => {
        if (!hours) return '0h';
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        if (h > 0 && m > 0) {
            return `${h}h ${m}m`;
        } else if (h > 0) {
            return `${h}h`;
        } else {
            return `${m}m`;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/lectures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    course_id: id
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create lecture');

            setFormData({
                title: '',
                youtube_url: '',
                difficulty: 'Medium',
                order_index: lectures.length
            });
            setShowForm(false);
            fetchCourse();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (lectureId) => {
        if (!window.confirm('Are you sure you want to delete this lecture?')) {
            return;
        }
        try {
            const response = await fetch(`/api/lectures/${lectureId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete lecture');

            fetchCourse();
        } catch (err) {
            setError(err.message);
        }
    };

    const toggleComplete = async (lecture) => {
        try {
            const response = await fetch(`/api/lectures/${lecture.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_completed: !lecture.is_completed
                })
            });
            if (!response.ok) throw new Error('Failed to update lecture');

            fetchCourse();
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return <div className="loading">Loading course...</div>;
    }

    if (!course) {
        return <div className="error">Course not found</div>;
    }

    return (
        <div className="course-detail">
            <div className="container">
                <Link href="/courses" className="back-link">← Back to Courses</Link>

                <div className="course-header">
                    <h1 className="page-title">{course.title}</h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="btn btn-primary"
                    >
                        {showForm ? 'Cancel' : '+ Add Lecture'}
                    </button>
                </div>

                <p className="course-description">{course.description || 'No description'}</p>

                {/* Course hours info */}
                {course.total_hours > 0 && (
                    <div className="course-hours-info">
                        <div className="hours-stat">
                            <span className="hours-label">Total Duration:</span>
                            <span className="hours-value">{formatHours(course.total_hours)}</span>
                        </div>
                        <div className="hours-stat">
                            <span className="hours-label">Completed:</span>
                            <span className="hours-value completed">{formatHours(course.completed_hours)}</span>
                        </div>
                        <div className="hours-progress-bar">
                            <div
                                className="hours-progress-fill"
                                style={{
                                    width: `${course.total_hours > 0 ? (course.completed_hours / course.total_hours) * 100 : 0}%`
                                }}
                            ></div>
                        </div>
                    </div>
                )}

                {error && <div className="error">{error}</div>}

                {showForm && (
                    <div className="card">
                        <h2>Add New Lecture</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Lecture Title *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">YouTube URL</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.youtube_url}
                                    onChange={(e) =>
                                        setFormData({ ...formData, youtube_url: e.target.value })
                                    }
                                    placeholder="https://www.youtube.com/watch?v=..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Difficulty</label>
                                <select
                                    className="form-select"
                                    value={formData.difficulty}
                                    onChange={(e) =>
                                        setFormData({ ...formData, difficulty: e.target.value })
                                    }
                                >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>

                            <button type="submit" className="btn btn-primary">
                                Add Lecture
                            </button>
                        </form>
                    </div>
                )}

                <div className="lectures-section">
                    <h2>Lectures ({lectures.length})</h2>
                    {lectures.length === 0 ? (
                        <div className="card">
                            <p className="no-data">No lectures yet. Add your first lecture!</p>
                        </div>
                    ) : (
                        <div className="lectures-list">
                            {lectures.map((lecture, index) => (
                                <div
                                    key={lecture.id}
                                    className={`lecture-item ${lecture.is_completed ? 'completed' : ''}`}
                                >
                                    <div className="lecture-number">{index + 1}</div>
                                    <div className="lecture-content">
                                        <div className="lecture-header">
                                            <h3>{lecture.title}</h3>
                                            <div className="lecture-actions">
                                                <span className={`difficulty-badge ${lecture.difficulty.toLowerCase()}`}>
                                                    {lecture.difficulty}
                                                </span>
                                                <button
                                                    onClick={() => toggleComplete(lecture)}
                                                    className={`btn-complete ${lecture.is_completed ? 'completed' : ''}`}
                                                >
                                                    {lecture.is_completed ? '✓ Completed' : 'Mark Complete'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(lecture.id)}
                                                    className="btn-delete-small"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        {lecture.youtube_url && (
                                            <p className="lecture-video">
                                                📹 Video: {lecture.youtube_url}
                                            </p>
                                        )}
                                        {lecture.duration_seconds > 0 && (
                                            <p className="lecture-duration">
                                                ⏱️ Duration: {formatDuration(lecture.duration_seconds)}
                                            </p>
                                        )}
                                        <Link
                                            href={`/lectures/${lecture.id}`}
                                            className="btn btn-primary btn-sm"
                                        >
                                            Open Lecture
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
