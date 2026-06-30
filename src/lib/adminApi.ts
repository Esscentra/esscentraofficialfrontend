import api from './api';
import { mapAccount, type RawAccount } from './authApi';
import type { ApiResponse, Role, User } from '@/types';

/**
 * Admin-only user management — wired to the live Esscentra backend.
 *
 * Endpoints (all require an ADMIN session — see role.middleware `isAdmin`):
 *   GET   /users            → list every account              (UserController.getAllUsers)
 *   PATCH /users/:id/role   → change a user's role, body { roleId }  (updateUserRole)
 *   GET   /roles            → list roles (used to map name → _id)     (RoleController.getAllRoles)
 *
 * Note: the backend identifies a role by its Mongo _id, so changing a role
 * means sending the target role's `roleId`, not its name.
 */

/**
 * GET /users  (admin only)
 * The backend returns a plain array of user DTOs under `data`.
 */
export async function listUsers(): Promise<User[]> {
  const { data } = await api.get<ApiResponse<RawAccount[]>>('/users');
  return (data.data ?? []).map(mapAccount);
}

/* --------------------------------- Roles ---------------------------------- */

/** Raw role as returned by the backend (Mongo doc). */
interface RawRole {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  createdAt?: string;
}

function mapRole(r: RawRole): Role {
  return {
    id: r._id ?? r.id ?? '',
    name: r.name,
    description: r.description,
    createdAt: r.createdAt,
  };
}

export interface RoleInput {
  name: string;
  description?: string;
}

/** Normalise a role form into the body the backend expects (name stored uppercase). */
function rolePayload(input: RoleInput) {
  return { name: input.name.trim().toUpperCase(), description: input.description ?? '' };
}

/**
 * GET /roles  (admin only)
 * Lists all roles. Also used to resolve a role name → its _id elsewhere.
 */
export async function listRoles(): Promise<Role[]> {
  const { data } = await api.get<ApiResponse<RawRole[]>>('/roles');
  return (data.data ?? []).map(mapRole);
}

/**
 * POST /roles  (admin only)
 * Body { name, description }. Backend stores `name` uppercased and returns 201.
 */
export async function createRole(input: RoleInput): Promise<Role> {
  const { data } = await api.post<ApiResponse<RawRole>>('/roles', rolePayload(input));
  return mapRole(data.data);
}

/**
 * PUT /roles/:id  (admin only)
 * Body { name?, description? }. Returns the updated role.
 */
export async function updateRole(roleId: string, input: RoleInput): Promise<Role> {
  const { data } = await api.put<ApiResponse<RawRole>>(`/roles/${roleId}`, rolePayload(input));
  return mapRole(data.data);
}

/**
 * DELETE /roles/:id  (admin only)
 */
export async function deleteRole(roleId: string): Promise<void> {
  await api.delete(`/roles/${roleId}`);
}

/**
 * PATCH /users/:id/role  (admin only)
 * Body: { roleId }. Returns the updated user (with its role populated).
 */
export async function updateUserRole(userId: string, roleId: string): Promise<User> {
  // Backend populates `roleId` ({ _id, name }) on the response rather than a
  // flat `role` string, so normalise it before mapAccount runs.
  const { data } = await api.patch<ApiResponse<RawAccount & { roleId?: { name?: string } }>>(
    `/users/${userId}/role`,
    { roleId },
  );
  const raw = data.data;
  return mapAccount({ ...raw, role: raw.role ?? raw.roleId?.name });
}
