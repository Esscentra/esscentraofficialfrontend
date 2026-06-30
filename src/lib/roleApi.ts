import api from "./api";

export interface Role {
  _id: string;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

export const getRoles = async (): Promise<Role[]> => {
  const response = await api.get<ApiResponse<Role[]>>("/roles");
  return response.data.data;
};

export const createRole = async (data: {
  name: string;
  description: string;
}) => {
  const response = await api.post("/roles", data);
  return response.data;
};

export const updateRole = async (
  id: string,
  data: {
    name: string;
    description: string;
  },
) => {
  const response = await api.put(`/roles/${id}`, data);
  return response.data;
};

export const deleteRole = async (id: string) => {
  const response = await api.delete(`/roles/${id}`);
  return response.data;
};
