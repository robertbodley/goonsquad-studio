import type { Context } from 'hono';

interface JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

export async function verifySupabaseJWT(token: string, supabaseUrl: string): Promise<JWTPayload | null> {
  try {
    // Extract JWT parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode header and payload
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1])) as JWTPayload;

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.error('Token expired');
      return null;
    }

    // Check if this is HS256 (local Supabase) or RS256 (production)
    if (header.alg === 'HS256') {
      // Local Supabase uses HS256 with a fixed JWT secret
      const jwtSecret = 'super-secret-jwt-token-with-at-least-32-characters-long';

      const encoder = new TextEncoder();
      const keyData = encoder.encode(jwtSecret);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );

      const data = encoder.encode(`${parts[0]}.${parts[1]}`);
      const signature = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

      const isValid = await crypto.subtle.verify(
        'HMAC',
        cryptoKey,
        signature,
        data
      );

      if (!isValid) {
        console.error('HS256 signature verification failed');
        return null;
      }

      return payload;
    } else if (header.alg === 'RS256') {
      // Production Supabase uses RS256 with JWKS
      const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
      const jwksResponse = await fetch(jwksUrl);
      if (!jwksResponse.ok) {
        console.error('Failed to fetch JWKS');
        return null;
      }

      const jwks = await jwksResponse.json();
      const key = jwks.keys?.find((k: { kid: string }) => k.kid === header.kid);

      if (!key) {
        console.error('Key not found in JWKS');
        return null;
      }

      // Import the key
      const cryptoKey = await crypto.subtle.importKey(
        'jwk',
        key,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      );

      // Verify signature
      const encoder = new TextEncoder();
      const data = encoder.encode(`${parts[0]}.${parts[1]}`);
      const signature = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

      const isValid = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        signature,
        data
      );

      if (!isValid) {
        console.error('RS256 signature verification failed');
        return null;
      }

      return payload;
    } else {
      console.error('Unsupported algorithm:', header.alg);
      return null;
    }
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export async function requireAuth(c: Context): Promise<JWTPayload | Response> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  const supabaseUrl = c.env.SUPABASE_URL;

  const payload = await verifySupabaseJWT(token, supabaseUrl);

  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  return payload;
}
