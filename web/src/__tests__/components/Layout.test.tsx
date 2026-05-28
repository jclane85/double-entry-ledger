import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../test/utils';
import { Layout } from '../../components/Layout';

function renderLayout(initialPath = '/accounts') {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route path="accounts" element={<div>Accounts Page</div>} />
        <Route path="journal-entries" element={<div>Journal Entries Page</div>} />
        <Route path="trial-balance" element={<div>Trial Balance Page</div>} />
      </Route>
    </Routes>,
    { routerProps: { initialEntries: [initialPath] } }
  );
}

describe('Layout', () => {
  it('renders the brand name', () => {
    renderLayout();
    expect(screen.getByText(/Ledger/i)).toBeInTheDocument();
  });

  it('renders all three nav links', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: /Chart of Accounts/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Journal Entries/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Trial Balance/i })).toBeInTheDocument();
  });

  it('nav links point to the correct hrefs', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: /Chart of Accounts/i })).toHaveAttribute('href', '/accounts');
    expect(screen.getByRole('link', { name: /Journal Entries/i })).toHaveAttribute('href', '/journal-entries');
    expect(screen.getByRole('link', { name: /Trial Balance/i })).toHaveAttribute('href', '/trial-balance');
  });

  it('renders the active route outlet content', () => {
    renderLayout('/accounts');
    expect(screen.getByText('Accounts Page')).toBeInTheDocument();
  });

  it('renders the correct outlet for journal-entries route', () => {
    renderLayout('/journal-entries');
    expect(screen.getByText('Journal Entries Page')).toBeInTheDocument();
  });
});
