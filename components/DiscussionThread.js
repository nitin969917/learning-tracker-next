'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import './DiscussionThread.css';

const DiscussionThread = ({ lectureId }) => {
    const [discussions, setDiscussions] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        fetchDiscussions();
    }, [lectureId]);

    const fetchDiscussions = async () => {
        try {
            const response = await fetch(`/api/discussions/lecture/${lectureId}`);
            if (!response.ok) throw new Error('Failed to load discussions');
            const data = await response.json();
            setDiscussions(data);
        } catch (err) {
            console.error('Failed to load discussions');
        } finally {
            setLoading(false);
        }
    };

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const response = await fetch('/api/discussions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lecture_id: lectureId,
                    content: newComment
                })
            });
            if (!response.ok) throw new Error('Failed to post comment');

            setNewComment('');
            fetchDiscussions();
        } catch (err) {
            alert('Failed to post comment');
        }
    };

    const handlePostReply = async (parentId) => {
        if (!replyContent.trim()) return;

        try {
            const response = await fetch('/api/discussions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lecture_id: lectureId,
                    parent_id: parentId,
                    content: replyContent
                })
            });
            if (!response.ok) throw new Error('Failed to post reply');

            setReplyContent('');
            setReplyingTo(null);
            fetchDiscussions();
        } catch (err) {
            alert('Failed to post reply');
        }
    };

    const handleDelete = async (discussionId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) {
            return;
        }

        try {
            const response = await fetch(`/api/discussions/${discussionId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete comment');

            fetchDiscussions();
        } catch (err) {
            alert('Failed to delete comment');
        }
    };

    if (loading) {
        return <div className="loading">Loading discussions...</div>;
    }

    return (
        <div className="discussion-thread">
            <h2>Discussion</h2>
            <p className="discussion-subtitle">
                Ask questions, share insights, and help your peers learn!
            </p>

            {/* Post new comment */}
            <form onSubmit={handlePostComment} className="comment-form">
                <textarea
                    className="form-textarea"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    rows={3}
                />
                <button type="submit" className="btn btn-primary">
                    Post Comment
                </button>
            </form>

            {/* Comments list */}
            <div className="comments-list">
                {discussions.length === 0 ? (
                    <p className="no-comments">No comments yet. Be the first to comment!</p>
                ) : (
                    discussions.map((comment) => (
                        <div key={comment.id} className="comment-item">
                            <div className="comment-header">
                                <div className="comment-author">
                                    <strong>{comment.username}</strong>
                                    <span className="comment-date">
                                        {new Date(comment.created_at).toLocaleString()}
                                    </span>
                                </div>
                                {comment.user_id === user?.id && (
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        className="btn-delete-comment"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                            <div className="comment-content">{comment.content}</div>

                            {/* Reply button */}
                            <button
                                onClick={() =>
                                    setReplyingTo(replyingTo === comment.id ? null : comment.id)
                                }
                                className="btn-reply"
                            >
                                {replyingTo === comment.id ? 'Cancel' : 'Reply'}
                            </button>

                            {/* Reply form */}
                            {replyingTo === comment.id && (
                                <div className="reply-form">
                                    <textarea
                                        className="form-textarea"
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder="Write a reply..."
                                        rows={2}
                                    />
                                    <button
                                        onClick={() => handlePostReply(comment.id)}
                                        className="btn btn-primary btn-sm"
                                    >
                                        Post Reply
                                    </button>
                                </div>
                            )}

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                                <div className="replies-list">
                                    {comment.replies.map((reply) => (
                                        <div key={reply.id} className="reply-item">
                                            <div className="reply-header">
                                                <strong>{reply.username}</strong>
                                                <span className="reply-date">
                                                    {new Date(reply.created_at).toLocaleString()}
                                                </span>
                                                {reply.user_id === user?.id && (
                                                    <button
                                                        onClick={() => handleDelete(reply.id)}
                                                        className="btn-delete-comment"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                            <div className="reply-content">{reply.content}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DiscussionThread;
