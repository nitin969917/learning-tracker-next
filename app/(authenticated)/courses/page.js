'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import './courses.css';

export default function CoursesPage() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        course_type: 'Custom Subject',
        playlist_url: ''
    });

    useEffect(() => {
        fetchCourses();
        if (searchParams.get('new') === 'true') {
            setShowForm(true);
        }
    }, [searchParams]);

    const fetchCourses = async () => {
        try {
            const response = await fetch('/api/courses');
            if (!response.ok) throw new Error('Failed to fetch courses');
            const data = await response.json();
            setCourses(data);
        } catch (err) {
            setError('Failed to load courses');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to create course');

            setFormData({
                title: '',
                description: '',
                course_type: 'Custom Subject',
                playlist_url: ''
            });
            setShowForm(false);
            fetchCourses();
            // Remove query param
            router.replace('/courses');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this course?')) {
            return;
        }
        try {
            const response = await fetch(`/api/courses/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete course');
            }

            fetchCourses();
        } catch (err) {
            setError(err.message);
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

    if (loading) {
        return <div className="loading">Loading courses...</div>;
    }

    return (
        <div className="courses-page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">My Courses</h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="btn btn-primary"
                    >
                        {showForm ? 'Cancel' : '+ New Course'}
                    </button>
                </div>

                {error && <div className="error">{error}</div>}

                {showForm && (
                    <div className="card">
                        <h2>Create New Course</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Course Title *</label>
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
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-textarea"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Course Type</label>
                                <select
                                    className="form-select"
                                    value={formData.course_type}
                                    onChange={(e) =>
                                        setFormData({ ...formData, course_type: e.target.value })
                                    }
                                >
                                    <option value="Custom Subject">Custom Subject</option>
                                    <option value="YouTube Playlist">YouTube Playlist</option>
                                </select>
                            </div>

                            {formData.course_type === 'YouTube Playlist' && (
                                <div className="form-group">
                                    <label className="form-label">YouTube Playlist URL</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.playlist_url}
                                        onChange={(e) =>
                                            setFormData({ ...formData, playlist_url: e.target.value })
                                        }
                                        placeholder="https://www.youtube.com/playlist?list=..."
                                        required
                                    />
                                    <p className="field-hint">
                                        Paste the full playlist link. All videos will be auto-added
                                        as lectures (if the backend has a YouTube API key).
                                    </p>
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary">
                                Create Course
                            </button>
                        </form>
                    </div>
                )}

                {courses.length === 0 ? (
                    <div className="card">
                        <p className="no-data">
                            No courses yet. Create your first course to get started!
                        </p>
                    </div>
                ) : (
                    <div className="courses-grid">
                        {courses.map((course) => (
                            <div key={course.id} className="course-card">
                                <div className="course-card-header">
                                    <h3>{course.title}</h3>
                                    <button
                                        onClick={() => handleDelete(course.id)}
                                        className="btn-delete"
                                        title="Delete course"
                                    >
                                        ×
                                    </button>
                                </div>
                                <p className="course-description">{course.description || 'No description'}</p>
                                <div className="course-meta">
                                    <span className="course-type">{course.course_type}</span>
                                    <span className="course-lectures">
                                        {course.completed_lectures} / {course.total_lectures} lectures
                                    </span>
                                </div>
                                {course.total_hours > 0 && (
                                    <div className="course-hours-meta">
                                        <span className="course-hours">
                                            ⏱️ {formatHours(course.total_hours)} total
                                            {course.completed_hours > 0 && (
                                                <span className="completed-hours">
                                                    {' • '}
                                                    {formatHours(course.completed_hours)} completed
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )}
                                <div className="course-progress-section">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${course.completion_percentage}%` }}
                                        ></div>
                                    </div>
                                    <span className="progress-text">
                                        {course.completion_percentage}% complete
                                    </span>
                                </div>
                                <Link
                                    href={`/courses/${course.id}`}
                                    className="btn btn-primary btn-block"
                                >
                                    View Course
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
