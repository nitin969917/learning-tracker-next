import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import pool from '@/lib/db';

export async function POST(req) {
    try {
        const { username, email, password, educationalDetails } = await req.json();

        if (!username || !email || !password) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return NextResponse.json(
                { error: 'User already exists' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await hash(password, 10);

        // Insert user
        const [result] = await pool.execute(
            `INSERT INTO users (
        username, email, password, auth_provider,
        degree, institution, graduation_year, field_of_study, current_level
      ) VALUES (?, ?, ?, 'email', ?, ?, ?, ?, ?)`,
            [
                username,
                email,
                hashedPassword,
                educationalDetails?.degree || null,
                educationalDetails?.institution || null,
                educationalDetails?.graduation_year || null,
                educationalDetails?.field_of_study || null,
                educationalDetails?.current_level || null
            ]
        );

        return NextResponse.json(
            {
                message: 'User registered successfully',
                user: { id: result.insertId, username, email }
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Server error during registration' },
            { status: 500 }
        );
    }
}
