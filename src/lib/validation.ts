import { z } from 'zod';

const email = z.string().min(1, 'Email is required').email('Enter a valid email address');
const password = z.string().min(8, 'Password must be at least 8 characters');

/* ---------------------------------- Register --------------------------------- */
export const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email,
    password,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Please accept the terms to continue' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type RegisterValues = z.infer<typeof registerSchema>;

/* ----------------------------------- Login ----------------------------------- */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().default(true),
});
export type LoginValues = z.infer<typeof loginSchema>;

/* ------------------------------- Forgot password ------------------------------ */
export const forgotSchema = z.object({ email });
export type ForgotValues = z.infer<typeof forgotSchema>;

/* ------------------------------- Reset password ------------------------------- */
export const resetSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type ResetValues = z.infer<typeof resetSchema>;

/* ---------------------------------- Profile ---------------------------------- */
/** Blank is allowed wherever a field is optional — it means "clear this". */
const optionalText = z.string().optional().or(z.literal(''));

export const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  phone: optionalText,

  /* --------------------------- author profile --------------------------- */
  // Shown on the byline and author card of any blog post this account writes.
  jobTitle: optionalText,
  bio: z
    .string()
    .max(400, 'Keep the bio under 400 characters')
    .optional()
    .or(z.literal('')),
  socialGithub: optionalText,
  socialX: optionalText,
  socialLinkedin: optionalText,
  socialWebsite: optionalText,
});
export type ProfileValues = z.infer<typeof profileSchema>;

/* ------------------------------ Change password ------------------------------ */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
