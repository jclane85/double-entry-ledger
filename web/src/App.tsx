import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { ChartOfAccounts } from './pages/ChartOfAccounts';
import { JournalEntries, JournalEntryDetailPage } from './pages/JournalEntries';
import { NewJournalEntry } from './pages/NewJournalEntry';
import { AccountLedger } from './pages/AccountLedger';
import { TrialBalance } from './pages/TrialBalance';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/accounts" replace />} />
            <Route path="accounts" element={<ChartOfAccounts />} />
            <Route path="accounts/:id/ledger" element={<AccountLedger />} />
            <Route path="journal-entries" element={<JournalEntries />} />
            <Route path="journal-entries/new" element={<NewJournalEntry />} />
            <Route path="journal-entries/:id" element={<JournalEntryDetailPage />} />
            <Route path="trial-balance" element={<TrialBalance />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
