import { backendRequest } from './client';
import type {
	Permission,
	Role,
	RoleCreate,
	RolePermissionsUpdate,
	RoleUpdate,
	User,
	UserAddress,
	UserAddressCreate,
	UserAddressList,
	UserAddressUpdate,
	UserCreate,
	UserList,
	UserRoleAssignment,
	UserUpdate,
} from './types';

export const usersApi = {
	list: (page = 1, shows = 100) => backendRequest<UserList>('/users/', { query: { page, shows } }),
	get: (id: number) => backendRequest<User>(`/users/${id}`),
	create: (body: UserCreate) => backendRequest<User>('/users/', { method: 'POST', body }),
	update: (id: number, body: UserUpdate) => backendRequest<User>(`/users/${id}`, { method: 'PATCH', body }),
	remove: (id: number) => backendRequest<void>(`/users/${id}`, { method: 'DELETE' }),
	setRole: (id: number, body: UserRoleAssignment) => backendRequest<User>(`/users/${id}/role`, { method: 'PUT', body }),
};

export const addressesApi = {
	list: (page = 1, shows = 100) => backendRequest<UserAddressList>('/user-addresses/', { query: { page, shows } }),
	get: (id: number) => backendRequest<UserAddress>(`/user-addresses/${id}`),
	create: (body: UserAddressCreate) => backendRequest<UserAddress>('/user-addresses/', { method: 'POST', body }),
	update: (id: number, body: UserAddressUpdate) => backendRequest<UserAddress>(`/user-addresses/${id}`, { method: 'PATCH', body }),
	remove: (id: number) => backendRequest<void>(`/user-addresses/${id}`, { method: 'DELETE' }),
};

export const rolesApi = {
	list: () => backendRequest<Role[]>('/roles/'),
	get: (id: number) => backendRequest<Role>(`/roles/${id}`),
	create: (body: RoleCreate) => backendRequest<Role>('/roles/', { method: 'POST', body }),
	update: (id: number, body: RoleUpdate) => backendRequest<Role>(`/roles/${id}`, { method: 'PATCH', body }),
	remove: (id: number) => backendRequest<void>(`/roles/${id}`, { method: 'DELETE' }),
	replacePermissions: (id: number, body: RolePermissionsUpdate) => backendRequest<Role>(`/roles/${id}/permissions`, { method: 'PUT', body }),
};

export const permissionsApi = {
	list: () => backendRequest<Permission[]>('/permissions/'),
};
