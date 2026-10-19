import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Shirt,
  Tags,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Image as ImageIcon,
  Settings as SettingsIcon,
  Package,
  Check,
  Calculator,
  LogOut,
  LockKeyhole,
  Mail,
} from 'lucide-react';
import {
  supabase,
  type Category,
  type Item,
  type ItemWithCategory,
  type Settings,
  type Sale,
  formatPKR,
  sellingPrice,
  profitAmount,
} from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type View = 'dashboard' | 'items' | 'categories' | 'admin';
const ALLOWED_EMAIL = 'bakarbro123@gmail.com';
const ADMIN_PASSWORD = 'asfa1122';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<ItemWithCategory[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) throw error;
    setCategories(data as Category[]);
  }, []);

  const loadItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*, categories(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    setItems(data as ItemWithCategory[]);
  }, []);

  const loadSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    setSettings(data as Settings);
  }, []);

  const loadSales = useCallback(async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('id, item_id, item_name, quantity, sale_price, profit, sold_at')
      .order('sold_at', { ascending: false });
    if (error) throw error;
    setSales(data as Sale[]);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([
        loadCategories(),
        loadItems(),
        loadSettings(),
        loadSales(),
      ]);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : 'Something went wrong loading data.'
      );
    } finally {
      setLoading(false);
    }
  }, [loadCategories, loadItems, loadSettings, loadSales]);

  useEffect(() => {
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession }, error: sessionError }) => {
        if (!mounted) return;
        if (sessionError) {
          setAuthError(sessionError.message);
        } else {
          setSession(currentSession);
        }
        setAuthLoading(false);
      })
      .catch((sessionError: unknown) => {
        if (!mounted) return;
        setAuthError(
          sessionError instanceof Error
            ? sessionError.message
            : 'Unable to check your sign-in status.'
        );
        setAuthLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const allowedUser =
    session?.user.email?.toLowerCase() === ALLOWED_EMAIL.toLowerCase();

  useEffect(() => {
    if (authLoading || !session || allowedUser) return;

    supabase.auth.signOut().then(({ error: signOutError }) => {
      if (signOutError) {
        setAuthError(`This account is not authorized. ${signOutError.message}`);
      }
    }).catch((signOutError: unknown) => {
      setAuthError(
        signOutError instanceof Error
          ? signOutError.message
          : 'Unable to sign out this account.'
      );
    });
  }, [authLoading, session, allowedUser]);

  useEffect(() => {
    if (allowedUser) refresh();
  }, [allowedUser, refresh]);

  const handleSignOut = async () => {
    setAuthError(null);
    setAdminUnlocked(false);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setAuthError(signOutError.message);
  };

  const navigateTo = (nextView: View) => {
    setView(nextView);
  };

  if (authLoading) {
    return <LoadingScreen message="Checking sign-in..." />;
  }

  if (!allowedUser) {
    return (
      <LoginScreen
        error={authError}
        onSignedIn={() => setAuthError(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <Header view={view} setView={navigateTo} onSignOut={handleSignOut} />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        {authError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {authError}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <LoadingScreen message="Loading..." />
        ) : (
          <>
            {view === 'dashboard' && (
              <Dashboard
                items={items}
                categories={categories}
                settings={settings}
                canManage={adminUnlocked}
                setView={navigateTo}
                onSaved={refresh}
              />
            )}
            {view === 'items' && (
              <ItemsView
                items={items}
                categories={categories}
                settings={settings}
                canManage={adminUnlocked}
                onSaved={refresh}
              />
            )}
            {view === 'categories' && (
              <CategoriesView
                categories={categories}
                canManage={adminUnlocked}
                onSaved={refresh}
              />
            )}
            {view === 'admin' &&
              (adminUnlocked ? (
                <AdminView
                  sales={sales}
                  categories={categories}
                  settings={settings}
                  onSaved={refresh}
                  onLock={() => setAdminUnlocked(false)}
                />
              ) : (
                <AdminLock
                  onUnlock={() => setAdminUnlocked(true)}
                />
              ))}
          </>
        )}
      </main>
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center text-stone-400">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-emerald-600" />
        <p>{message}</p>
      </div>
    </div>
  );
}

function LoginScreen({
  error,
  onSignedIn,
}: {
  error: string | null;
  onSignedIn: () => void;
}) {
  const [email, setEmail] = useState(ALLOWED_EMAIL);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (email.trim().toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
      setFormError('This account is not authorized to sign in.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setFormError(signInError.message);
        return;
      }

      onSignedIn();
      setPassword('');
    } catch (signInError: unknown) {
      setFormError(
        signInError instanceof Error
          ? signInError.message
          : 'Unable to sign in. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10 text-stone-800">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Shirt className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">
              Asifa's Clothing
            </h1>
            <p className="text-sm text-stone-500">Sign in to continue</p>
          </div>
        </div>

        {(formError || error) && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {formError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-700">
              Email
            </span>
            <span className="relative block">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-stone-200 py-3 pl-10 pr-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-700">
              Password
            </span>
            <span className="relative block">
              <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-stone-200 py-3 pl-10 pr-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </span>
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

function Header({
  view,
  setView,
  onSignOut,
}: {
  view: View;
  setView: (v: View) => void;
  onSignOut: () => void;
}) {
  const nav: { key: View; label: string; icon: typeof Shirt }[] = [
    { key: 'dashboard', label: 'Home', icon: Package },
    { key: 'items', label: 'Clothing', icon: Shirt },
    { key: 'categories', label: 'Categories', icon: Tags },
    { key: 'admin', label: 'Admin', icon: LockKeyhole },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <button
          onClick={() => setView('dashboard')}
          className="flex items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Shirt className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className="text-base font-bold leading-tight text-stone-900">
              Asifa's Clothing
            </p>
            <p className="text-xs leading-tight text-stone-500">Manager</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <nav className="hidden gap-1 sm:flex">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                view === n.key
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </button>
          ))}
          </nav>
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
      <nav className="flex gap-1 border-t border-stone-100 px-1 py-2 sm:hidden">
        {nav.map((n) => (
          <button
            key={n.key}
            onClick={() => setView(n.key)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition ${
              view === n.key
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-stone-600'
            }`}
          >
            <n.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{n.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}

/* ---------- Dashboard ---------- */

function Dashboard({
  items,
  categories,
  settings,
  canManage,
  setView,
  onSaved,
}: {
  items: ItemWithCategory[];
  categories: Category[];
  settings: Settings | null;
  canManage: boolean;
  setView: (v: View) => void;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const recent = items.slice(0, 6);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.categories?.name?.toLowerCase().includes(q) ?? false)
    );
  }, [items, query]);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <section className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-7 text-white shadow-sm">
        <h1 className="text-2xl font-bold sm:text-3xl">Salam, Asifa</h1>
        <p className="mt-1 text-emerald-50">
          Manage your clothing items and prices in one place.
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Shirt}
          label="Clothing Items"
          value={items.length}
          color="emerald"
          onClick={() => setView('items')}
        />
        <StatCard
          icon={Tags}
          label="Categories"
          value={categories.length}
          color="blue"
          onClick={() => setView('categories')}
        />
      </section>

      {/* Search */}
      <section>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clothing by name or category..."
            className="w-full rounded-xl border border-stone-200 bg-white py-3.5 pl-12 pr-4 text-base text-stone-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </section>

      {/* Search results */}
      {query && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-stone-900">
            Results ({filtered.length})
          </h2>
          {filtered.length === 0 ? (
            <EmptyState text="No clothing found for your search." />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((i) => (
                <ItemCard
                  key={i.id}
                  item={i}
                  canManage={canManage}
                  onSaleRecorded={onSaved}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Recently added */}
      {!query && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">Recently Added</h2>
            {items.length > 0 && (
              <button
                onClick={() => setView('items')}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                View all
              </button>
            )}
          </div>
          {recent.length === 0 ? (
            <EmptyState text="No clothing items yet. Open the password-protected Admin section to add clothing." />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((i) => (
                <ItemCard
                  key={i.id}
                  item={i}
                  canManage={canManage}
                  onSaleRecorded={onSaved}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Settings button */}
      {canManage && (
        <button
          onClick={() => setShowSettings(true)}
          className="mx-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700"
        >
          <SettingsIcon className="h-4 w-4" />
          Default profit percentage
        </button>
      )}

      {/* Modals */}
      {showSettings && settings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setShowSettings(false);
            onSaved();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: typeof Shirt;
  label: string;
  value: number | string;
  color: 'emerald' | 'blue' | 'amber';
  onClick?: () => void;
}) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex flex-col items-start gap-2 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition ${
        onClick ? 'hover:shadow-md' : 'cursor-default'
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors[color]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      <p className="text-sm text-stone-500">{label}</p>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      <Shirt className="mb-3 h-10 w-10 text-stone-300" />
      <p className="text-stone-500">{text}</p>
    </div>
  );
}

/* ---------- Items View ---------- */

function ItemsView({
  items,
  categories,
  settings,
  canManage,
  onSaved,
}: {
  items: ItemWithCategory[];
  categories: Category[];
  settings: Settings | null;
  canManage: boolean;
  onSaved: () => void;
}) {
  const [query, setQuery] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [editing, setEditing] = useState<Item | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const matchesQ =
        !q ||
        i.name.toLowerCase().includes(q) ||
        (i.categories?.name?.toLowerCase().includes(q) ?? false);
      const matchesCat =
        filterCat === 'all' || i.category_id === filterCat;
      return matchesQ && matchesCat;
    });
  }, [items, query, filterCat]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Clothing Items</h1>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clothing..."
            className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-12 pr-4 text-base shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-base shadow-sm outline-none focus:border-emerald-500"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="No clothing items found. Add items from the password-protected Admin section." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Clothing</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">In Stock</th>
                  {canManage && (
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {i.image ? (
                          <img
                            src={i.image}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-lg bg-stone-100 object-contain p-0.5"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-300">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-stone-800">
                            {i.name}
                          </p>
                          {i.categories && (
                            <p className="truncate text-xs text-stone-500">
                              {i.categories.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-emerald-700">
                      {formatPKR(
                        sellingPrice(
                          Number(i.actual_price),
                          Number(i.percentage)
                        )
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{i.quantity}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditing(i)}
                            aria-label={`Edit ${i.name}`}
                            className="rounded-lg border border-stone-200 p-2 text-stone-600 transition hover:bg-stone-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                !confirm(
                                  `Delete "${i.name}"? This cannot be undone.`
                                )
                              ) {
                                return;
                              }
                              const { error } = await supabase
                                .from('items')
                                .delete()
                                .eq('id', i.id);
                              if (error) alert(error.message);
                              else onSaved();
                            }}
                            aria-label={`Delete ${i.name}`}
                            className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <ItemFormModal
          item={editing}
          categories={categories}
          settings={settings}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onSaved();
          }}
        />
      )}
    </div>
  );
}

function ItemCard({
  item,
  canManage,
  onEdit,
  onDelete,
  onSaleRecorded,
}: {
  item: ItemWithCategory;
  canManage: boolean;
  onSaleRecorded: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const sp = sellingPrice(Number(item.actual_price), Number(item.percentage));

  useEffect(() => {
    if (!imagePreviewOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImagePreviewOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [imagePreviewOpen]);

  return (
    <div className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-stone-100 p-2">
        {item.image ? (
          <button
            type="button"
            onClick={() => setImagePreviewOpen(true)}
            aria-label={`View larger photo of ${item.name}`}
            className="flex h-full w-full cursor-zoom-in items-center justify-center rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <img
              src={item.image}
              alt={item.name}
              className="h-full w-full object-contain"
            />
          </button>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-300">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        {item.categories && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-stone-700 backdrop-blur">
            {item.categories.name}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-base font-bold text-stone-900">{item.name}</h3>
        <p className="mt-2 text-xl font-bold text-emerald-700">{formatPKR(sp)}</p>
        {canManage && (
          <button
            type="button"
            onClick={() => setSaleModalOpen(true)}
            disabled={item.quantity <= 0}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            <Check className="h-4 w-4" />
            {item.quantity > 0 ? 'Got sale' : 'Out of stock'}
          </button>
        )}
        {(onEdit || onDelete) && (
          <div className="mt-3 flex gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-200 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
      {imagePreviewOpen && item.image && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${item.name} photo`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 p-4"
          onClick={() => setImagePreviewOpen(false)}
        >
          <button
            type="button"
            onClick={() => setImagePreviewOpen(false)}
            aria-label="Close photo"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
          <div
            className="flex max-h-full w-full max-w-5xl flex-col items-center gap-4"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={item.image}
              alt={item.name}
              className="max-h-[78vh] max-w-full rounded-xl object-contain"
            />
            <div className="text-center text-white">
              <p className="text-lg font-semibold">{item.name}</p>
              {item.categories && (
                <p className="mt-1 text-sm text-white/70">
                  {item.categories.name}
                </p>
              )}
              <p className="mt-2 text-2xl font-bold">{formatPKR(sp)}</p>
            </div>
          </div>
        </div>
      )}
      {canManage && saleModalOpen && (
        <SaleFormModal
          item={item}
          defaultSalePrice={sp}
          onClose={() => setSaleModalOpen(false)}
          onSaved={() => {
            setSaleModalOpen(false);
            onSaleRecorded();
          }}
        />
      )}
    </div>
  );
}

function SaleFormModal({
  item,
  defaultSalePrice,
  onClose,
  onSaved,
}: {
  item: Item;
  defaultSalePrice: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [salePrice, setSalePrice] = useState(String(defaultSalePrice));
  const [quantity, setQuantity] = useState('1');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    setFormError(null);
    const amount = Number(salePrice);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter a per-item sale price greater than zero.');
      return;
    }
    const soldQuantity = Number(quantity);
    if (
      !Number.isInteger(soldQuantity) ||
      soldQuantity < 1 ||
      soldQuantity > item.quantity
    ) {
      setFormError(`Enter a whole-number quantity from 1 to ${item.quantity}.`);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('sales')
        .insert({
          item_id: item.id,
          sale_price: amount,
          quantity: soldQuantity,
        });
      if (error) {
        setFormError(error.message);
        return;
      }
      onSaved();
    } catch (error: unknown) {
      setFormError(
        error instanceof Error ? error.message : 'Unable to record this sale.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Record Sale" onClose={onClose}>
      <div className="space-y-4">
        <p className="font-semibold text-stone-800">{item.name}</p>
        <p className="text-sm text-stone-500">
          {item.quantity} {item.quantity === 1 ? 'item' : 'items'} in stock
        </p>
        <Field label="Quantity Sold">
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max={item.quantity}
            step="1"
            autoFocus
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Sale Price per Item (Rs.)">
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={salePrice}
            onChange={(event) => setSalePrice(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
            className={inputCls}
          />
        </Field>
        {formError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-stone-200 py-3 font-medium text-stone-600 transition hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Record Sale'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AdminLock({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== ADMIN_PASSWORD) {
      setError('Incorrect password.');
      setPassword('');
      return;
    }
    setError(null);
    onUnlock();
  };

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <LockKeyhole className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-bold text-stone-900">Admin locked</h1>
      <p className="mt-1 text-sm text-stone-500">
        Enter the password to manage inventory and view sales calculations.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="Password">
          <input
            type="password"
            autoComplete="off"
            autoFocus
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputCls}
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700"
        >
          Unlock admin
        </button>
      </form>
    </section>
  );
}

function AdminView({
  sales,
  categories,
  settings,
  onSaved,
  onLock,
}: {
  sales: Sale[];
  categories: Category[];
  settings: Settings | null;
  onSaved: () => void;
  onLock: () => void;
}) {
  const [addingItem, setAddingItem] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const totalProfit = sales.reduce((total, sale) => total + Number(sale.profit), 0);
  const suggestedCategories = [
    '2-Piece Suits',
    '3-Piece Suits',
    'Lawn Suits',
    'Cotton Suits',
    'Fancy Dresses',
    'Unstitched Clothes',
    'Stitched Clothes',
    'Shawls and Dupattas',
    'Other',
  ];

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Admin</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage stock and view sales profit calculations.
          </p>
        </div>
        <button
          type="button"
          onClick={onLock}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
        >
          <LockKeyhole className="h-4 w-4" />
          Lock
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setAddingItem(true)}
          className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold text-stone-900">Add Clothing</p>
            <p className="text-sm text-stone-500">Add an item and stock quantity</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setAddingCategory(true)}
          className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Tags className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold text-stone-900">Add Category</p>
            <p className="text-sm text-stone-500">Create a clothing group</p>
          </div>
        </button>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-base font-bold text-stone-900">
          Example Categories
        </h2>
        <p className="mb-3 text-sm text-stone-500">
          Tap a suggestion to add it quickly.
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestedCategories.map((name) => {
            const exists = categories.some(
              (category) => category.name.toLowerCase() === name.toLowerCase()
            );
            return (
              <button
                key={name}
                type="button"
                disabled={exists}
                onClick={async () => {
                  const { error } = await supabase
                    .from('categories')
                    .insert({ name });
                  if (error) alert(error.message);
                  else onSaved();
                }}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  exists
                    ? 'cursor-default border-stone-200 bg-stone-50 text-stone-400'
                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                {exists && <Check className="mr-1 inline h-3.5 w-3.5" />}
                {name}
              </button>
            );
          })}
        </div>
      </section>

      {sales.length === 0 ? (
        <EmptyState text="No sales recorded yet. Use Got sale on a clothing item to get started." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Quantity</th>
                    <th className="px-4 py-3 font-semibold">Sale Price</th>
                    <th className="px-4 py-3 font-semibold">Profit</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sales.map((sale) => {
                    const profit = Number(sale.profit);
                    return (
                      <tr key={sale.id}>
                        <td className="px-4 py-3 font-medium text-stone-800">
                          {sale.item_name}
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {Number(sale.quantity)}
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {formatPKR(Number(sale.sale_price))}
                        </td>
                        <td
                          className={`px-4 py-3 font-semibold ${
                            profit >= 0 ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {formatPKR(profit)}
                        </td>
                        <td className="px-4 py-3 text-stone-500">
                          {new Date(sale.sold_at).toLocaleString('en-PK', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                !confirm(
                                  `Delete this sale of ${sale.quantity} ${sale.quantity === 1 ? 'item' : 'items'} of "${sale.item_name}" and return them to stock?`
                                )
                              ) {
                                return;
                              }
                              const { error } = await supabase
                                .from('sales')
                                .delete()
                                .eq('id', sale.id);
                              if (error) {
                                alert(error.message);
                                return;
                              }
                              onSaved();
                            }}
                            aria-label={`Delete sale of ${sale.item_name} and restore stock`}
                            className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-stone-200 bg-stone-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-4 font-bold text-stone-800">
                      Total profit
                    </td>
                    <td
                      colSpan={3}
                      className={`px-4 py-4 text-lg font-bold ${
                        totalProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {formatPKR(totalProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
      {addingItem && (
        <ItemFormModal
          categories={categories}
          settings={settings}
          onClose={() => setAddingItem(false)}
          onSaved={() => {
            setAddingItem(false);
            onSaved();
          }}
        />
      )}
      {addingCategory && (
        <CategoryFormModal
          onClose={() => setAddingCategory(false)}
          onSaved={() => {
            setAddingCategory(false);
            onSaved();
          }}
        />
      )}
    </section>
  );
}

/* ---------- Item Form Modal ---------- */

function ItemFormModal({
  item,
  categories,
  settings,
  onClose,
  onSaved,
}: {
  item?: Item;
  categories: Category[];
  settings: Settings | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const [name, setName] = useState(item?.name ?? '');
  const [categoryId, setCategoryId] = useState(item?.category_id ?? '');
  const [image, setImage] = useState<string | null>(item?.image ?? null);
  const [actualPrice, setActualPrice] = useState<string>(
    item ? String(item.actual_price) : ''
  );
  const [percentage, setPercentage] = useState<string>(
    item ? String(item.percentage) : settings
      ? String(settings.default_percentage)
      : '25'
  );
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const ap = parseFloat(actualPrice) || 0;
  const pct = parseFloat(percentage) || 0;
  const stockQuantity = Number(quantity);
  const profit = profitAmount(ap, pct);
  const sp = sellingPrice(ap, pct);

  const handleImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Please choose an image file.');
      return;
    }
    if (file.size > 8_000_000) {
      setFormError('Image is too large. Please use an image under 8 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const source = new Image();
      source.onload = () => {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(source.naturalWidth, source.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(source.naturalWidth * scale);
        canvas.height = Math.round(source.naturalHeight * scale);
        const context = canvas.getContext('2d');
        if (!context) {
          setImage(reader.result as string);
          return;
        }
        context.filter = 'brightness(1.08) contrast(1.12) saturate(1.08)';
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        setImage(canvas.toDataURL('image/jpeg', 0.88));
        setFormError(null);
      };
      source.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Please enter a clothing name.');
      return;
    }
    if (ap <= 0) {
      setFormError('Please enter the actual price.');
      return;
    }
    if (
      !Number.isInteger(stockQuantity) ||
      stockQuantity < 0 ||
      stockQuantity > 2_147_483_647
    ) {
      setFormError('Enter a whole-number stock quantity of zero or more.');
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      category_id: categoryId || null,
      image,
      actual_price: ap,
      percentage: pct,
      quantity: stockQuantity,
      notes: notes.trim() || null,
    };
    let error;
    if (isEdit && item) {
      ({ error } = await supabase
        .from('items')
        .update(payload)
        .eq('id', item.id));
    } else {
      ({ error } = await supabase.from('items').insert(payload));
    }
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    onSaved();
  };

  return (
    <Modal
      title={isEdit ? 'Edit Clothing' : 'Add New Clothing'}
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Image upload */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-700">
            Clothing Photo
          </label>
          {image ? (
            <div className="relative">
              <img
                src={image}
                alt="preview"
                className="aspect-[4/3] max-h-80 w-full rounded-xl bg-stone-100 object-contain p-2"
              />
              <button
                onClick={() => setImage(null)}
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-stone-700 shadow"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 transition hover:border-emerald-400 hover:bg-emerald-50">
              <ImageIcon className="mb-2 h-8 w-8 text-stone-400" />
              <span className="text-sm text-stone-500">
                Tap to upload and enhance the photo
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImage(e.target.files?.[0])}
              />
            </label>
          )}
        </div>

        <Field label="Clothing Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 3-Piece Suit, Lawn Suit"
            className={inputCls}
          />
        </Field>

        <Field label="Category">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputCls}
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {categories.some((c) => c.name.toLowerCase().includes('3-piece')) && (
            <button
              type="button"
              onClick={() => {
                const threePiece = categories.find((c) =>
                  c.name.toLowerCase().includes('3-piece')
                );
                if (threePiece) setCategoryId(threePiece.id);
              }}
              className="mt-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              Mark as 3-Piece Suit
            </button>
          )}
          {categories.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              No categories yet — add one from the password-protected Admin section.
            </p>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Actual Price (Rs.)">
            <input
              type="number"
              inputMode="decimal"
              value={actualPrice}
              onChange={(e) => setActualPrice(e.target.value)}
              placeholder="2000"
              className={inputCls}
            />
          </Field>
          <Field label="Profit %">
            <input
              type="number"
              inputMode="decimal"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              placeholder="25"
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Quantity in Stock">
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="1"
            className={inputCls}
          />
        </Field>

        {/* Price breakdown */}
        <div className="rounded-xl bg-emerald-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <Calculator className="h-4 w-4" />
            Price Calculation
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>Actual Price</span>
              <span className="font-medium">{formatPKR(ap)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Profit Amount ({pct}%)</span>
              <span className="font-medium text-emerald-700">
                +{formatPKR(profit)}
              </span>
            </div>
            <div className="flex justify-between border-t border-emerald-200 pt-1.5">
              <span className="font-semibold text-stone-800">
                Selling Price
              </span>
              <span className="text-lg font-bold text-emerald-700">
                {formatPKR(sp)}
              </span>
            </div>
          </div>
        </div>

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any extra details about this item..."
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </Field>

        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-stone-200 py-3 font-medium text-stone-600 transition hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? (
              'Saving...'
            ) : (
              <>
                <Check className="h-5 w-5" />
                {isEdit ? 'Save Changes' : 'Add Item'}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Categories View ---------- */

function CategoriesView({
  categories,
  canManage,
  onSaved,
}: {
  categories: Category[];
  canManage: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.from('items').select('category_id').then(({ data }) => {
      if (!data) return;
      const counts: Record<string, number> = {};
      for (const row of data as { category_id: string | null }[]) {
        if (row.category_id) {
          counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
        }
      }
      setItemCounts(counts);
    });
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Categories</h1>
      </div>

      {categories.length === 0 ? (
        <EmptyState text="No categories yet. Add one from the password-protected Admin section." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Tags className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-stone-900">{c.name}</p>
                  <p className="text-xs text-stone-500">
                    {itemCounts[c.id] ?? 0} item
                    {(itemCounts[c.id] ?? 0) === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setEditing(c)}
                    className="rounded-lg border border-stone-200 p-2 text-stone-600 transition hover:bg-stone-50"
                    aria-label={`Edit ${c.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        confirm(
                          `Delete "${c.name}"? Items in this category will keep their data but lose the category link.`
                        )
                      ) {
                        const { error } = await supabase
                          .from('categories')
                          .delete()
                          .eq('id', c.id);
                        if (error) alert(error.message);
                        else onSaved();
                      }
                    }}
                    className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <CategoryFormModal
          category={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onSaved();
          }}
        />
      )}
    </div>
  );
}

function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  category?: Category;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Please enter a category name.');
      return;
    }
    setSaving(true);
    let error;
    if (isEdit && category) {
      ({ error } = await supabase
        .from('categories')
        .update({ name: name.trim() })
        .eq('id', category.id));
    } else {
      ({ error } = await supabase
        .from('categories')
        .insert({ name: name.trim() }));
    }
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    onSaved();
  };

  return (
    <Modal
      title={isEdit ? 'Edit Category' : 'Add New Category'}
      onClose={onClose}
    >
      <div className="space-y-4">
        <Field label="Category Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 3-Piece Suits"
            className={inputCls}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </Field>
        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-stone-200 py-3 font-medium text-stone-600 transition hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              'Saving...'
            ) : (
              <>
                <Check className="h-5 w-5" />
                {isEdit ? 'Save' : 'Add Category'}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Settings Modal ---------- */

function SettingsModal({
  settings,
  onClose,
  onSaved,
}: {
  settings: Settings;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [val, setVal] = useState(String(settings.default_percentage));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    setFormError(null);
    const num = parseFloat(val);
    if (isNaN(num) || num < 0 || num > 1000) {
      setFormError('Please enter a valid percentage (0 to 1000).');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('settings')
      .update({ default_percentage: num })
      .eq('id', 1);
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    onSaved();
  };

  return (
    <Modal title="Default Profit Percentage" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-stone-500">
          This percentage is automatically filled in when adding a new clothing
          item. You can still change it for each item.
        </p>
        <Field label="Default Percentage (%)">
          <input
            type="number"
            inputMode="decimal"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="25"
            className={inputCls}
          />
        </Field>
        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-stone-200 py-3 font-medium text-stone-600 transition hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Shared UI ---------- */

const inputCls =
  'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-stone-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-stone-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
