import { backendRequest } from './client';
import type { User, UserCreate } from './types';

export const usersApi = {
	create: (body: UserCreate) => backendRequest<User>('/users/', { method: 'POST', body }),
};
