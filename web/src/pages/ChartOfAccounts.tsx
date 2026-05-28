import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '../api/accounts';
import { Account } from '../api/types';
import { Alert } from '../components/Alert';

const TYPE_COLORS: Record<string, string> = {
  asset:     '#1677ff',
  liability: '#d4380d',
  equity:    '#389e0d',
  revenue:   '#08979c',
  expense:   '#c41d7f',
};

const styles: Record<string, React.CSSProperties> = {
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  h1:      { fontSize: 24, fontWeight: 700 },
  btn:     { padding: '8px 18px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  table:   { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.08)' },
  th:      { textAlign: 'left', padding: '10px 14px', background: '#f0f2f5', fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: .5 },
  td:      { padding: '10px 14px', borderBottom: '1px solid #f0f2f5', fontSize: 14 },
  tag:     { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: '#fff' },
  modal:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  card:    { background: '#fff', borderRadius: 10, padding: 28, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,.16)' },
  label:   { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#444' },
  input:   { width: '100%', padding: '8px 10px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, marginBottom: 14 },
  select:  { width: '100%', padding: '8px 10px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, marginBottom: 14 },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 },
  cancel:  { padding: '8px 16px', border: '1px solid #d9d9d9', borderRadius: 6, cursor: 'pointer', background: '#fff', fontSize: 14 },
};

const NORMAL_BALANCE_DEFAULT: Record<string, 'debit' | 'credit'> = {
  asset: 'debit', expense: 'debit',
  liability: 'credit', equity: 'credit', revenue: 'credit',
};

export function ChartOfAccounts() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'asset', normal_balance: 'debit' as 'debit' | 'credit' });
  const [error, setError] = useState('');

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.list,
  });

  const mutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      setShowForm(false);
      setForm({ code: '', name: '', type: 'asset', normal_balance: 'debit' });
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const grouped = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    (acc[a.type] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.h1}>Chart of Accounts</h1>
        <button style={styles.btn} onClick={() => setShowForm(true)}>+ New Account</button>
      </div>

      {isLoading && <p>Loading…</p>}

      {(['asset', 'liability', 'equity', 'revenue', 'expense'] as const).map((type) => (
        grouped[type]?.length ? (
          <div key={type} style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: TYPE_COLORS[type], textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {type}
            </h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Code', 'Name', 'Normal Balance', 'Balance'].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped[type].map((a) => (
                  <tr key={a.id}>
                    <td style={styles.td}><code>{a.code}</code></td>
                    <td style={styles.td}>{a.name}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.tag, background: a.normal_balance === 'debit' ? '#1677ff' : '#389e0d' }}>
                        {a.normal_balance}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontFamily: 'monospace', textAlign: 'right' }}>
                      {parseFloat(a.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null
      ))}

      {showForm && (
        <div style={styles.modal} onClick={() => setShowForm(false)}>
          <div style={styles.card} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 20, fontSize: 18 }}>New Account</h2>
            {error && <Alert message={error} type="error" />}
            <label style={styles.label}>Code</label>
            <input style={styles.input} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. 1010" />
            <label style={styles.label}>Name</label>
            <input style={styles.input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Cash" />
            <label style={styles.label}>Type</label>
            <select style={styles.select} value={form.type} onChange={(e) => {
              const type = e.target.value;
              setForm((f) => ({ ...f, type, normal_balance: NORMAL_BALANCE_DEFAULT[type] }));
            }}>
              {['asset', 'liability', 'equity', 'revenue', 'expense'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <label style={styles.label}>Normal Balance</label>
            <select style={styles.select} value={form.normal_balance} onChange={(e) => setForm((f) => ({ ...f, normal_balance: e.target.value as 'debit' | 'credit' }))}>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
            <div style={styles.actions}>
              <button style={styles.cancel} onClick={() => setShowForm(false)}>Cancel</button>
              <button style={styles.btn} onClick={() => mutation.mutate(form as any)} disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
