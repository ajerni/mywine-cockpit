import { NextResponse } from 'next/server';
import { getJwtSecretHash, verifyJwtSecretFormat, inspectJwtToken } from '@/lib/jwt-utils';
import { jwtVerify, SignJWT } from 'jose';

export async function GET() {
    try {
        const secretHash = getJwtSecretHash();
        const formatCheck = verifyJwtSecretFormat();

        // Create a test token and try to verify it locally
        const now = Math.floor(Date.now() / 1000);
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
        
        const testToken = await new SignJWT({ 
            sub: 'test@test.com',
            role: 'admin',
            exp: now + 300,
            iat: now
        })
        .setProtectedHeader({ 
            alg: 'HS256',
            typ: 'JWT'
        })
        .sign(secret);

        // Try to verify the token we just created
        let verificationResult;
        try {
            const verified = await jwtVerify(testToken, secret);
            verificationResult = {
                success: true,
                payload: verified.payload
            };
        } catch (verifyError) {
            verificationResult = {
                success: false,
                error: verifyError instanceof Error ? verifyError.message : 'Verification failed'
            };
        }

        return NextResponse.json({
            secretHash,
            formatDetails: formatCheck.details,
            testTokenVerification: verificationResult,
            testToken: inspectJwtToken(testToken)
        });
    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to verify JWT secret' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const { token } = await request.json();
        const secretHash = getJwtSecretHash();
        const formatCheck = verifyJwtSecretFormat();
        
        // Only inspect token if one is provided
        const tokenInspection = token ? inspectJwtToken(token) : null;

        return NextResponse.json({
            secretHash: secretHash,
            formatDetails: formatCheck.details,
            token: tokenInspection ? {
                header: tokenInspection.header,
                payload: tokenInspection.payload,
                signatureLength: tokenInspection.signature.length
            } : null
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to verify JWT secret' },
            { status: 500 }
        );
    }
}