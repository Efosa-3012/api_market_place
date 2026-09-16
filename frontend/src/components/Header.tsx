import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { portalSession } from '../lib/api'
import { portal } from '../lib/portal'

interface HeaderProps {
  menuOpen?: boolean
  onMenuClick?: () => void
}

export default function Header({
  menuOpen = false,
  onMenuClick,
}: HeaderProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const developer = portalSession.developer()
  const initial = (developer?.name ?? 'D').trim().charAt(0).toUpperCase()

  function signOut() {
    portal.logout()
    navigate('/login', { replace: true })
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const query = search.trim()

    navigate(
      query
        ? `/app/marketplace?q=${encodeURIComponent(query)}`
        : '/app/marketplace',
    )
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-line bg-white px-4">
      <a
        href="#app-main"
        className="sr-only rounded bg-white p-3 text-blue-700 focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <div className="flex shrink-0 items-center gap-3 lg:w-52">
        <button
          id="app-menu-button"
          type="button"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="app-navigation"
          onClick={onMenuClick}
          className="grid size-10 cursor-pointer place-items-center rounded-lg text-muted hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 lg:hidden"
        >
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            {menuOpen ? (
              <path d="m6 6 12 12M6 18 18 6" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <Link to="/app/marketplace" aria-label="Stanbic IBTC marketplace">
          <img
            src="/images/LogoBlue_.png"
            alt="Stanbic IBTC"
            className="h-9 w-28 object-contain"
          />
        </Link>
      </div>

      <form
        role="search"
        aria-label="Marketplace search"
        onSubmit={handleSearch}
        className="hidden h-10 max-w-2xl flex-1 items-center overflow-hidden rounded-lg border border-line bg-canvas focus-within:border-blue-500 sm:flex"
      >
        <label htmlFor="header-search" className="sr-only">
          Search APIs
        </label>

        <input
          id="header-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search APIs..."
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-faint"
        />

        <button
          type="submit"
          aria-label="Search APIs"
          className="grid h-full w-11 cursor-pointer place-items-center text-muted hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="10.5" cy="10.5" r="7" />
            <path d="m16 16 5 5" />
          </svg>
        </button>
      </form>

      <div className="ml-auto flex items-center gap-3">
        <details className="relative">
          <summary
            aria-label="Notifications"
            className="grid size-10 cursor-pointer list-none place-items-center rounded-lg text-muted hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          </summary>

          <div className="absolute right-0 top-12 w-56 rounded-lg border border-line bg-white p-4 shadow-lg">
            <p className="text-sm font-semibold">Notifications</p>
            <p className="mt-2 text-xs text-muted">
              No notifications yet.
            </p>
          </div>
        </details>

        <details className="relative border-l border-line pl-3">
          <summary
            aria-label="Account menu"
            className="flex cursor-pointer list-none items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bank text-sm text-white">
              {initial}
            </span>

            <span className="hidden text-left text-xs leading-5 md:block">
              <span className="block max-w-40 truncate font-semibold">{developer?.name ?? 'Developer'}</span>
              <span className="block max-w-40 truncate text-muted">
                {developer?.company ?? developer?.email ?? 'My Workspace'}
              </span>
            </span>
          </summary>

          <div className="absolute right-0 top-12 w-56 rounded-lg border border-line bg-white p-2 shadow-lg">
            <p className="truncate px-2 py-1 text-xs text-muted">{developer?.email}</p>
            <Link
              to="/app/settings"
              className="block rounded px-2 py-2 text-sm hover:bg-blue-50"
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="block w-full cursor-pointer rounded px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Sign out
            </button>
          </div>
        </details>
      </div>
    </header>
  )
}