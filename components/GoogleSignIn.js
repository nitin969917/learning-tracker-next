'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import './GoogleSignIn.css';

const GoogleSignIn = ({ onSuccess, showEducationalForm = false }) => {
    const { googleSignIn } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showEducationalDetails, setShowEducationalDetails] = useState(false);
    const [educationalDetails, setEducationalDetails] = useState({
        degree: '',
        institution: '',
        graduation_year: '',
        field_of_study: '',
        current_level: ''
    });
    const buttonRef = useRef(null);

    useEffect(() => {
        // Load Google Identity Services
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        script.onload = () => {
            if (window.google && window.google.accounts) {
                window.google.accounts.id.initialize({
                    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
                    callback: handleCredentialResponse,
                });

                // Render button
                if (buttonRef.current && window.google.accounts.id) {
                    window.google.accounts.id.renderButton(
                        buttonRef.current,
                        {
                            theme: 'outline',
                            size: 'large',
                            width: '100%',
                            text: 'signin_with',
                            locale: 'en'
                        }
                    );
                }
            }
        };

        return () => {
            // Cleanup
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, []);

    const handleCredentialResponse = async (response) => {
        setError('');
        setLoading(true);

        try {
            // Pass the credential (ID Token) to useAuth's googleSignIn
            const result = await googleSignIn(response.credential, showEducationalDetails ? educationalDetails : null);

            if (result.success) {
                if (result.isNewUser && showEducationalForm) {
                    setShowEducationalDetails(true);
                } else {
                    onSuccess && onSuccess();
                }
            } else {
                console.error("Google Sign In Error Result:", result);
                setError(typeof result.error === 'string' ? result.error : 'Google sign-in failed');
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setError('Google sign-in failed');
            setLoading(false);
        }
    };

    const handleEducationalSubmit = async (e) => {
        e.preventDefault();
        onSuccess && onSuccess();
    };

    return (
        <div className="google-signin-container">
            <div ref={buttonRef} className="google-signin-button-wrapper"></div>

            {error && <div className="error-message">{error}</div>}

            {showEducationalDetails && (
                <div className="educational-form">
                    <h3>Educational Details (Optional)</h3>
                    <form onSubmit={handleEducationalSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Current Level</label>
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
                                <label>Degree</label>
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
                            <label>Institution</label>
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
                                <label>Field of Study</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g., Computer Science"
                                    value={educationalDetails.field_of_study}
                                    onChange={(e) =>
                                        setEducationalDetails({
                                            ...educationalDetails,
                                            field_of_study: e.target.value
                                        })
                                    }
                                />
                            </div>

                            <div className="form-group">
                                <label>Graduation Year</label>
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

                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Processing...' : 'Continue'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default GoogleSignIn;
