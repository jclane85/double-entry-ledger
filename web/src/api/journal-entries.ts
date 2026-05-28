import { api } from './client';
import { JournalEntry, LedgerPage, LedgerSide } from './types';

export interface CreateJournalEntryPayload {
  description: string;
  reference?: string;
  idempotency_key?: string;
  lines: { account_id: string; amount: string; side: LedgerSide }[];
}

export const journalEntriesApi = {
  list: (limit = 50, offset = 0) =>
    api.get<JournalEntry[]>(`/journal-entries?limit=${limit}&offset=${offset}`),
  get: (id: string) => api.get<JournalEntry>(`/journal-entries/${id}`),
  create: (data: CreateJournalEntryPayload) =>
    api.post<JournalEntry>('/journal-entries', data),
  void: (id: string) =>
    api.post<JournalEntry>(`/journal-entries/${id}/void`, {}),
  ledger: (accountId: string, limit = 50, offset = 0) =>
    api.get<LedgerPage>(`/accounts/${accountId}/ledger?limit=${limit}&offset=${offset}`),
};
