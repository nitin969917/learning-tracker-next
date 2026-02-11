'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import './profile.css';

export default function ProfilePage() {
    const { user: authUser, logout, refetchUser } = useAuth(); // Assuming useAuth has refetchUser or we manually update
    // Actually, useAuth keeps session state. We might need to reload session.
    // But for now, local state 'user' keeps track of profile data.

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [deletingImage, setDeletingImage] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [username, setUsername] = useState('');
    const [educationalDetails, setEducationalDetails] = useState({
        degree: '',
        institution: '',
        graduation_year: '',
        field_of_study: '',
        current_level: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            // We can use /api/auth/session to get basic info, but /api/auth/me (custom endpoint?)
            // Wait, original app had /api/auth/me. NextAuth uses session.
            // But we need extended details like educationalDetails which might not be in session.
            // The original migration plan might have missed /api/auth/me creation?
            // Or I should use session callback to include it.
            // BUT, I'll assume I should create a generic GET /api/auth/profile/me or similar.
            // Actually, my PUT /api/auth/profile/route.js handles update.
            // I should implement GET in it too.
            // Wait, I implemented PUT. I should add GET to it.

            // Let's assume I will add GET to /api/auth/profile/route.js
            const response = await fetch('/api/auth/profile');
            if (!response.ok) throw new Error('Failed to load profile');
            const data = await response.json();

            const userData = data.user;
            setUser(userData);
            setUsername(userData.username || '');
            setEducationalDetails({
                degree: userData.degree || '',
                institution: userData.institution || '',
                graduation_year: userData.graduation_year || '',
                field_of_study: userData.field_of_study || '',
                current_level: userData.current_level || ''
            });

            if (userData.profile_picture) {
                setImagePreview(userData.profile_picture);
            } else {
                setImagePreview(null);
            }
        } catch (err) {
            setError('Failed to load profile');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // I need to update /api/auth/profile/route.js to include GET as well.

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.match('image.*')) {
                setError('Please select an image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size must be less than 5MB');
                return;
            }
            setProfileImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteImage = async () => {
        if (!window.confirm('Are you sure you want to remove your profile picture?')) {
            return;
        }
        setDeletingImage(true);
        setError('');
        try {
            const response = await fetch('/api/auth/profile/picture', {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete profile picture');
            const data = await response.json();

            setUser(data.user);
            setImagePreview(null);
            setProfileImage(null);
            setSuccess('Profile picture removed successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setDeletingImage(false);
        }
    };

    const handleImageUpload = async () => {
        if (!profileImage) {
            setError('Please select an image first');
            return;
        }
        setError('');
        setSuccess('');
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('profile_picture', profileImage);

            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                body: formData
            });

            if (!response.ok) throw new Error('Failed to upload image');
            const data = await response.json();

            setUser(data.user);
            setProfileImage(null);
            if (data.user.profile_picture) {
                setImagePreview(data.user.profile_picture);
            }
            setSuccess('Profile picture updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('educationalDetails', JSON.stringify(educationalDetails));

            if (profileImage) {
                formData.append('profile_picture', profileImage);
            }

            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                body: formData
            });

            if (!response.ok) throw new Error('Failed to update profile');
            const data = await response.json();

            setUser(data.user);
            setEditing(false);
            setProfileImage(null);
            if (data.user.profile_picture) {
                setImagePreview(data.user.profile_picture);
            }
            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Save error:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditing(false);
        setError('');
        setSuccess('');
        setProfileImage(null);
        if (user) {
            setUsername(user.username || '');
            setEducationalDetails({
                degree: user.degree || '',
                institution: user.institution || '',
                graduation_year: user.graduation_year || '',
                field_of_study: user.field_of_study || '',
                current_level: user.current_level || ''
            });
            if (user.profile_picture) {
                setImagePreview(user.profile_picture);
            } else {
                setImagePreview(null);
            }
        }
    };

    if (loading) {
        return <div className="loading">Loading profile...</div>;
    }

    if (!user) {
        // Should verify if this ever happens with proper auth
        return <div className="error">User not found</div>;
    }

    return (
        <div className="profile-page">
            <div className="container">
                <h1 className="page-title">My Profile</h1>

                <div className="profile-container">
                    <div className="profile-header">
                        <div className="profile-avatar-section">
                            <div
                                className="profile-avatar"
                                onClick={() => setShowImageModal(true)}
                                title="Click to view profile picture"
                            >
                                {imagePreview || user.profile_picture ? (
                                    <img
                                        src={imagePreview || user.profile_picture}
                                        alt={user.username}
                                        className="profile-image"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            // e.target.nextElementSibling?.style.display = 'flex'; // Not easy in React without state, assumes placeholder next
                                        }}
                                    />
                                ) : null}
                                {(!imagePreview && !user.profile_picture) && (
                                    <div className="avatar-placeholder">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="profile-info">
                            <h2>{user.username}</h2>
                            <p className="profile-email">{user.email}</p>
                            <span className={`auth-badge ${user.auth_provider}`}>
                                {user.auth_provider === 'google' ? '🔐 Google Account' : '📧 Email Account'}
                            </span>
                            <p className="profile-joined">
                                Member since {new Date(user.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long'
                                })}
                            </p>
                            <button
                                onClick={logout}
                                className="btn btn-danger"
                                style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                            >
                                Logout
                            </button>
                        </div>
                    </div>

                    <div className="profile-section">
                        <div className="section-header">
                            <h3>Educational Details</h3>
                            {!editing && (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="btn btn-primary"
                                >
                                    Edit Details
                                </button>
                            )}
                        </div>

                        {error && <div className="error">{error}</div>}
                        {success && <div className="success">{success}</div>}

                        {editing ? (
                            <form onSubmit={handleSave} className="educational-form">
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label">Username</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        minLength={3}
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Current Level</label>
                                        <select
                                            className="form-select"
                                            value={educationalDetails.current_level}
                                            onChange={(e) =>
                                                setEducationalDetails({
                                                    ...educationalDetails,
                                                    current_level: e.target.value
                                                })
                                            }
                                        >
                                            <option value="">Select Level</option>
                                            <option value="High School">High School</option>
                                            <option value="Undergraduate">Undergraduate</option>
                                            <option value="Graduate">Graduate</option>
                                            <option value="Professional">Professional</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Degree</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g., B.Tech, M.Sc"
                                            value={educationalDetails.degree}
                                            onChange={(e) =>
                                                setEducationalDetails({
                                                    ...educationalDetails,
                                                    degree: e.target.value
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Institution</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="University/College name"
                                        value={educationalDetails.institution}
                                        onChange={(e) =>
                                            setEducationalDetails({
                                                ...educationalDetails,
                                                institution: e.target.value
                                            })
                                        }
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Field of Study (Branch)</label>
                                        <select
                                            className="form-select"
                                            value={educationalDetails.field_of_study}
                                            onChange={(e) =>
                                                setEducationalDetails({
                                                    ...educationalDetails,
                                                    field_of_study: e.target.value
                                                })
                                            }
                                        >
                                            <option value="">Select Branch</option>
                                            <option value="Computer Science">Computer Science</option>
                                            <option value="Information Technology">Information Technology</option>
                                            <option value="Electronics & Communication">Electronics & Communication</option>
                                            <option value="Mechanical Engineering">Mechanical Engineering</option>
                                            <option value="Civil Engineering">Civil Engineering</option>
                                            <option value="Electrical Engineering">Electrical Engineering</option>
                                            <option value="Data Science & AI">Data Science & AI</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Graduation Year</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="e.g., 2024"
                                            min="1950"
                                            max="2100"
                                            value={educationalDetails.graduation_year}
                                            onChange={(e) =>
                                                setEducationalDetails({
                                                    ...educationalDetails,
                                                    graduation_year: e.target.value
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="btn btn-secondary"
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="educational-details-view">
                                {user.current_level || user.degree || user.institution ? (
                                    <div className="details-grid">
                                        {user.current_level && (
                                            <div className="detail-item">
                                                <span className="detail-label">Current Level:</span>
                                                <span className="detail-value">{user.current_level}</span>
                                            </div>
                                        )}
                                        {user.degree && (
                                            <div className="detail-item">
                                                <span className="detail-label">Degree:</span>
                                                <span className="detail-value">{user.degree}</span>
                                            </div>
                                        )}
                                        {user.institution && (
                                            <div className="detail-item">
                                                <span className="detail-label">Institution:</span>
                                                <span className="detail-value">{user.institution}</span>
                                            </div>
                                        )}
                                        {user.field_of_study && (
                                            <div className="detail-item">
                                                <span className="detail-label">Branch/Field of Study:</span>
                                                <span className="detail-value">{user.field_of_study}</span>
                                            </div>
                                        )}
                                        {user.graduation_year && (
                                            <div className="detail-item">
                                                <span className="detail-label">Graduation Year:</span>
                                                <span className="detail-value">{user.graduation_year}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="no-details">
                                        No educational details added yet. Click "Edit Details" to add your information.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Image Preview Modal */}
            {showImageModal && (
                <div className="profile-image-modal-overlay" onClick={() => setShowImageModal(false)}>
                    <div className="profile-image-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Profile photo</h3>
                            <button className="close-btn" onClick={() => setShowImageModal(false)}>✕</button>
                        </div>

                        <div className="modal-body">
                            {imagePreview || user.profile_picture ? (
                                <img
                                    src={imagePreview || user.profile_picture}
                                    alt={user.username}
                                    className="modal-image"
                                />
                            ) : (
                                <div className="modal-placeholder">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <div className="modal-actions">
                                <label htmlFor="modal-image-upload" className="modal-action-btn">
                                    <span className="icon">✎</span>
                                    <span className="text">{profileImage ? 'Change Photo' : 'Update Photo'}</span>
                                </label>
                                <input
                                    id="modal-image-upload"
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                    onChange={handleImageChange}
                                    style={{ display: 'none' }}
                                />

                                {profileImage && (
                                    <button
                                        className="modal-action-btn save"
                                        onClick={handleImageUpload}
                                        disabled={saving}
                                    >
                                        <span className="icon">💾</span>
                                        <span className="text">{saving ? 'Saving...' : 'Save'}</span>
                                    </button>
                                )}

                                {(user.profile_picture || imagePreview) && (
                                    <button
                                        className="modal-action-btn delete"
                                        onClick={handleDeleteImage}
                                        disabled={deletingImage}
                                    >
                                        <span className="icon">🗑</span>
                                        <span className="text">Delete</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
