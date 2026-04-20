/**
 * Auth Validation Schemas — src/lib/authSchemas.ts
 *
 * Zod schemas for client-side form validation on login, register,
 * and forgot-password. Used with @hookform/resolvers/zod.
 */

import { z } from 'zod';

// ─── Login ────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ─── Register ─────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Forgot Password ──────────────────────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ─── Password strength calculator (0–4) ──────────────────────────────────────
export function getPasswordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8)               score++;
  if (password.length >= 12)              score++;
  if (/[A-Z]/.test(password))            score++;
  if (/[0-9]/.test(password))            score++;
  if (/[^A-Za-z0-9]/.test(password))     score++;
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}

export function getStrengthColor(score: 0 | 1 | 2 | 3 | 4): string {
  switch (score) {
    case 0: return 'transparent';
    case 1: return '#C0392B';   // red
    case 2: return '#D4882B';   // amber
    case 3: return '#D4A62B';   // yellow
    case 4: return '#4A8C5C';   // green
  }
}

export function getStrengthLabel(score: 0 | 1 | 2 | 3 | 4): string {
  switch (score) {
    case 0: return '';
    case 1: return 'Weak';
    case 2: return 'Fair';
    case 3: return 'Good';
    case 4: return 'Strong';
  }
}
