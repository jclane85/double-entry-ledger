import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';

interface WrapperOptions extends RenderOptions {
  routerProps?: MemoryRouterProps;
}

/**
 * Renders a component wrapped in the providers every page needs:
 *   - QueryClientProvider (fresh client per test — no cache bleed-through)
 *   - MemoryRouter        (satisfies useNavigate / useParams / Link)
 */
export function renderWithProviders(
  ui: React.ReactElement,
  { routerProps, ...renderOptions }: WrapperOptions = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },   // fail fast in tests
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter {...routerProps}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

export { screen, waitFor, fireEvent, within, act } from '@testing-library/react';
export { userEvent } from './userEvent';
