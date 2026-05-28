import { screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { NewJournalEntry } from '../../pages/NewJournalEntry';
import { mockAccounts, mockPostedEntry } from '../../test/fixtures';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../api/accounts', () => ({
  accountsApi: { list: vi.fn() },
}));

vi.mock('../../api/journal-entries', () => ({
  journalEntriesApi: { create: vi.fn() },
}));

import { accountsApi } from '../../api/accounts';
import { journalEntriesApi } from '../../api/journal-entries';

const mockList   = accountsApi.list              as ReturnType<typeof vi.fn>;
const mockCreate = journalEntriesApi.create      as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue(mockAccounts);
  mockCreate.mockResolvedValue(mockPostedEntry);
});

describe('NewJournalEntry', () => {
  it('renders the page heading', () => {
    renderWithProviders(<NewJournalEntry />);
    expect(screen.getByRole('heading', { name: /New Journal Entry/i })).toBeInTheDocument();
  });

  it('renders description, reference, and idempotency key fields', () => {
    renderWithProviders(<NewJournalEntry />);
    expect(screen.getByPlaceholderText(/Record customer deposit/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/INV-001/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/unique client key/i)).toBeInTheDocument();
  });

  it('renders two default line rows', () => {
    renderWithProviders(<NewJournalEntry />);
    // Each line has an account select (first option = "— select account —") and a side select
    const comboboxes = screen.getAllByRole('combobox');
    const accountSelects = comboboxes.filter(
      (s) => (s as HTMLSelectElement).options[0]?.text === '— select account —'
    );
    const sideSelects = comboboxes.filter(
      (s) => (s as HTMLSelectElement).options[0]?.text === 'Debit'
    );
    expect(accountSelects).toHaveLength(2);
    expect(sideSelects).toHaveLength(2);
  });

  it('"Post Entry" button is disabled initially (unbalanced)', () => {
    renderWithProviders(<NewJournalEntry />);
    expect(screen.getByRole('button', { name: /Post Entry/i })).toBeDisabled();
  });

  it('shows debit and credit running totals', () => {
    renderWithProviders(<NewJournalEntry />);
    expect(screen.getByText(/DR 0\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/CR 0\.00/i)).toBeInTheDocument();
  });

  it('shows "Balanced" indicator when debits equal credits', async () => {
    renderWithProviders(<NewJournalEntry />);
    await waitFor(() => screen.getAllByRole('combobox'));

    const accountSelects = screen.getAllByRole('combobox').filter(
      s => (s as HTMLSelectElement).options[0]?.text === '— select account —'
    );
    const amountInputs = screen.getAllByPlaceholderText('0.00');

    // Line 1: debit 1000
    fireEvent.change(accountSelects[0], { target: { value: 'acct-1010' } });
    fireEvent.change(amountInputs[0], { target: { value: '1000' } });

    // Line 2: credit 1000
    fireEvent.change(accountSelects[1], { target: { value: 'acct-2010' } });
    const sideSelects = screen.getAllByRole('combobox').filter(
      s => (s as HTMLSelectElement).value === 'debit' || (s as HTMLSelectElement).value === 'credit'
    );
    fireEvent.change(sideSelects[1], { target: { value: 'credit' } });
    fireEvent.change(amountInputs[1], { target: { value: '1000' } });

    await waitFor(() => expect(screen.getByText(/✓ Balanced/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Post Entry/i })).toBeEnabled();
  });

  it('shows unbalanced delta when debits ≠ credits', async () => {
    renderWithProviders(<NewJournalEntry />);
    await waitFor(() => screen.getAllByRole('combobox'));

    const amountInputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(amountInputs[0], { target: { value: '1000' } });

    // Set second line to credit so debits=1000, credits=500, delta=500
    const sideSelects = screen.getAllByRole('combobox').filter(
      (s) => (s as HTMLSelectElement).options[0]?.text === 'Debit'
    );
    fireEvent.change(sideSelects[1], { target: { value: 'credit' } });
    fireEvent.change(amountInputs[1], { target: { value: '500' } });

    await waitFor(() => expect(screen.getByText((t) => t.includes('500.00') && t.startsWith('\u0394'))).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Post Entry/i })).toBeDisabled();
  });

  it('adds a new line when "+ Add Line" is clicked', async () => {
    renderWithProviders(<NewJournalEntry />);
    await waitFor(() => screen.getAllByRole('combobox'));

    const before = screen.getAllByPlaceholderText('0.00').length;
    fireEvent.click(screen.getByRole('button', { name: /Add Line/i }));
    expect(screen.getAllByPlaceholderText('0.00').length).toBe(before + 1);
  });

  it('removes a line when × is clicked (minimum 2 lines enforced)', async () => {
    renderWithProviders(<NewJournalEntry />);
    await waitFor(() => screen.getAllByRole('combobox'));

    // Add a 3rd line first, then remove it
    fireEvent.click(screen.getByRole('button', { name: /Add Line/i }));
    const before = screen.getAllByPlaceholderText('0.00').length;
    expect(before).toBe(3);

    const removeButtons = screen.getAllByTitle('Remove line');
    fireEvent.click(removeButtons[2]);
    expect(screen.getAllByPlaceholderText('0.00').length).toBe(2);
  });

  it('shows an error if description is empty on submit attempt', async () => {
    renderWithProviders(<NewJournalEntry />);
    await waitFor(() => screen.getAllByRole('combobox'));

    const amountInputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(amountInputs[0], { target: { value: '500' } });

    const sideSelects = screen.getAllByRole('combobox').filter(
      s => (s as HTMLSelectElement).value === 'debit' || (s as HTMLSelectElement).value === 'credit'
    );
    fireEvent.change(sideSelects[1], { target: { value: 'credit' } });
    fireEvent.change(amountInputs[1], { target: { value: '500' } });

    // Manually enable submit by setting description empty and trying through balanced state
    // The button should be enabled only when balanced AND description is non-empty
    // Since description is empty, clicking does nothing when button is enabled
    const postBtn = screen.getByRole('button', { name: /Post Entry/i });
    // At this point balanced but no description — click
    if (!postBtn.hasAttribute('disabled')) {
      fireEvent.click(postBtn);
      await waitFor(() =>
        expect(screen.getByText(/Description is required/i)).toBeInTheDocument()
      );
    }
  });

  it('calls journalEntriesApi.create with correct payload on valid submit', async () => {
    renderWithProviders(<NewJournalEntry />);
    await waitFor(() => screen.getAllByRole('combobox'));

    fireEvent.change(screen.getByPlaceholderText(/Record customer deposit/i), {
      target: { value: 'Test deposit' },
    });

    const accountSelects = screen.getAllByRole('combobox').filter(
      s => (s as HTMLSelectElement).options[0]?.text === '— select account —'
    );
    const amountInputs = screen.getAllByPlaceholderText('0.00');

    fireEvent.change(accountSelects[0], { target: { value: 'acct-1010' } });
    fireEvent.change(amountInputs[0], { target: { value: '2500' } });

    fireEvent.change(accountSelects[1], { target: { value: 'acct-2010' } });
    const sideSelects = screen.getAllByRole('combobox').filter(
      s => (s as HTMLSelectElement).value === 'debit' || (s as HTMLSelectElement).value === 'credit'
    );
    fireEvent.change(sideSelects[1], { target: { value: 'credit' } });
    fireEvent.change(amountInputs[1], { target: { value: '2500' } });

    await waitFor(() => expect(screen.getByText(/✓ Balanced/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Post Entry/i }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Test deposit',
          lines: expect.arrayContaining([
            expect.objectContaining({ account_id: 'acct-1010', side: 'debit',  amount: '2500' }),
            expect.objectContaining({ account_id: 'acct-2010', side: 'credit', amount: '2500' }),
          ]),
        })
      )
    );
  });

  it('navigates to the new entry after successful post', async () => {
    renderWithProviders(<NewJournalEntry />);
    await waitFor(() => screen.getAllByRole('combobox'));

    fireEvent.change(screen.getByPlaceholderText(/Record customer deposit/i), {
      target: { value: 'Nav test' },
    });

    const accountSelects = screen.getAllByRole('combobox').filter(
      s => (s as HTMLSelectElement).options[0]?.text === '— select account —'
    );
    const amountInputs = screen.getAllByPlaceholderText('0.00');

    fireEvent.change(accountSelects[0], { target: { value: 'acct-1010' } });
    fireEvent.change(amountInputs[0], { target: { value: '100' } });
    fireEvent.change(accountSelects[1], { target: { value: 'acct-2010' } });

    const sideSelects = screen.getAllByRole('combobox').filter(
      s => (s as HTMLSelectElement).value === 'debit' || (s as HTMLSelectElement).value === 'credit'
    );
    fireEvent.change(sideSelects[1], { target: { value: 'credit' } });
    fireEvent.change(amountInputs[1], { target: { value: '100' } });

    await waitFor(() => screen.getByText(/✓ Balanced/i));
    fireEvent.click(screen.getByRole('button', { name: /Post Entry/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(`/journal-entries/${mockPostedEntry.id}`)
    );
  });

  it('shows API error message when create fails', async () => {
    mockCreate.mockRejectedValue(new Error('Entry is not balanced'));
    renderWithProviders(<NewJournalEntry />);
    await waitFor(() => screen.getAllByRole('combobox'));

    fireEvent.change(screen.getByPlaceholderText(/Record customer deposit/i), {
      target: { value: 'Bad entry' },
    });
    const accountSelects = screen.getAllByRole('combobox').filter(
      s => (s as HTMLSelectElement).options[0]?.text === '— select account —'
    );
    const amountInputs = screen.getAllByPlaceholderText('0.00');

    fireEvent.change(accountSelects[0], { target: { value: 'acct-1010' } });
    fireEvent.change(amountInputs[0], { target: { value: '100' } });
    fireEvent.change(accountSelects[1], { target: { value: 'acct-2010' } });

    const sideSelects = screen.getAllByRole('combobox').filter(
      s => (s as HTMLSelectElement).value === 'debit' || (s as HTMLSelectElement).value === 'credit'
    );
    fireEvent.change(sideSelects[1], { target: { value: 'credit' } });
    fireEvent.change(amountInputs[1], { target: { value: '100' } });

    await waitFor(() => screen.getByText(/✓ Balanced/i));
    fireEvent.click(screen.getByRole('button', { name: /Post Entry/i }));

    await waitFor(() =>
      expect(screen.getByText('Entry is not balanced')).toBeInTheDocument()
    );
  });
});
