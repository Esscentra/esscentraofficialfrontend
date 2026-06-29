import api from './api';
import { mapAccount, type RawAccount } from './authApi';
import type { ApiResponse, User } from '@/types';

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  /** New avatar file, sent as `profileImage`. */
  profileImage?: File;
}

/**
 * PUT /users/profile (multipart)
 * Updates name/phone and, optionally, the avatar image. Returns the updated user.
 */
export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  const form = new FormData();
  if (input.firstName !== undefined) form.append('firstName', input.firstName);
  if (input.lastName !== undefined) form.append('lastName', input.lastName);
  if (input.phone !== undefined) form.append('phone', input.phone);
  if (input.profileImage) form.append('profileImage', input.profileImage);

  const { data } = await api.put<ApiResponse<RawAccount>>('/users/profile', form, {
    // Let the browser set the multipart boundary.
    headers: { 'Content-Type': undefined } as never,
  });

  return mapAccount(data.data);
}
