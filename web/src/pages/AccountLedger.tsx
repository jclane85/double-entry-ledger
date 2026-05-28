import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { journalEntriesApi } from '../api/journal-entries';
import { Alert } from '../components/Alert';

const s: Record<string, React.CSSProperties> = {
  h1:   { fontSize: 24, fontWeight: 700, marginBottom: 4 },
  sub:  { color: '#888', fontSize: 13, marginBottom: 24 },
  card: { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' },
  th:   { textAlign: 'left', padding: '8px 12px', background: '#f0f2f5', fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase' as const },
  td:   { padding: '10px 12px', borderBottom: '1px solid #f0f2f5', fontSize: 14 },
};

export function AccountLedger() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['ledger', id],
    queryFn: () => journalEntriesApi.ledger(id!),
    enabled: !!id,
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <Alert message={(error as Error).message} type="error" />;
  if (!data) return null;

  const { account, lines, total } = data;

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Link to="/accounts" style={{ color: '#6c63ff', fontSize: 13 }}>← Chart of Accounts</Link>
      </div>
      <h1 style={s.h1}>{account.code} — {account.name}</h1>
      <div style={s.sub}>
        {account.type} · normal balance: <strong>{account.normal_balance}</strong>
        &nbsp;·&nbsp;{total} transaction{total !== 1 ? 's' : ''}
        &nbsp;·&nbsp;Current balance: <strong style={{ fontFamily: 'monospace' }}>{parseFloat(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
      </div>

      <div style={s.card}>
        {lines.length === 0 ? (
          <p style={{ color: '#888' }}>No transactions for this account.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'Journal Entry', 'Debit', 'Credit', 'Running Balance'].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id}>
                  <td style={{ ...s.td, fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>
                    {new Date(line.created_at).toLocaleDateString()}
                  </td>
                  <td style={s.td}>
                    <Link to={`/journal-entries/${line.journal_entry_id}`} style={{ color: '#6c63ff' }}>
                      {line.journal_entry_id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td style={{ ...s.td, fontFamily: 'monospace', color: '#1677ff', textAlign: 'right' }}>
                    {line.side === 'debit' ? parseFloat(line.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                  </td>
                  <td style={{ ...s.td, fontFamily: 'monospace', color: '#389e0d', textAlign: 'right' }}>
                    {line.side === 'credit' ? parseFloat(line.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                  </td>
                  <td style={{ ...s.td, fontFamily: 'monospace', textAlign: 'right', fontWeight: 600 }}>
                    {line.running_balance != null
                      ? parseFloat(line.running_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
