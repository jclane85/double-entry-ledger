import { api } from './client';
import { TrialBalanceResponse } from './types';

export const reportsApi = {
  trialBalance: () => api.get<TrialBalanceResponse>('/reports/trial-balance'),
};
