'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './youtube.css';

export default function YouTubeResourcesPage() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tabs & Search State
    const [activeTab, setActiveTab] = useState('library'); // 'library' or 'browse'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    // Import State
    const [importing, setImporting] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [suggestedResources, setSuggestedResources] = useState([]);
    const [fetchingSuggestions, setFetchingSuggestions] = useState(false);

    // Preview Modal State
    const [previewVideo, setPreviewVideo] = useState(null); // { id, title }

    const router = useRouter();

    useEffect(() => {
        fetchResources();
        fetchSuggestions();
    }, []);

    const fetchSuggestions = async () => {
        setFetchingSuggestions(true);
        try {
            const response = await fetch('/api/youtube/suggestions');
            if (response.ok) {
                const data = await response.json();
                setSuggestedResources(data);
            }
        } catch (err) {
            console.error('Failed to fetch suggestions:', err);
        } finally {
            setFetchingSuggestions(false);
        }
    };

    const fetchResources = async () => {
        try {
            const response = await fetch('/api/courses');
            const data = await response.json();
            // Filter might need adjustment based on how API returns data
            // In original, it filtered by course_type or string includes.
            // My API might return all courses.
            const ytResources = data.filter(course =>
                course.course_type === 'YouTube Playlist' ||
                (typeof course.description === 'string' && course.description.includes('YouTube')) ||
                (typeof course.title === 'string' && course.title.includes('YouTube'))
            );
            setCourses(ytResources);
        } catch (err) {
            console.error(err);
            setError('Failed to load resources');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (e, urlOverride = null) => {
        if (e) e.preventDefault();
        const urlToUse = urlOverride || newUrl;

        if (!urlToUse) return;

        setImporting(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playlist_url: urlToUse,
                    title: '', // Backend should extract title
                    course_type: 'YouTube Playlist'
                })
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to import YouTube content');

            setSuccess(`Successfully imported: ${data.title}`);
            if (!urlOverride) setNewUrl('');
            fetchResources();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setImporting(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearching(true);
        setSearchError('');
        setSearchResults([]);

        try {
            const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
            if (!response.ok) throw new Error('Failed to search');
            const data = await response.json();
            setSearchResults(data);
        } catch (err) {
            console.error(err);
            setSearchError('Failed to search YouTube. Please try again.');
        } finally {
            setSearching(false);
        }
    };

    const handleAddFromSearch = (item) => {
        if (importing) return;
        const url = item.type === 'video'
            ? `https://www.youtube.com/watch?v=${item.id}`
            : `https://www.youtube.com/playlist?list=${item.id}`;

        handleImport(null, url);
    };

    const openPreview = (item) => {
        setPreviewVideo(item);
    };

    const closePreview = () => {
        setPreviewVideo(null);
    };

    const getThumbnail = (course) => {
        if (course.playlist_url) {
            const vidMatch = course.playlist_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
            if (vidMatch) {
                return `https://img.youtube.com/vi/${vidMatch[1]}/mqdefault.jpg`;
            }
        }
        return 'https://www.iconpacks.net/icons/2/free-youtube-logo-icon-2431-thumb.png';
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="youtube-page">
            <div className="container">
                <div className="youtube-header">
                    <h1>YouTube Resources</h1>
                    <p>Browse, preview, and track YouTube learning content.</p>
                </div>

                <div className="tab-nav">
                    <button
                        className={`tab-btn ${activeTab === 'library' ? 'active' : ''}`}
                        onClick={() => setActiveTab('library')}
                    >
                        My Library
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
                        onClick={() => setActiveTab('browse')}
                    >
                        Browse YouTube
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('suggestions')}
                    >
                        Suggested for You
                    </button>
                </div>

                {error && <div className="error-msg global-error">{error}</div>}
                {success && <div className="success-msg global-success">{success}</div>}

                {activeTab === 'library' && (
                    <>
                        <div className="import-section">
                            <h3>Quick Import</h3>
                            <form onSubmit={handleImport} className="import-form">
                                <input
                                    type="text"
                                    className="form-input import-input"
                                    placeholder="Paste YouTube Video or Playlist URL"
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary import-btn"
                                    disabled={importing || !newUrl}
                                >
                                    {importing ? 'Importing...' : 'Import'}
                                </button>
                            </form>
                        </div>

                        <div className="resources-grid">
                            {courses.length > 0 ? (
                                courses.map(course => (
                                    <div key={course.id} className="resource-card" onClick={() => router.push(`/courses/${course.id}`)}>
                                        <div className="resource-thumb">
                                            <img src={getThumbnail(course)} alt={course.title} onError={(e) => e.target.src = 'https://www.iconpacks.net/icons/2/free-youtube-logo-icon-2431-thumb.png'} />
                                            <span className="resource-type-badge">
                                                {course.course_type === 'YouTube Playlist' ? 'Playlist' : 'Video'}
                                            </span>
                                        </div>
                                        <div className="resource-info">
                                            <h3>{course.title}</h3>
                                            <div className="resource-stats">
                                                <span>{course.total_lectures} items</span>
                                                <span>{course.completion_percentage}% complete</span>
                                            </div>
                                            <div className="progress-bar-sm">
                                                <div
                                                    className="progress-fill-sm"
                                                    style={{ width: `${course.completion_percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-resources">
                                    <p>No YouTube resources imported yet.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'suggestions' && (
                    <div className="suggestions-section">
                        <div className="section-header-row">
                            <h3>Recommended for your Branch</h3>
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={fetchSuggestions}
                                disabled={fetchingSuggestions}
                            >
                                {fetchingSuggestions ? 'Refreshing...' : 'Refresh'}
                            </button>
                        </div>

                        {fetchingSuggestions && suggestedResources.length === 0 ? (
                            <div className="loading">Finding best resources for your background...</div>
                        ) : (
                            <div className="search-results-grid">
                                {suggestedResources.map(item => (
                                    <div key={item.id} className="search-card">
                                        <div className="search-thumb" onClick={() => openPreview(item)}>
                                            <img src={item.thumbnail} alt={item.title} />
                                            <span className="resource-type-badge">{item.type}</span>
                                            <div className="play-overlay">▶</div>
                                        </div>
                                        <div className="search-info">
                                            <h3 dangerouslySetInnerHTML={{ __html: item.title }}></h3>
                                            <p className="channel-name">{item.channelTitle}</p>
                                            <div className="search-actions">
                                                <button
                                                    className={`btn btn-sm btn-secondary preview-btn`}
                                                    onClick={() => openPreview(item)}
                                                >
                                                    Preview
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-primary add-btn"
                                                    onClick={() => handleAddFromSearch(item)}
                                                    disabled={importing}
                                                >
                                                    {importing ? 'Adding...' : '+ Add'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {suggestedResources.length === 0 && !fetchingSuggestions && (
                                    <div className="no-results">
                                        No specific suggestions found. Try updating your branch in the Profile.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'browse' && (
                    <div className="browse-section">
                        <form onSubmit={handleSearch} className="search-form">
                            <input
                                type="text"
                                className="form-input search-input"
                                placeholder="Search for topics (e.g., 'React Hooks', 'Python for Beginners')..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button type="submit" className="btn btn-primary search-btn" disabled={searching}>
                                {searching ? 'Searching...' : 'Search'}
                            </button>
                        </form>

                        {searchError && <div className="error-msg">{searchError}</div>}

                        <div className="search-results-grid">
                            {searchResults.map(item => (
                                <div key={item.id} className="search-card">
                                    <div className="search-thumb" onClick={() => openPreview(item)}>
                                        <img src={item.thumbnail} alt={item.title} />
                                        <span className="resource-type-badge">{item.type}</span>
                                        <div className="play-overlay">▶</div>
                                    </div>
                                    <div className="search-info">
                                        <h3 dangerouslySetInnerHTML={{ __html: item.title }}></h3>
                                        <p className="channel-name">{item.channelTitle}</p>
                                        <div className="search-actions">
                                            <button
                                                className="btn btn-sm btn-secondary preview-btn"
                                                onClick={() => openPreview(item)}
                                            >
                                                Preview
                                            </button>
                                            <button
                                                className="btn btn-sm btn-primary add-btn"
                                                onClick={() => handleAddFromSearch(item)}
                                                disabled={importing}
                                            >
                                                {importing ? 'Adding...' : '+ Add'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {searchResults.length === 0 && !searching && searchQuery && !searchError && (
                                <div className="no-results">No results found.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Video Preview Modal */}
                {previewVideo && (
                    <div className="video-modal-overlay" onClick={closePreview}>
                        <div className="video-modal-content" onClick={e => e.stopPropagation()}>
                            <button className="close-modal-btn" onClick={closePreview}>×</button>
                            <div className="video-frame">
                                <iframe
                                    src={previewVideo.type === 'playlist'
                                        ? `https://www.youtube.com/embed/videoseries?list=${previewVideo.id}&autoplay=1`
                                        : `https://www.youtube.com/embed/${previewVideo.id}?autoplay=1`
                                    }
                                    title={previewVideo.title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                            <div className="modal-footer">
                                <h3>{previewVideo.title}</h3>
                                <button
                                    className="btn btn-primary add-btn-modal"
                                    onClick={() => {
                                        handleAddFromSearch(previewVideo);
                                        closePreview();
                                    }}
                                >
                                    + Add to Library
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
