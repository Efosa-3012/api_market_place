import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-white font-[Arial,Helvetica,sans-serif] text-[#151c2d]">
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
        className={`fixed bottom-0 left-0 top-16 z-40 w-60 overflow-y-auto border-r border-[#e6ebf3] bg-white ${
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