import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../../api/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  } as Response);
}

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('api client', () => {
  describe('GET requests', () => {
    it('returns parsed JSON on a successful response', async () => {
      mockFetch({ id: '1', name: 'Cash' });
      const result = await api.get<{ id: string; name: string }>('/accounts/1');
      expect(result).toEqual({ id: '1', name: 'Cash' });
    });

    it('calls fetch with the correct URL (prefixed with /api)', async () => {
      const spy = mockFetch([]);
      await api.get('/accounts');
      expect(spy).toHaveBeenCalledWith('/api/accounts', expect.objectContaining({}));
    });

    it('sets Content-Type: application/json header', async () => {
      const spy = mockFetch({});
      await api.get('/accounts/1');
      const callArgs = spy.mock.calls[0][1] as RequestInit;
      expect((callArgs.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('throws an Error with the server error message when response is not ok', async () => {
      mockFetch({ error: 'Not found' }, false, 404);
      await expect(api.get('/accounts/bad-id')).rejects.toThrow('Not found');
    });

    it('throws a generic HTTP error when body has no error field', async () => {
      mockFetch({}, false, 500);
      await expect(api.get('/accounts')).rejects.toThrow('HTTP 500');
    });
  });

  describe('POST requests', () => {
    it('returns parsed JSON on a successful response', async () => {
      const entry = { id: 'je-1', status: 'posted' };
      mockFetch(entry);
      const result = await api.post('/journal-entries', { description: 'Test' });
      expect(result).toEqual(entry);
    });

    it('calls fetch with method POST', async () => {
      const spy = mockFetch({});
      await api.post('/journal-entries', {});
      const callArgs = spy.mock.calls[0][1] as RequestInit;
      expect(callArgs.method).toBe('POST');
    });

    it('serializes the body to JSON', async () => {
      const spy = mockFetch({});
      const payload = { description: 'Test', lines: [] };
      await api.post('/journal-entries', payload);
      const callArgs = spy.mock.calls[0][1] as RequestInit;
      expect(callArgs.body).toBe(JSON.stringify(payload));
    });

    it('sets Content-Type: application/json header', async () => {
      const spy = mockFetch({});
      await api.post('/journal-entries', {});
      const callArgs = spy.mock.calls[0][1] as RequestInit;
      expect((callArgs.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('throws an Error with server error message on failure', async () => {
      mockFetch({ error: 'Entry is not balanced' }, false, 422);
      await expect(api.post('/journal-entries', {})).rejects.toThrow('Entry is not balanced');
    });

    it('throws a generic HTTP error when no error field in body', async () => {
      mockFetch(null, false, 503);
      await expect(api.post('/journal-entries', {})).rejects.toThrow('HTTP 503');
    });
  });
});
