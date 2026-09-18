import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import { portalSession } from '../lib/api'

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Everything under /app is the developer's workspace: no portal session, no entry.
  if (!portalSession.isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <div className="min-h-dvh bg-white font-sans text-ink">
      <Header
        menuOpen={menuOpen}
        onMenuClick={() => setMenuOpen((current) => !current)}
      />

      {menuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/30 lg:hidden"
        />
      )}

      <aside
        id="app-navigation"
        aria-label="Application navigation"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setMenuOpen(false)
            document.getElementById('app-menu-button')?.focus()
          }
        }}
        className={`fixed bottom-0 left-0 top-16 z-40 w-60 overflow-y-auto border-r border-line bg-white ${
          menuOpen ? 'block' : 'hidden lg:block'
        }`}
      >
        <Sidebar onNavigate={() => setMenuOpen(false)} />
      </aside>

      <main id="app-main" className="min-w-0 lg:ml-60">
        <Outlet />
      </main>
    </div>
  )
}