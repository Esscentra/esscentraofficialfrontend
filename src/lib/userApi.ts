import api from './api';
import { mapAccount, type RawAccount } from './authApi';
import type { ApiResponse, User } from '@/types';

/**
 * GET /users/profile
 * Returns the full profile (incl. phone + profileImage) for the signed-in user.
 * Preferred over /auth/me, which omits phone and profileImage.
 */
export async function getProfile(): Promise<User> {
  const { data } = await api.get<ApiResponse<RawAccount>>('/users/profile');
  return mapAccount(data.data);
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  /** New avatar file, sent as `profileImage`. */
  profileImage?: File;

  /* ---------------------------- author profile ---------------------------- */
  // Shown on the byline of blog posts. The socials go up as flat fields
  // because FormData cannot carry a nested object; the backend reassembles
  // them into `socials` — and only when at least one was sent, so an avatar
  // change on its own never clears the links.
  bio?: string;
  jobTitle?: string;
  socialGithub?: string;
  socialX?: string;
  socialLinkedin?: string;
  socialWebsite?: string;
}

/**
 * PUT /users/profile (multipart)
 * Updates name/phone/author profile and, optionally, the avatar image.
 * Returns the updated user.
 */
export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  const form = new FormData();
  if (input.firstName !== undefined) form.append('firstName', input.firstName);
  if (input.lastName !== undefined) form.append('lastName', input.lastName);
  if (input.phone !== undefined) form.append('phone', input.phone);
  if (input.bio !== undefined) form.append('bio', input.bio);
  if (input.jobTitle !== undefined) form.append('jobTitle', input.jobTitle);
  if (input.socialGithub !== undefined) form.append('socialGithub', input.socialGithub);
  if (input.socialX !== undefined) form.append('socialX', input.socialX);
  if (input.socialLinkedin !== undefined) {
    form.append('socialLinkedin', input.socialLinkedin);
  }
  if (input.socialWebsite !== undefined) {
    form.append('socialWebsite', input.socialWebsite);
  }
  if (input.profileImage) form.append('profileImage', input.profileImage);

  const { data } = await api.put<ApiResponse<RawAccount>>('/users/profile', form, {
    // Let the browser set the multipart boundary.
    headers: { 'Content-Type': undefined } as never,
  });

  return mapAccount(data.data);
}
