import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';
import { TrialBalanceRow } from '../api/types';
import { Alert } from '../components/Alert';

const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];

const s: Record<string, React.CSSProperties> = {
  h1:      { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  sub:     { color: '#888', fontSize: 13, marginBottom: 24 },
  card:    { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' },
  th:      { textAlign: 'left', padding: '8px 12px', background: '#f0f2f5', fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase' as const },
  thR:     { textAlign: 'right' as const, padding: '8px 12px', background: '#f0f2f5', fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase' as const },
  td:      { padding: '9px 12px', borderBottom: '1px solid #f0f2f5', fontSize: 14 },
  tdR:     { padding: '9px 12px', borderBottom: '1px solid #f0f2f5', fontSize: 14, fontFamily: 'monospace', textAlign: 'right' as const },
  typeHdr: { padding: '6px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1, color: '#888', background: '#fafafa' },
  totalRow:{ fontWeight: 700, borderTop: '2px solid #1a1a2e' },
};

export function TrialBalance() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['trial-balance'],
    queryFn: reportsApi.trialBalance,
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <Alert message={(error as Error).message} type="error" />;
  if (!data) return null;

  const { rows, totals } = data;
  const grouped = TYPE_ORDER.reduce<Record<string, TrialBalanceRow[]>>((acc, t) => {
    acc[t] = rows.filter((r) => r.type === t);
    return acc;
  }, {});

  return (
    <div>
      <h1 style={s.h1}>Trial Balance</h1>
      <p style={s.sub}>Sum of all ledger activity · {new Date().toLocaleDateString()}</p>

      {totals.balanced
        ? <Alert message="✓ Ledger is balanced — total debits equal total credits" type="success" />
        : <Alert message={`⚠ Ledger is OUT OF BALANCE — debits ${totals.debit_total} ≠ credits ${totals.credit_total}`} type="error" />
      }

      <div style={s.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={s.th}>Code</th>
              <th style={s.th}>Account Name</th>
              <th style={s.thR}>Total Debits</th>
              <th style={s.thR}>Total Credits</th>
              <th style={s.thR}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {TYPE_ORDER.map((type) => (
              grouped[type]?.length ? (
                <>
                  <tr key={`hdr-${type}`}>
                    <td colSpan={5} style={s.typeHdr}>{type}</td>
                  </tr>
                  {grouped[type].map((row) => (
                    <tr key={row.account_id}>
                      <td style={s.td}><code>{row.code}</code></td>
                      <td style={s.td}>{row.name}</td>
                      <td style={s.tdR}>{parseFloat(row.debit_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={s.tdR}>{parseFloat(row.credit_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={s.tdR}>
                        <span style={{ color: parseFloat(row.balance) >= 0 ? '#237804' : '#a8071a' }}>
                          {parseFloat(row.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </>
              ) : null
            ))}
          </tbody>
          <tfoot>
            <tr style={s.totalRow}>
              <td colSpan={2} style={{ ...s.td, fontWeight: 700 }}>Totals</td>
              <td style={{ ...s.tdR, fontWeight: 700, color: '#1677ff' }}>
                {parseFloat(totals.debit_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td style={{ ...s.tdR, fontWeight: 700, color: '#389e0d' }}>
                {parseFloat(totals.credit_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td style={{ ...s.tdR, fontWeight: 700 }}>—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
