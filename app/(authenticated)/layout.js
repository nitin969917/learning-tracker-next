'use client';

import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthenticatedLayout({ children }) {
    const { user, loading, isAuthenticated } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            // Middleware handles server-side, this is client-side double check
            // redirect('/login');
        }
    }, [loading, isAuthenticated]);

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <div style={{ flex: 1, marginLeft: '260px', width: 'calc(100% - 260px)' }}>
                {/* Navbar is optional on desktop but good for mobile */}
                <Navbar />
                <main style={{ padding: '2rem' }}>
                    {children}
                </main>
            </div>

            {/* Mobile styles need to be handled. For now assuming desktop-first for migration speed */}
            <style jsx global>{`
        @media (max-width: 768px) {
           .sidebar {
               transform: translateX(-100%);
           }
           .sidebar.open {
               transform: translateX(0);
           }
           div[style*="marginLeft: 260px"] {
               margin-left: 0 !important;
               width: 100% !important;
           }
        }
      `}</style>
        </div>
    );
}
