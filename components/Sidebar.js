'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import '../app/globals.css'; // Ensure global styles are available if using utility classes, or specific sidebar css
import './Sidebar.css';

const Sidebar = () => {
    const { user } = useAuth();
    const pathname = usePathname();

    const isActive = (path) => {
        return pathname === path ? 'active' : '';
    };

    return (
        <div className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-logo">LT</div>
                <h1>Learning Tracker</h1>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section">
                    <p className="nav-section-title">MENU</p>
                    <Link href="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
                        <span className="nav-icon">🏠</span>
                        <span className="nav-text">Dashboard</span>
                    </Link>
                    <Link href="/courses" className={`nav-item ${isActive('/courses')}`}>
                        <span className="nav-icon">📚</span>
                        <span className="nav-text">Courses</span>
                    </Link>
                    <Link href="/youtube" className={`nav-item ${isActive('/youtube')}`}>
                        <span className="nav-icon">📺</span>
                        <span className="nav-text">YouTube</span>
                    </Link>
                </div>
            </nav>

            <div className="sidebar-footer">
                <Link href="/profile" className={`user-profile ${isActive('/profile')}`}>
                    {user?.profile_picture ? (
                        <img
                            src={user.profile_picture} // NextAuth provides absolute URL or relative if we mapped it right
                            alt={user.username}
                            className="sidebar-avatar"
                        />
                    ) : (
                        <div className="sidebar-avatar-placeholder">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="user-info">
                        <span className="user-name">{user?.username}</span>
                        <span className="user-role">Student</span>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default Sidebar;
