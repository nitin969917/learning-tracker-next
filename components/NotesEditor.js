'use client';

import { useState, useEffect } from 'react';
import './NotesEditor.css';

const NotesEditor = ({ lectureId }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);

    useEffect(() => {
        fetchNotes();
    }, [lectureId]);

    const fetchNotes = async () => {
        try {
            const response = await fetch(`/api/notes/lecture/${lectureId}`);
            if (!response.ok) throw new Error('Failed to fetch notes');
            const data = await response.json();
            setContent(data.content || '');
        } catch (err) {
            console.error('Failed to load notes');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`/api/notes/lecture/${lectureId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            if (!response.ok) throw new Error('Failed to save notes');
            setLastSaved(new Date());
        } catch (err) {
            alert('Failed to save notes');
        } finally {
            setSaving(false);
        }
    };

    const handleAutoSave = () => {
        // Auto-save after 2 seconds of no typing
        const timeoutId = setTimeout(() => {
            if (content.trim()) {
                handleSave();
            }
        }, 2000);

        return () => clearTimeout(timeoutId);
    };

    useEffect(() => {
        if (!loading) {
            const cleanup = handleAutoSave();
            return cleanup;
        }
    }, [content, loading]);

    if (loading) {
        return <div className="loading">Loading notes...</div>;
    }

    return (
        <div className="notes-editor">
            <div className="notes-header">
                <h2>My Notes</h2>
                <div className="notes-actions">
                    {lastSaved && (
                        <span className="last-saved">
                            Saved {lastSaved.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        className="btn btn-primary"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Notes'}
                    </button>
                </div>
            </div>
            <textarea
                className="notes-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your notes here... You can use markdown formatting."
                rows={20}
            />
            <p className="notes-hint">
                💡 Your notes are automatically saved. You can also click "Save Notes" to save manually.
            </p>
        </div>
    );
};

export default NotesEditor;
