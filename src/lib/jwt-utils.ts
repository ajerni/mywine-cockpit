import crypto from 'crypto';
import dotenv from 'dotenv';

// Explicitly load .env file
dotenv.config({ path: '.env' });

function getJwtSecretFromEnv(): string {
    // Force reload environment variables
    dotenv.config({ path: '.env', override: true });
    
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not set in environment');
    }
    
    // Log secret details for debugging
    console.log('JWT Secret loaded:', {
        length: secret.length,
        firstChar: secret[0],
        lastChar: secret[secret.length - 1],
        fromDotEnv: true
    });
    
    return secret;
}

export function getJwtSecretHash(): string {
    const secret = getJwtSecretFromEnv();
    // Create a hash of the secret to safely compare
    return crypto.createHash('sha256').update(secret).digest('hex');
}

export function verifyJwtSecretFormat(): { 
    isValid: boolean; 
    details: { 
        length: number;
        containsSpaces: boolean;
        startsWithSpaces: boolean;
        endsWithSpaces: boolean;
        encoding: string;
        hexView: string;
    }; 
} {
    const secret = getJwtSecretFromEnv();

    // Get hex representation of each byte
    const hexView = Buffer.from(secret)
        .toString('hex')
        .match(/.{2}/g)
        ?.join(' ') || '';

    return {
        isValid: true,
        details: {
            length: secret.length,
            containsSpaces: /\s/.test(secret),
            startsWithSpaces: /^\s/.test(secret),
            endsWithSpaces: /\s$/.test(secret),
            encoding: Buffer.from(secret).toString('base64').substring(0, 10) + '...',
            hexView: hexView.substring(0, 30) + '...'
        }
    };
}

export function inspectJwtToken(token: string): {
    header: any;
    payload: any;
    signature: string;
} {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    
    // Base64Url to Base64
    const base64ToBase64Url = (str: string) => {
        return str.replace(/-/g, '+').replace(/_/g, '/');
    };
    
    // Add padding if needed
    const addPadding = (str: string) => {
        return str.padEnd(str.length + (4 - str.length % 4) % 4, '=');
    };

    return {
        header: JSON.parse(Buffer.from(addPadding(base64ToBase64Url(headerB64)), 'base64').toString()),
        payload: JSON.parse(Buffer.from(addPadding(base64ToBase64Url(payloadB64)), 'base64').toString()),
        signature: signatureB64
    };
}

export function debugJwtSecret(): void {
    try {
        const secret = getJwtSecretFromEnv();
        console.log('JWT Secret Debug:', {
            length: secret.length,
            rawFirstChars: secret.substring(0, 5),
            hexDump: Buffer.from(secret).toString('hex').match(/.{2}/g)?.join(' '),
            base64: Buffer.from(secret).toString('base64')
        });
    } catch (error) {
        console.error('Failed to debug JWT secret:', error);
    }
} 