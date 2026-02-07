import { withAuth } from 'next-auth/middleware';

export default withAuth({
    pages: {
        signIn: '/login',
    },
});

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/courses/:path*',
        '/lectures/:path*',
        '/profile/:path*',
        '/youtube/:path*',
        '/',
    ],
};
