import { screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { JournalEntries, JournalEntryDetailPage } from '../../pages/JournalEntries';
import {
  mockJournalEntries,
  mockPostedEntry,
  mockVoidedEntry,
} from '../../test/fixtures';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useParams: () => ({ id: 'je-1' }) };
});

vi.mock('../../api/journal-entries', () => ({
  journalEntriesApi: {
    list:  vi.fn(),
    get:   vi.fn(),
    void:  vi.fn(),
  },
}));

import { journalEntriesApi } from '../../api/journal-entries';

const mockList = journalEntriesApi.list as ReturnType<typeof vi.fn>;
const mockGet  = journalEntriesApi.get  as ReturnType<typeof vi.fn>;
const mockVoid = journalEntriesApi.void as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue(mockJournalEntries);
  mockGet.mockResolvedValue(mockPostedEntry);
  mockVoid.mockResolvedValue(mockVoidedEntry);
});

// ---------------------------------------------------------------------------
// JournalEntries list
// ---------------------------------------------------------------------------
describe('JournalEntries list', () => {
  it('shows loading state while fetching', () => {
    mockList.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<JournalEntries />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders entry descriptions after load', async () => {
    renderWithProviders(<JournalEntries />);
    await waitFor(() =>
      expect(screen.getByText('Customer deposit received')).toBeInTheDocument()
    );
    expect(screen.getByText(/VOID: Customer deposit received/i)).toBeInTheDocument();
  });

  it('shows "No entries yet" message when list is empty', async () => {
    mockList.mockResolvedValue([]);
    renderWithProviders(<JournalEntries />);
    await waitFor(() =>
      expect(screen.getByText(/No entries yet/i)).toBeInTheDocument()
    );
  });

  it('displays the posted status tag', async () => {
    renderWithProviders(<JournalEntries />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    expect(screen.getByText('posted')).toBeInTheDocument();
  });

  it('displays the voided status tag', async () => {
    renderWithProviders(<JournalEntries />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    expect(screen.getByText('voided')).toBeInTheDocument();
  });

  it('shows "Void" button only on posted entries', async () => {
    renderWithProviders(<JournalEntries />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    const voidButtons = screen.getAllByRole('button', { name: /Void/i });
    // Only the posted entry should have a Void button (not the voided one)
    expect(voidButtons).toHaveLength(1);
  });

  it('shows a reference when present', async () => {
    renderWithProviders(<JournalEntries />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    expect(screen.getByText(/Ref: DEP-001/i)).toBeInTheDocument();
  });

  it('shows an error alert when list fetch fails', async () => {
    mockList.mockRejectedValue(new Error('Network error'));
    renderWithProviders(<JournalEntries />);
    await waitFor(() =>
      expect(screen.getByText('Network error')).toBeInTheDocument()
    );
  });

  it('renders a "+ New Entry" link', async () => {
    renderWithProviders(<JournalEntries />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    expect(screen.getByRole('link', { name: /\+ New Entry/i })).toBeInTheDocument();
  });

  it('calls journalEntriesApi.void when Void confirmed', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    renderWithProviders(<JournalEntries />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    fireEvent.click(screen.getByRole('button', { name: /Void/i }));
    await waitFor(() => expect(mockVoid).toHaveBeenCalledWith('je-1'));
  });

  it('does NOT call journalEntriesApi.void when confirm is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    renderWithProviders(<JournalEntries />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    fireEvent.click(screen.getByRole('button', { name: /Void/i }));
    expect(mockVoid).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// JournalEntryDetailPage
// ---------------------------------------------------------------------------
describe('JournalEntryDetailPage', () => {
  it('renders the entry description', async () => {
    renderWithProviders(<JournalEntryDetailPage />);
    await waitFor(() =>
      expect(screen.getByText('Customer deposit received')).toBeInTheDocument()
    );
  });

  it('renders account codes and names for each line', async () => {
    renderWithProviders(<JournalEntryDetailPage />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    expect(screen.getByText('1010')).toBeInTheDocument();
    expect(screen.getByText('Cash & Cash Equivalents')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
    expect(screen.getByText('Customer Deposits')).toBeInTheDocument();
  });

  it('renders debit amount in the debit column', async () => {
    renderWithProviders(<JournalEntryDetailPage />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    // The debit line has 5000 in the debit column — credit column is empty for that row
    const debitCells = screen.getAllByText('5,000.00');
    expect(debitCells.length).toBeGreaterThan(0);
  });

  it('shows the "Void Entry" button for a posted entry', async () => {
    renderWithProviders(<JournalEntryDetailPage />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    expect(screen.getByRole('button', { name: /Void Entry/i })).toBeInTheDocument();
  });

  it('does NOT show "Void Entry" button for a voided entry', async () => {
    mockGet.mockResolvedValue({ ...mockVoidedEntry, lines: [] });
    renderWithProviders(<JournalEntryDetailPage />);
    await waitFor(() => screen.getByText(/VOID: Customer deposit received/i));
    expect(screen.queryByRole('button', { name: /Void Entry/i })).not.toBeInTheDocument();
  });

  it('renders the posted status tag', async () => {
    renderWithProviders(<JournalEntryDetailPage />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    expect(screen.getByText('posted')).toBeInTheDocument();
  });

  it('renders the reference', async () => {
    renderWithProviders(<JournalEntryDetailPage />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    expect(screen.getByText(/DEP-001/)).toBeInTheDocument();
  });

  it('shows totals row with sum of debits and credits', async () => {
    renderWithProviders(<JournalEntryDetailPage />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    expect(screen.getByText('Total')).toBeInTheDocument();
    // Both debit total and credit total are 5000
    const fiveThousands = screen.getAllByText('5,000.00');
    expect(fiveThousands.length).toBeGreaterThanOrEqual(2);
  });

  it('calls journalEntriesApi.void and navigates on void confirm', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    renderWithProviders(<JournalEntryDetailPage />);
    await waitFor(() => screen.getByText('Customer deposit received'));
    fireEvent.click(screen.getByRole('button', { name: /Void Entry/i }));
    await waitFor(() => expect(mockVoid).toHaveBeenCalled());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(`/journal-entries/${mockVoidedEntry.id}`));
  });
});
