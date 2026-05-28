import { api } from './client';
import { Account } from './types';

export const accountsApi = {
  list: () => api.get<Account[]>('/accounts'),
  get: (id: string) => api.get<Account>(`/accounts/${id}`),
  create: (data: Pick<Account, 'code' | 'name' | 'type' | 'normal_balance'>) =>
    api.post<Account>('/accounts', data),
};
