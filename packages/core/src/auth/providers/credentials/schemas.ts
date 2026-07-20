import { z } from 'zod';

export const newPasswordSchema = z
  .string()
  .min(8)
  .max(64)
  .refine((p) => /[a-z]/.test(p), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((p) => /[A-Z]/.test(p), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((p) => /\d/.test(p), {
    message: 'Password must contain at least one number',
  })
  .refine((p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(p), {
    message: 'Password must contain at least one special character',
  });

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, {
    message: 'Password is required',
  }),
});

export const signUpSchema = z
  .object({
    email: z.string().email(),
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    code: z.string(),
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
