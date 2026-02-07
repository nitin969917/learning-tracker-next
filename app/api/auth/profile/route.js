import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET(req) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        const [users] = await pool.execute(
            `SELECT u.id, u.username, u.email, u.profile_picture, u.auth_provider, u.created_at,
        ed.degree, ed.institution, ed.graduation_year, ed.field_of_study, ed.current_level
        FROM users u
        LEFT JOIN educational_details ed ON u.id = ed.user_id
        WHERE u.id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user: users[0] });
    } catch (error) {
        console.error('Profile fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }
}

export async function PUT(req) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const formData = await req.formData();

    const username = formData.get('username');
    const educationalDetails = formData.get('educationalDetails');
    const profilePicture = formData.get('profile_picture');

    let profilePicturePath = null;

    if (profilePicture && typeof profilePicture === 'object') {
        const buffer = Buffer.from(await profilePicture.arrayBuffer());
        const filename = `${userId}-${Date.now()}-${profilePicture.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const uploadDir = path.join(process.cwd(), 'public/uploads');

        try {
            await mkdir(uploadDir, { recursive: true });
            await writeFile(path.join(uploadDir, filename), buffer);
            profilePicturePath = `/uploads/${filename}`;
        } catch (e) {
            console.error('Upload error:', e);
            return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
        }
    }

    try {
        const connection = await pool.getConnection(); // Use explicit connection for transaction
        await connection.beginTransaction();

        if (username) {
            await connection.execute('UPDATE users SET username = ? WHERE id = ?', [username, userId]);
        }

        if (profilePicturePath) {
            await connection.execute('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePicturePath, userId]);
        }

        // Handle educational details
        // Assuming educationalDetails sends JSON string of full object
        if (educationalDetails) {
            const details = JSON.parse(educationalDetails);

            // Check if details exist
            const [existing] = await connection.execute('SELECT id FROM educational_details WHERE user_id = ?', [userId]);

            if (existing.length > 0) {
                await connection.execute(
                    `UPDATE educational_details SET 
                degree = ?, institution = ?, graduation_year = ?, field_of_study = ?, current_level = ?
                WHERE user_id = ?`,
                    [
                        details.degree || null,
                        details.institution || null,
                        details.graduation_year || null,
                        details.field_of_study || null,
                        details.current_level || null,
                        userId
                    ]
                );
            } else {
                await connection.execute(
                    `INSERT INTO educational_details 
                (user_id, degree, institution, graduation_year, field_of_study, current_level)
                VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        userId,
                        details.degree || null,
                        details.institution || null,
                        details.graduation_year || null,
                        details.field_of_study || null,
                        details.current_level || null
                    ]
                );
            }
        }

        await connection.commit();
        connection.release();

        // Fetch updated user
        const [users] = await pool.execute(
            `SELECT u.id, u.username, u.email, u.profile_picture, u.auth_provider, u.created_at,
        ed.degree, ed.institution, ed.graduation_year, ed.field_of_study, ed.current_level
        FROM users u
        LEFT JOIN educational_details ed ON u.id = ed.user_id
        WHERE u.id = ?`,
            [userId]
        );

        return NextResponse.json({ user: users[0] });

    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
