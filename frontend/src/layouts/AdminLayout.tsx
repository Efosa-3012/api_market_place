import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { portalSession } from '../lib/api'
const navigation = [
  {
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: 'M4 20V9h5v11M9 20V4h5v16M14 20V12h5v8',
  },
  {
    label: 'Partners',
    path: '/admin/developers',
    icon: 'M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21v-3a6 6 0 0 1 12 0v3M16 4a4 4 0 0 1 0 8M18 15a5 5 0 0 1 4 5',
  },
  {
    label: 'API Catalog',
    path: '/admin/apis',
    icon: 'M3 8h18v12H3zM6 8V4h12v4M3 12h18',
  },
  {
    label: 'Settings',
    path: '/admin/settings',
    icon: 'M3 6h18M3 12h18M3 18h18M8 3v6M16 9v6M10 15v6',
  },
]
export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // The control room is bank staff only. Without a session there is nothing to
  // check, so send them to sign in; with a developer session, say plainly that
  // the account is the wrong one rather than bouncing them around a login they
  // have already passed.
  if (!portalSession.isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname, mode: 'admin' }} />
  }
  if (!portalSession.isAdmin()) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f8f9fc] px-4 font-[Arial,Helvetica,sans-serif]">
        <section className="w-full max-w-md rounded-2xl border border-[#e4e9f2] bg-white p-8 text-center">
          <h1 className="text-xl font-semibold text-[#142033]">Staff access only</h1>
          <p className="mt-3 text-sm leading-6 text-[#465b78]">
            The analytics dashboard is limited to bank administrators. You are signed in as a developer account,
            which does not have access.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/app/dashboard"
              className="inline-flex min-h-10 items-center rounded-lg border border-[#0450ff] bg-[#0450ff] px-4 text-sm font-medium text-white hover:bg-[#003bd0]"
            >
              Back to your workspace
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-10 items-center rounded-lg border border-[#dfe6f0] bg-white px-4 text-sm font-medium text-[#405371] hover:bg-blue-50"
            >
              Sign in as staff
            </Link>
          </div>
        </section>
      </main>
    )
  }
  const staff = portalSession.developer()
  const initials = (staff?.name ?? 'Administrator')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    navigate(
      `/admin/dashboard${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`,
    )
  }

  function signOut() {
    portalSession.clear()
    navigate('/login', { replace: true })
  }
  return (
    <div className="min-h-dvh bg-[#f8f9fc] font-[Arial,Helvetica,sans-serif] text-[#142033] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-blue-600 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-blue-600">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-[#e4e9f2] bg-white px-4">
        <a
          href="#admin-main"
          className="sr-only rounded bg-white p-3 focus:not-sr-only focus:absolute"
        >
          Skip to content
        </a>
        <div className="flex shrink-0 items-center gap-3 lg:w-52">
          <button
            id="admin-menu"
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="admin-sidebar"
            aria-label={
              open ? 'Close admin navigation' : 'Open admin navigation'
            }
            className="size-10 rounded hover:bg-blue-50 lg:hidden"
          >
            {open ? '✕' : '☰'}
          </button>
          <Link to="/admin/dashboard">
            <img
              src="/images/LogoBlue_.png"
              alt="Stanbic IBTC"
              className="h-10 w-32 object-contain"
            />
          </Link>
        </div>
        <form
          onSubmit={submit}
          role="search"
          className="hidden max-w-2xl flex-1 sm:block"
        >
          <label className="sr-only" htmlFor="admin-search">
            Search dashboard APIs and partners
          </label>
          <div className="flex h-10 overflow-hidden rounded-lg border border-[#e1e8f1] bg-[#f8fafc]">
            <input
              id="admin-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search APIs or partners..."
              className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-[#8b9db8] focus:ring-2 focus:ring-inset focus:ring-blue-500"
            />
            <button aria-label="Search" className="px-3 text-xs text-blue-600">
              Search
            </button>
          </div>
        </form>
        <div className="ml-auto flex items-center gap-3">
          <details className="relative">
            <summary
              aria-label="Notifications"
              className="grid size-10 cursor-pointer list-none place-items-center rounded hover:bg-blue-50 [&::-webkit-details-marker]:hidden"
            >
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9M10 21h4" />
              </svg>
            </summary>
            <div className="absolute right-0 top-12 w-56 rounded-lg border border-slate-200 bg-white p-4 text-xs shadow-lg">
              API health alerts are listed in the dashboard below.
            </div>
          </details>
          <Link
            to="/admin/settings"
            className="flex items-center gap-3 border-l border-slate-200 pl-3"
          >
            <span className="grid size-9 place-items-center rounded-full bg-[#0b2858] text-xs text-white">
              {initials}
            </span>
            <span className="hidden text-xs leading-5 md:block">
              <strong className="block">{staff?.name ?? 'Administrator'}</strong>
              <span className="text-slate-500">{staff?.company ?? 'Admin workspace'}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-[#405371] hover:bg-blue-50"
          >
            Sign out
          </button>
        </div>
      </header>
      {open && (
        <button
          aria-label="Close admin navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/30 lg:hidden"
        />
      )}
      <aside
        id="admin-sidebar"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
            document.getElementById('admin-menu')?.focus()
          }
        }}
        className={`fixed bottom-0 left-0 top-16 z-40 w-60 overflow-y-auto border-r border-slate-200 bg-white ${open ? 'block' : 'hidden lg:block'}`}
      >
        <div className="flex min-h-full flex-col p-4">
          <nav aria-label="Admin navigation" className="space-y-1">
            {navigation.map((item, index) => (
              <div
                key={item.path}
                className={
                  index === 3 ? 'mt-4 border-t border-slate-100 pt-4' : ''
                }
              >
                <NavLink
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-4 rounded-lg px-3 text-sm ${isActive ? 'bg-[#eef5ff] text-[#1010ff]' : 'text-[#465b78] hover:bg-slate-50'}`
                  }
                >
                  <svg
                    aria-hidden="true"
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={item.icon} />
                  </svg>
                  {item.label}
                </NavLink>
              </div>
            ))}
          </nav>
          <Link
            to="/admin/settings"
            className="mt-auto flex items-center gap-3 border-t border-slate-100 pt-5"
          >
            <span className="grid size-9 place-items-center rounded-full bg-[#0b2858] text-xs text-white">
              {initials}
            </span>
            <span className="min-w-0 text-xs leading-5">
              <strong className="block truncate">{staff?.name ?? 'Administrator'}</strong>
              <span className="text-slate-500">Bank staff</span>
            </span>
          </Link>
        </div>
      </aside>
      <main id="admin-main" className="min-w-0 lg:ml-60">
        <Outlet />
      </main>
    </div>
  )
}
