import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { journalEntriesApi } from '../api/journal-entries';
import { JournalEntry } from '../api/types';
import { Alert } from '../components/Alert';

const STATUS_COLORS: Record<string, React.CSSProperties> = {
  posted: { background: '#f6ffed', color: '#237804', border: '1px solid #b7eb8f' },
  voided: { background: '#fff1f0', color: '#a8071a', border: '1px solid #ffccc7' },
  draft:  { background: '#fffbe6', color: '#876800', border: '1px solid #ffe58f' },
};

const s: Record<string, React.CSSProperties> = {
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  h1:      { fontSize: 24, fontWeight: 700 },
  btn:     { padding: '8px 18px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, textDecoration: 'none', display: 'inline-block' },
  card:    { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 12 },
  row:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  tag:     { display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  desc:    { fontWeight: 600, fontSize: 15, marginBottom: 4 },
  meta:    { fontSize: 12, color: '#888' },
  voidBtn: { padding: '4px 12px', background: '#fff', border: '1px solid #ff4d4f', color: '#ff4d4f', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
};

export function JournalEntries() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: () => journalEntriesApi.list(),
  });

  const voidMutation = useMutation({
    mutationFn: (id: string) => journalEntriesApi.void(id),
    onSuccess: (reversing) => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      navigate(`/journal-entries/${reversing.id}`);
    },
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <Alert message={(error as Error).message} type="error" />;

  return (
    <div>
      <div style={s.header}>
        <h1 style={s.h1}>Journal Entries</h1>
        <Link to="/journal-entries/new" style={s.btn}>+ New Entry</Link>
      </div>

      {entries.length === 0 && <p style={{ color: '#888' }}>No entries yet. Post your first journal entry.</p>}

      {entries.map((e: JournalEntry) => (
        <div key={e.id} style={s.card}>
          <div style={s.row}>
            <div>
              <div style={s.desc}>
                <Link to={`/journal-entries/${e.id}`} style={{ color: '#1a1a2e', textDecoration: 'none' }}>
                  {e.description}
                </Link>
              </div>
              <div style={s.meta}>
                {e.reference && <span style={{ marginRight: 10 }}>Ref: {e.reference}</span>}
                <span>{e.posted_at ? new Date(e.posted_at).toLocaleString() : new Date(e.created_at).toLocaleString()}</span>
                {e.idempotency_key && <span style={{ marginLeft: 10, fontFamily: 'monospace', fontSize: 11 }}>key: {e.idempotency_key}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...s.tag, ...STATUS_COLORS[e.status] }}>{e.status}</span>
              {e.status === 'posted' && (
                <button
                  style={s.voidBtn}
                  onClick={() => { if (confirm('Void this entry? A reversing entry will be created.')) voidMutation.mutate(e.id); }}
                >
                  Void
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single journal entry detail view
// ---------------------------------------------------------------------------

const ds: Record<string, React.CSSProperties> = {
  h1:    { fontSize: 24, fontWeight: 700, marginBottom: 4 },
  meta:  { color: '#888', fontSize: 13, marginBottom: 20 },
  card:  { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' },
  th:    { textAlign: 'left', padding: '8px 12px', background: '#f0f2f5', fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase' as const },
  td:    { padding: '10px 12px', borderBottom: '1px solid #f0f2f5', fontSize: 14 },
  total: { padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', fontSize: 14 },
};

import { useParams } from 'react-router-dom';

export function JournalEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: entry, isLoading, error } = useQuery({
    queryKey: ['journal-entries', id],
    queryFn: () => journalEntriesApi.get(id!),
    enabled: !!id,
  });

  const voidMutation = useMutation({
    mutationFn: () => journalEntriesApi.void(id!),
    onSuccess: (reversing) => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      navigate(`/journal-entries/${reversing.id}`);
    },
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <Alert message={(error as Error).message} type="error" />;
  if (!entry) return null;

  const totalDebit  = entry.lines?.reduce((s, l) => l.side === 'debit'  ? s + parseFloat(l.amount) : s, 0) ?? 0;
  const totalCredit = entry.lines?.reduce((s, l) => l.side === 'credit' ? s + parseFloat(l.amount) : s, 0) ?? 0;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/journal-entries" style={{ color: '#6c63ff', fontSize: 13 }}>← Journal Entries</Link>
      </div>
      <h1 style={ds.h1}>{entry.description}</h1>
      <div style={ds.meta}>
        <span style={{ ...s.tag, ...STATUS_COLORS[entry.status], marginRight: 10 }}>{entry.status}</span>
        {entry.reference && <span style={{ marginRight: 10 }}>Ref: {entry.reference}</span>}
        <span>Posted: {entry.posted_at ? new Date(entry.posted_at).toLocaleString() : '—'}</span>
        {entry.idempotency_key && <span style={{ marginLeft: 12, fontFamily: 'monospace', fontSize: 11 }}>idempotency: {entry.idempotency_key}</span>}
      </div>

      {voidMutation.error && <Alert message={(voidMutation.error as Error).message} type="error" />}

      <div style={ds.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Account', 'Debit', 'Credit'].map((h) => (
                <th key={h} style={ds.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entry.lines?.map((line) => (
              <tr key={line.id}>
                <td style={ds.td}>
                  <code style={{ marginRight: 8, color: '#888' }}>{line.account_code}</code>
                  {line.account_name}
                </td>
                <td style={{ ...ds.td, fontFamily: 'monospace', color: '#1677ff' }}>
                  {line.side === 'debit' ? parseFloat(line.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                </td>
                <td style={{ ...ds.td, fontFamily: 'monospace', color: '#389e0d' }}>
                  {line.side === 'credit' ? parseFloat(line.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #d9d9d9' }}>
              <td style={ds.total}>Total</td>
              <td style={{ ...ds.total, color: '#1677ff' }}>{totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td style={{ ...ds.total, color: '#389e0d' }}>{totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {entry.status === 'posted' && (
        <div style={{ marginTop: 16 }}>
          <button
            style={{ padding: '8px 16px', border: '1px solid #ff4d4f', color: '#ff4d4f', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
            onClick={() => { if (confirm('Void this entry? A reversing entry will be created.')) voidMutation.mutate(); }}
            disabled={voidMutation.isPending}
          >
            {voidMutation.isPending ? 'Voiding…' : 'Void Entry'}
          </button>
        </div>
      )}
    </div>
  );
}
