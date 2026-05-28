import { useState, useId } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Decimal from 'decimal.js-light';
import { accountsApi } from '../api/accounts';
import { journalEntriesApi, CreateJournalEntryPayload } from '../api/journal-entries';
import { LedgerSide } from '../api/types';
import { Alert } from '../components/Alert';

interface LineItem {
  key: string;
  account_id: string;
  amount: string;
  side: LedgerSide;
}

function newLine(key: string): LineItem {
  return { key, account_id: '', amount: '', side: 'debit' };
}

function computeTotals(lines: LineItem[]) {
  let debits = new Decimal(0);
  let credits = new Decimal(0);
  for (const l of lines) {
    const v = parseFloat(l.amount);
    if (!isNaN(v) && v > 0) {
      if (l.side === 'debit') debits = debits.plus(v);
      else credits = credits.plus(v);
    }
  }
  return { debits, credits, balanced: debits.equals(credits) && debits.gt(0) };
}

const s: Record<string, React.CSSProperties> = {
  h1:      { fontSize: 24, fontWeight: 700, marginBottom: 24 },
  card:    { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 24 },
  label:   { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#444' },
  input:   { padding: '8px 10px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, width: '100%' },
  select:  { padding: '8px 10px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, width: '100%' },
  tHead:   { textAlign: 'left' as const, padding: '8px 10px', background: '#f0f2f5', fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase' as const },
  td:      { padding: '8px 6px', borderBottom: '1px solid #f0f2f5' },
  addBtn:  { padding: '6px 14px', border: '1px dashed #6c63ff', color: '#6c63ff', background: 'transparent', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  btn:     { padding: '10px 22px', background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  rmBtn:   { background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: 18, lineHeight: 1 },
};

export function NewJournalEntry() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const uid = useId();

  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [lines, setLines] = useState<LineItem[]>([
    newLine(`${uid}-0`),
    newLine(`${uid}-1`),
  ]);
  const [error, setError] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.list,
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateJournalEntryPayload) => journalEntriesApi.create(payload),
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
      navigate(`/journal-entries/${entry.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const { debits, credits, balanced } = computeTotals(lines);

  function updateLine(key: string, patch: Partial<LineItem>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((ls) => [...ls, newLine(`${uid}-${Date.now()}`)]);
  }

  function removeLine(key: string) {
    if (lines.length <= 2) return;
    setLines((ls) => ls.filter((l) => l.key !== key));
  }

  function handleSubmit() {
    setError('');
    if (!description.trim()) { setError('Description is required'); return; }
    if (!balanced) { setError('Entry is not balanced: debits must equal credits'); return; }
    const payload: CreateJournalEntryPayload = {
      description: description.trim(),
      reference: reference.trim() || undefined,
      idempotency_key: idempotencyKey.trim() || undefined,
      lines: lines.map(({ account_id, amount, side }) => ({ account_id, amount, side })),
    };
    mutation.mutate(payload);
  }

  return (
    <div>
      <h1 style={s.h1}>New Journal Entry</h1>

      {error && <Alert message={error} type="error" />}

      <div style={s.card}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 4 }}>
          <div>
            <label style={s.label}>Description *</label>
            <input style={s.input} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Record customer deposit" />
          </div>
          <div>
            <label style={s.label}>Reference</label>
            <input style={s.input} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. INV-001" />
          </div>
          <div>
            <label style={s.label}>Idempotency Key</label>
            <input style={s.input} value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} placeholder="unique client key" />
          </div>
        </div>
      </div>

      <div style={s.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Account', 'Side', 'Amount', ''].map((h) => (
                <th key={h} style={s.tHead}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.key}>
                <td style={s.td}>
                  <select
                    style={s.select}
                    value={line.account_id}
                    onChange={(e) => updateLine(line.key, { account_id: e.target.value })}
                  >
                    <option value="">— select account —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ ...s.td, width: 120 }}>
                  <select
                    style={s.select}
                    value={line.side}
                    onChange={(e) => updateLine(line.key, { side: e.target.value as LedgerSide })}
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </td>
                <td style={{ ...s.td, width: 160 }}>
                  <input
                    style={s.input}
                    type="number"
                    min="0.0001"
                    step="0.01"
                    placeholder="0.00"
                    value={line.amount}
                    onChange={(e) => updateLine(line.key, { amount: e.target.value })}
                  />
                </td>
                <td style={{ ...s.td, width: 40, textAlign: 'center' }}>
                  <button style={s.rmBtn} onClick={() => removeLine(line.key)} title="Remove line">×</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ padding: '10px 6px' }}>
                <button style={s.addBtn} onClick={addLine}>+ Add Line</button>
              </td>
              <td style={{ padding: '10px 6px', fontFamily: 'monospace', fontSize: 13 }}>
                <div style={{ color: '#1677ff' }}>DR {debits.toFixed(2)}</div>
                <div style={{ color: '#389e0d' }}>CR {credits.toFixed(2)}</div>
                {debits.gt(0) && (
                  <div style={{ marginTop: 4, fontWeight: 700, color: balanced ? '#237804' : '#a8071a' }}>
                    {balanced ? '✓ Balanced' : `Δ ${debits.minus(credits).abs().toFixed(2)}`}
                  </div>
                )}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button style={s.btn} onClick={handleSubmit} disabled={mutation.isPending || !balanced}>
          {mutation.isPending ? 'Posting…' : 'Post Entry'}
        </button>
        <button style={{ ...s.btn, background: '#595959' }} onClick={() => navigate(-1)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
