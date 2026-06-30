import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Account, Opportunity } from '@/types';

/**
 * In-memory CRM store shared across the dashboard (UI only — no API yet).
 *
 * It exists so the account → opportunity flow works end-to-end in the UI:
 * accounts created on the Accounts page immediately appear in the Opportunity
 * account picker. When you integrate, replace these local mutations with API
 * calls (GET/POST/PATCH/DELETE /accounts and /opportunities) — the component
 * code that reads `accounts` / `opportunities` won't need to change.
 */

type NewAccount = Omit<Account, 'id' | 'createdAt'>;
type NewOpportunity = Omit<Opportunity, 'id' | 'createdAt'>;

interface CrmContextValue {
  accounts: Account[];
  addAccount: (data: NewAccount) => Account;
  updateAccount: (id: string, patch: Partial<NewAccount>) => void;
  removeAccount: (id: string) => void;

  opportunities: Opportunity[];
  addOpportunity: (data: NewOpportunity) => Opportunity;
  updateOpportunity: (id: string, patch: Partial<NewOpportunity>) => void;
  removeOpportunity: (id: string) => void;

  /** Resolve an account's company name from its id (for tables/badges). */
  accountName: (id?: string) => string;
}

const CrmContext = createContext<CrmContextValue | undefined>(undefined);

export function CrmProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const addAccount = useCallback((data: NewAccount) => {
    const account: Account = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setAccounts((prev) => [account, ...prev]);
    return account;
  }, []);

  const updateAccount = useCallback((id: string, patch: Partial<NewAccount>) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const removeAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    // Keep data consistent: drop opportunities that belonged to this account.
    setOpportunities((prev) => prev.filter((o) => o.accountId !== id));
  }, []);

  const addOpportunity = useCallback((data: NewOpportunity) => {
    const opp: Opportunity = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setOpportunities((prev) => [opp, ...prev]);
    return opp;
  }, []);

  const updateOpportunity = useCallback((id: string, patch: Partial<NewOpportunity>) => {
    setOpportunities((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }, []);

  const removeOpportunity = useCallback((id: string) => {
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const value = useMemo<CrmContextValue>(() => {
    const nameById = new Map(accounts.map((a) => [a.id, a.companyName]));
    return {
      accounts,
      addAccount,
      updateAccount,
      removeAccount,
      opportunities,
      addOpportunity,
      updateOpportunity,
      removeOpportunity,
      accountName: (id?: string) => (id ? nameById.get(id) ?? '—' : '—'),
    };
  }, [
    accounts,
    opportunities,
    addAccount,
    updateAccount,
    removeAccount,
    addOpportunity,
    updateOpportunity,
    removeOpportunity,
  ]);

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error('useCrm must be used within <CrmProvider>');
  return ctx;
}
