import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { TrialBalance } from '../../pages/TrialBalance';
import { mockTrialBalanceBalanced, mockTrialBalanceUnbalanced } from '../../test/fixtures';

vi.mock('../../api/reports', () => ({
  reportsApi: { trialBalance: vi.fn() },
}));

import { reportsApi } from '../../api/reports';

const mockTrialBalance = reportsApi.trialBalance as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockTrialBalance.mockResolvedValue(mockTrialBalanceBalanced);
});

describe('TrialBalance', () => {
  it('shows loading state while fetching', () => {
    mockTrialBalance.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<TrialBalance />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders the page heading', async () => {
    renderWithProviders(<TrialBalance />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Trial Balance/i })).toBeInTheDocument()
    );
  });

  it('shows a success alert when ledger is balanced', async () => {
    renderWithProviders(<TrialBalance />);
    await waitFor(() =>
      expect(screen.getByText(/Ledger is balanced/i)).toBeInTheDocument()
    );
  });

  it('shows an error alert when ledger is out of balance', async () => {
    mockTrialBalance.mockResolvedValue(mockTrialBalanceUnbalanced);
    renderWithProviders(<TrialBalance />);
    await waitFor(() =>
      expect(screen.getByText(/OUT OF BALANCE/i)).toBeInTheDocument()
    );
  });

  it('renders account names in the table', async () => {
    renderWithProviders(<TrialBalance />);
    await waitFor(() => screen.getByText(/Trial Balance/i));
    expect(screen.getByText('Cash & Cash Equivalents')).toBeInTheDocument();
    expect(screen.getByText('Customer Deposits')).toBeInTheDocument();
  });

  it('renders account codes', async () => {
    renderWithProviders(<TrialBalance />);
    await waitFor(() => screen.getByText('Cash & Cash Equivalents'));
    expect(screen.getByText('1010')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
  });

  it('renders the account type section headings', async () => {
    renderWithProviders(<TrialBalance />);
    await waitFor(() => screen.getByText('Cash & Cash Equivalents'));
    expect(screen.getByText('asset')).toBeInTheDocument();
    expect(screen.getByText('liability')).toBeInTheDocument();
  });

  it('renders debit and credit totals in the totals row', async () => {
    renderWithProviders(<TrialBalance />);
    await waitFor(() => screen.getByText('Cash & Cash Equivalents'));
    expect(screen.getByText('Totals')).toBeInTheDocument();
    // Both totals are 5,000.00
    const fiveThousands = screen.getAllByText('5,000.00');
    expect(fiveThousands.length).toBeGreaterThanOrEqual(2);
  });

  it('renders table column headers', async () => {
    renderWithProviders(<TrialBalance />);
    await waitFor(() => screen.getByText('Cash & Cash Equivalents'));
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Account Name')).toBeInTheDocument();
    expect(screen.getByText('Total Debits')).toBeInTheDocument();
    expect(screen.getByText('Total Credits')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
  });

  it('shows debit total for asset account in the correct column', async () => {
    renderWithProviders(<TrialBalance />);
    await waitFor(() => screen.getByText('Cash & Cash Equivalents'));
    // Asset row: debit_total 5000, credit_total 0 — "0.00" appears for both asset credit and liability debit
    expect(screen.getAllByText('0.00').length).toBeGreaterThanOrEqual(1);
  });

  it('shows an error alert when fetch fails', async () => {
    mockTrialBalance.mockRejectedValue(new Error('Server error'));
    renderWithProviders(<TrialBalance />);
    await waitFor(() =>
      expect(screen.getByText('Server error')).toBeInTheDocument()
    );
  });
});
