import { screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { ChartOfAccounts } from '../../pages/ChartOfAccounts';
import { mockAccounts } from '../../test/fixtures';

// Mock the accounts API module
vi.mock('../../api/accounts', () => ({
  accountsApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

import { accountsApi } from '../../api/accounts';

const mockList   = accountsApi.list   as ReturnType<typeof vi.fn>;
const mockCreate = accountsApi.create as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue(mockAccounts);
});

describe('ChartOfAccounts', () => {
  it('shows a loading state before accounts arrive', () => {
    // Never resolves during this test
    mockList.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ChartOfAccounts />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders accounts after loading', async () => {
    renderWithProviders(<ChartOfAccounts />);
    await waitFor(() => expect(screen.getByText('Cash & Cash Equivalents')).toBeInTheDocument());
    expect(screen.getByText('Customer Deposits')).toBeInTheDocument();
    expect(screen.getByText('Interest Income')).toBeInTheDocument();
    expect(screen.getByText('Salaries & Benefits')).toBeInTheDocument();
  });

  it('renders account codes', async () => {
    renderWithProviders(<ChartOfAccounts />);
    await waitFor(() => expect(screen.getByText('1010')).toBeInTheDocument());
    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.getByText('4010')).toBeInTheDocument();
  });

  it('renders section headings for each account type present', async () => {
    renderWithProviders(<ChartOfAccounts />);
    await waitFor(() => screen.getByText('Cash & Cash Equivalents'));
    expect(screen.getByText('asset')).toBeInTheDocument();
    expect(screen.getByText('liability')).toBeInTheDocument();
    expect(screen.getByText('revenue')).toBeInTheDocument();
    expect(screen.getByText('expense')).toBeInTheDocument();
  });

  it('renders normal balance tags for each account', async () => {
    renderWithProviders(<ChartOfAccounts />);
    await waitFor(() => screen.getByText('Cash & Cash Equivalents'));
    const debitTags = screen.getAllByText('debit');
    const creditTags = screen.getAllByText('credit');
    expect(debitTags.length).toBeGreaterThan(0);
    expect(creditTags.length).toBeGreaterThan(0);
  });

  it('renders account balances formatted with 2 decimal places', async () => {
    renderWithProviders(<ChartOfAccounts />);
    await waitFor(() => screen.getByText('Cash & Cash Equivalents'));
    // 5000.0000 should display as 5,000.00
    expect(screen.getAllByText('5,000.00').length).toBeGreaterThan(0);
  });

  it('opens the New Account modal on button click', async () => {
    renderWithProviders(<ChartOfAccounts />);
    await waitFor(() => screen.getByText('Cash & Cash Equivalents'));
    fireEvent.click(screen.getByRole('button', { name: /New Account/i }));
    expect(screen.getByRole('heading', { name: /New Account/i })).toBeInTheDocument();
  });

  it('closes the modal when Cancel is clicked', async () => {
    renderWithProviders(<ChartOfAccounts />);
    await waitFor(() => screen.getByText('Cash & Cash Equivalents'));
    fireEvent.click(screen.getByRole('button', { name: /New Account/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByRole('heading', { name: /New Account/i })).not.toBeInTheDocument();
  });

  it('auto-sets normal_balance when account type changes', async () => {
    renderWithProviders(<ChartOfAccounts />);
    await waitFor(() => screen.getByText('Cash & Cash Equivalents'));
    fireEvent.click(screen.getByRole('button', { name: /New Account/i }));

    // The modal has two selects: [0]=type, [1]=normal_balance (labels are not associated via htmlFor)
    const selects = screen.getAllByRole('combobox');
    const typeSelect = selects[0];
    const normalBalanceSelect = selects[1];

    // Change type to liability — normal balance should auto-flip to credit
    fireEvent.change(typeSelect, { target: { value: 'liability' } });
    expect((normalBalanceSelect as HTMLSelectElement).value).toBe('credit');
  });

  it('calls accountsApi.create with form values on submit', async () => {
    mockCreate.mockResolvedValue({ id: 'new-id', code: '9999', name: 'Test', type: 'asset', normal_balance: 'debit', balance: '0', version: 0, created_at: '' });
    mockList.mockResolvedValue(mockAccounts);

    renderWithProviders(<ChartOfAccounts />);
    await waitFor(() => screen.getByText('Cash & Cash Equivalents'));

    fireEvent.click(screen.getByRole('button', { name: /New Account/i }));
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 1010/i), { target: { value: '9999' } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Cash/i), { target: { value: 'Test Account' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    // After success, onSuccess closes the modal — wait for that as our signal
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /New Account/i })).not.toBeInTheDocument()
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ code: '9999', name: 'Test Account' }),
      expect.any(Object), // React Query v5 passes a context object as 2nd arg to mutationFn
    );
  });

  it('shows an error alert when account creation fails', async () => {
    mockCreate.mockRejectedValue(new Error('Code already exists'));

    renderWithProviders(<ChartOfAccounts />);
    await waitFor(() => screen.getByText('Cash & Cash Equivalents'));

    fireEvent.click(screen.getByRole('button', { name: /New Account/i }));
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. 1010/i), { target: { value: '1010' } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Cash/i), { target: { value: 'Duplicate' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => expect(screen.getByText('Code already exists')).toBeInTheDocument());
  });
});
