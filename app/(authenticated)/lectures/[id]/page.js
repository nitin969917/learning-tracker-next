'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import NotesEditor from '@/components/NotesEditor';
import DiscussionThread from '@/components/DiscussionThread';
import './lecture-detail.css';

export default function LectureDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [lecture, setLecture] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(null);
    const [activeTab, setActiveTab] = useState('video');
    const [player, setPlayer] = useState(null);
    const playerRef = useRef(null);

    useEffect(() => {
        fetchLecture();
        fetchRevision();
    }, [id]);

    useEffect(() => {
        // Load YouTube IFrame API if not already loaded
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            if (firstScriptTag && firstScriptTag.parentNode) {
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            } else {
                document.body.appendChild(tag);
            }

            window.onYouTubeIframeAPIReady = () => {
                initializePlayer();
            };
        } else if (window.YT && window.YT.Player) {
            initializePlayer();
        }

        return () => {
            if (player && player.destroy) {
                // player.destroy(); // caused issues in some react versions, keeping safe
            }
        };
    }, [lecture?.youtube_video_id]); // Re-run if video ID changes

    const initializePlayer = () => {
        if (!lecture?.youtube_video_id) return;

        // Check if element exists
        const container = document.getElementById('youtube-player');
        if (!container) return;

        // Use a timeout to ensure DOM is ready and avoid race conditions
        setTimeout(() => {
            if (!window.YT || !window.YT.Player) return;

            try {
                // If player already exists, destroy it first? Or just reuse?
                // Simple approach: create new one.
                const ytPlayer = new window.YT.Player('youtube-player', {
                    videoId: lecture.youtube_video_id,
                    events: {
                        onStateChange: (event) => {
                            // State 0 = ENDED
                            if (event.data === window.YT.PlayerState.ENDED) {
                                // Check updated completion status reference or assume if it was playing it might need completion
                                // We can use a ref for lecture state if needed, but for now simple check
                                handleAutoComplete();
                            }
                        },
                        onReady: (event) => {
                            setPlayer(event.target);
                        }
                    }
                });
            } catch (err) {
                console.error('Failed to initialize YouTube player:', err);
            }
        }, 500);
    };

    const handleAutoComplete = async () => {
        // Fetch latest state to be sure? Or just optimistically update?
        // Check if already completed to avoid duplicate calls
        if (lecture?.is_completed) return;

        try {
            const response = await fetch(`/api/lectures/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_completed: true })
            });

            if (!response.ok) throw new Error('Failed to auto-complete lecture');

            fetchLecture();

            // Show notification
            const notification = document.createElement('div');
            notification.className = 'auto-complete-notification';
            notification.textContent = '✓ Video completed! Marked as done.';
            document.body.appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) notification.parentNode.removeChild(notification);
            }, 3000);
        } catch (err) {
            console.error('Failed to auto-complete lecture:', err);
        }
    };

    const fetchLecture = async () => {
        try {
            const response = await fetch(`/api/lectures/${id}`);
            if (!response.ok) throw new Error('Failed to fetch lecture');
            const data = await response.json();
            setLecture(data);
        } catch (err) {
            setError('Failed to load lecture');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRevision = async () => {
        try {
            const response = await fetch(`/api/revisions/lecture/${id}`);
            if (response.ok) {
                const data = await response.json();
                setRevision(data);
            }
        } catch (err) {
            console.error('Failed to load revision data');
        }
    };

    const handleComplete = async () => {
        try {
            const response = await fetch(`/api/lectures/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_completed: !lecture.is_completed })
            });
            if (!response.ok) throw new Error('Failed to update lecture');
            fetchLecture();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDifficultyChange = async (difficulty) => {
        try {
            const response = await fetch(`/api/lectures/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ difficulty })
            });
            if (!response.ok) throw new Error('Failed to update difficulty');
            fetchLecture();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleMarkRevision = async () => {
        try {
            const response = await fetch(`/api/revisions/lecture/${id}`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Failed to mark revision');
            const data = await response.json();
            setRevision(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return 'Unknown';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    if (loading) {
        return <div className="loading">Loading lecture...</div>;
    }

    if (!lecture) {
        return <div className="error">Lecture not found</div>;
    }

    // Determine if we show embed or message
    const videoId = lecture.youtube_video_id;
    const embedUrl = videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : null;

    return (
        <div className="lecture-detail">
            <div className="container">
                <Link href={`/courses/${lecture.course_id}`} className="back-link">
                    ← Back to Course
                </Link>

                <div className="lecture-header-card">
                    <div className="lecture-title-section">
                        <h1 className="lecture-title">{lecture.title}</h1>
                        <div className="lecture-meta">
                            <span className={`difficulty-badge ${lecture.difficulty?.toLowerCase() || 'medium'}`}>
                                {lecture.difficulty || 'Medium'}
                            </span>
                            {lecture.is_completed && (
                                <span className="completed-badge">✓ Completed</span>
                            )}
                            {revision && revision.revision_count > 0 && (
                                <span className="revision-badge">
                                    🔄 Revised {revision.revision_count} time(s)
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="lecture-actions">
                        <button
                            onClick={handleComplete}
                            className={`btn ${lecture.is_completed ? 'btn-secondary' : 'btn-success'}`}
                        >
                            {lecture.is_completed ? 'Mark Incomplete' : 'Mark Complete'}
                        </button>
                        <button onClick={handleMarkRevision} className="btn btn-primary">
                            Mark as Revised
                        </button>
                        <select
                            value={lecture.difficulty || 'Medium'}
                            onChange={(e) => handleDifficultyChange(e.target.value)}
                            className="form-select difficulty-select"
                        >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                        </select>
                    </div>
                </div>

                {error && <div className="error">{error}</div>}

                {/* Tabs */}
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'video' ? 'active' : ''}`}
                        onClick={() => setActiveTab('video')}
                    >
                        📹 Video
                    </button>
                    <button
                        className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('notes')}
                    >
                        📝 Notes
                    </button>
                    <button
                        className={`tab ${activeTab === 'discussion' ? 'active' : ''}`}
                        onClick={() => setActiveTab('discussion')}
                    >
                        💬 Discussion
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'video' && (
                        <div className="card">
                            {embedUrl ? (
                                <div className="video-container">
                                    <div id="youtube-player"></div>
                                    {lecture.duration_seconds > 0 && (
                                        <p className="video-duration">
                                            Duration: {formatDuration(lecture.duration_seconds)}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="no-video">
                                    <p>No video URL provided for this lecture.</p>
                                    {lecture.youtube_url && (
                                        <a
                                            href={lecture.youtube_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-primary"
                                        >
                                            Open YouTube Link
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div className="card">
                            <NotesEditor lectureId={id} />
                        </div>
                    )}

                    {activeTab === 'discussion' && (
                        <div className="card">
                            <DiscussionThread lectureId={id} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
