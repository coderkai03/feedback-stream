import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const encodedHash = process.env.ADMIN_PASSWORD_HASH;
    console.log('Encoded hash:', encodedHash);
    
    if (!encodedHash) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Decode the base64 hash
    const storedHash = Buffer.from(encodedHash, 'base64').toString();
    console.log('Decoded hash:', storedHash);

    const isValid = await verifyPassword(password, storedHash);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Generate JWT token
    const token = jwt.sign(
      { authenticated: true },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    return NextResponse.json({ 
      success: true, 
      token,
      message: 'Authentication successful' 
    });

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
