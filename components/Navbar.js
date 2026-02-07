'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

const Navbar = () => {
    const { user, logout } = useAuth();

    return (
        <nav className="navbar">
            <div className="navbar-content">
                <Link href="/dashboard" className="navbar-brand">
                    📚 Learning Tracker
                </Link>
                <div className="navbar-links">
                    <Link href="/dashboard" className="navbar-link">
                        Dashboard
                    </Link>
                    <Link href="/courses" className="navbar-link">
                        Courses
                    </Link>
                    <div className="navbar-user">
                        <Link href="/profile" className="navbar-link profile-link">
                            {user?.profile_picture ? (
                                <img
                                    src={user.profile_picture}
                                    alt={user.username}
                                    className="profile-picture-small"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextElementSibling.style.display = 'inline';
                                    }}
                                />
                            ) : null}
                            {!user?.profile_picture && <span>👤</span>}
                            <span>{user?.username}</span>
                        </Link>
                        <button onClick={() => logout()} className="logout-btn">
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
