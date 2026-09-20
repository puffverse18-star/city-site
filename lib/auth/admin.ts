import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string().email('Format email invalide'),
  password: z.string().min(8, 'Le mot de passe doit comporter au moins 8 caractères'),
});

export class AdminAuthService {
  private static readonly BCRYPT_ROUNDS = 12;

  /**
   * Hashes a password using industry-standard bcrypt with 12 rounds.
   */
  public static async hashPassword(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, this.BCRYPT_ROUNDS);
  }

  /**
   * Verifies a password attempt against stored hash.
   */
  public static async verifyPassword(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }

  /**
   * Generates a high-entropy 256-bit random session token.
   */
  public static generateSessionToken(): { rawToken: string; tokenHash: string } {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, tokenHash };
  }

  /**
   * Generates secure cookie parameters for session persistence.
   */
  public static getSessionCookieConfig(isProduction: boolean) {
    return {
      name: 'city_admin_session',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      path: '/admin',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };
  }
}
