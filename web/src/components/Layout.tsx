import { NavLink, Outlet } from 'react-router-dom';

const nav = [
  { to: '/accounts',         label: 'Chart of Accounts' },
  { to: '/journal-entries',  label: 'Journal Entries'   },
  { to: '/trial-balance',    label: 'Trial Balance'      },
];

const styles: Record<string, React.CSSProperties> = {
  root:   { display: 'flex', minHeight: '100vh' },
  sidebar:{ width: 220, background: '#1a1a2e', color: '#e0e0e0', display: 'flex', flexDirection: 'column', padding: '24px 0' },
  brand:  { padding: '0 20px 24px', fontSize: 18, fontWeight: 700, color: '#fff', borderBottom: '1px solid #2a2a4a', marginBottom: 16 },
  link:   { display: 'block', padding: '10px 20px', color: '#a0a0c0', textDecoration: 'none', fontSize: 14 },
  main:   { flex: 1, padding: 32, overflowY: 'auto' },
};

export function Layout() {
  return (
    <div style={styles.root}>
      <nav style={styles.sidebar}>
        <div style={styles.brand}>📒 Ledger</div>
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            style={({ isActive }) => ({
              ...styles.link,
              ...(isActive ? { color: '#fff', background: '#2a2a4a', borderLeft: '3px solid #6c63ff' } : {}),
            })}
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
