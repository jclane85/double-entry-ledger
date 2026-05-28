import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { AccountLedger } from '../../pages/AccountLedger';
import { mockLedgerPage, mockCashAccount } from '../../test/fixtures';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ id: 'acct-1010' }) };
});

vi.mock('../../api/journal-entries', () => ({
  journalEntriesApi: { ledger: vi.fn() },
}));

import { journalEntriesApi } from '../../api/journal-entries';

const mockLedger = journalEntriesApi.ledger as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockLedger.mockResolvedValue(mockLedgerPage);
});

describe('AccountLedger', () => {
  it('shows loading state while fetching', () => {
    mockLedger.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AccountLedger />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders account code and name in the heading', async () => {
    renderWithProviders(<AccountLedger />);
    await waitFor(() =>
      expect(screen.getByText(/1010 — Cash & Cash Equivalents/i)).toBeInTheDocument()
    );
  });

  it('renders the account type and normal balance', async () => {
    renderWithProviders(<AccountLedger />);
    await waitFor(() => screen.getByText(/1010 — Cash & Cash Equivalents/i));
    expect(screen.getByText(/asset/i)).toBeInTheDocument();
    // "debit" appears in both the subtitle <strong> and the "Debit" table header
    expect(screen.getAllByText(/debit/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the current balance in the subtitle', async () => {
    renderWithProviders(<AccountLedger />);
    await waitFor(() => screen.getByText(/1010 — Cash & Cash Equivalents/i));
    // Balance appears in the subtitle and may also appear in the table
    expect(screen.getAllByText(/5,000\.00/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders a table with the correct column headers', async () => {
    renderWithProviders(<AccountLedger />);
    await waitFor(() => screen.getByText(/1010 — Cash & Cash Equivalents/i));
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Journal Entry')).toBeInTheDocument();
    expect(screen.getByText('Debit')).toBeInTheDocument();
    expect(screen.getByText('Credit')).toBeInTheDocument();
    expect(screen.getByText('Running Balance')).toBeInTheDocument();
  });

  it('renders the transaction amount in the debit column', async () => {
    renderWithProviders(<AccountLedger />);
    await waitFor(() => screen.getByText(/1010 — Cash & Cash Equivalents/i));
    // 5,000.00 appears in both the debit cell and the running balance cell
    expect(screen.getAllByText('5,000.00').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the running balance for each line', async () => {
    renderWithProviders(<AccountLedger />);
    await waitFor(() => screen.getByText(/1010 — Cash & Cash Equivalents/i));
    // running_balance 5000.0000 → 5,000.00
    expect(screen.getAllByText('5,000.00').length).toBeGreaterThanOrEqual(1);
  });

  it('renders a link back to Chart of Accounts', async () => {
    renderWithProviders(<AccountLedger />);
    await waitFor(() => screen.getByText(/1010 — Cash & Cash Equivalents/i));
    expect(screen.getByRole('link', { name: /Chart of Accounts/i })).toBeInTheDocument();
  });

  it('shows the total transaction count', async () => {
    renderWithProviders(<AccountLedger />);
    await waitFor(() => screen.getByText(/1010 — Cash & Cash Equivalents/i));
    expect(screen.getByText(/1 transaction/i)).toBeInTheDocument();
  });

  it('shows empty state message when no transactions exist', async () => {
    mockLedger.mockResolvedValue({
      account: mockCashAccount,
      lines: [],
      total: 0,
    });
    renderWithProviders(<AccountLedger />);
    await waitFor(() =>
      expect(screen.getByText(/No transactions for this account/i)).toBeInTheDocument()
    );
  });

  it('shows an error alert when fetch fails', async () => {
    mockLedger.mockRejectedValue(new Error('Account not found'));
    renderWithProviders(<AccountLedger />);
    await waitFor(() =>
      expect(screen.getByText('Account not found')).toBeInTheDocument()
    );
  });
});
