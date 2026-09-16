import { Link, NavLink } from 'react-router-dom'

interface SidebarProps {
  onNavigate?: () => void
}

const links = [
  {
    label: 'Marketplace',
    to: '/app/marketplace',
    icon: 'M3 10h18M5 10v10h14V10M3 10l2-6h14l2 6M9 20v-6h6v6',
  },
  {
    label: 'Dashboard',
    to: '/app/dashboard',
    icon: 'm3 10 9-7 9 7v10H3V10M9 20v-7h6v7',
  },
  {
    label: 'My Apps',
    to: '/app/my-apis',
    icon: 'M4 8h16v12H4zM7 8V4h10v4M4 12h16',
  },
{
    label: 'Sandbox',
    to: '/app/sandbox',
    icon: 'M4 8h16v12H4zM7 8V4h10v4M4 12h16',
  },
  {
    label: 'Developer Portal',
    to: '/app/developer-portal',
    icon: 'm7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16',
  },
]

function NavIcon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={path} />
    </svg>
  )
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const linkClass =
    'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-blue-600'

  return (
    <div className="flex min-h-full flex-col p-4">
      <nav aria-label="Main application menu" className="space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `${linkClass} ${
                isActive
                  ? 'bg-[#eef5ff] font-medium text-[#1010ff]'
                  : 'text-[#465b78] hover:bg-[#f5f8fc]'
              }`
            }
          >
            <NavIcon path={link.icon} />
            {link.label}
          </NavLink>
        ))}

        <div className="my-3 border-t border-[#edf0f5]" />

        <a
          href="/#support"
          onClick={onNavigate}
          className={`${linkClass} text-[#465b78] hover:bg-[#f5f8fc]`}
        >
          <NavIcon path="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 16v.5" />
          Support
        </a>

        <NavLink
          to="/app/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `${linkClass} ${
              isActive
                ? 'bg-[#eef5ff] font-medium text-[#1010ff]'
                : 'text-[#465b78] hover:bg-[#f5f8fc]'
            }`
          }
        >
          <NavIcon path="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6" />
          Settings
        </NavLink>
      </nav>

      <div className="mt-8 rounded-xl bg-gradient-to-br from-[#dceaff] to-[#edf5ff] p-5">
        <p className="text-sm font-bold leading-5 text-[#1010ff]">
          Build
          <br />
          Innovate
          <br />
          Transform
        </p>

        <p className="mt-2 text-xs text-[#174cba]">
          with Stanbic IBTC APIs
        </p>

        <Link
          to="/app/developer-portal"
          onClick={onNavigate}
          className="mt-4 flex min-h-9 items-center justify-center gap-2 rounded-xl border border-blue-400 bg-white px-2 text-xs text-[#1010ff] hover:bg-blue-50"
        >
          View Documentation <span aria-hidden="true">→</span>
        </Link>
      </div>

      <Link
        to="/app/settings"
        onClick={onNavigate}
        className="mt-4 flex items-center gap-3 border-t border-[#edf0f5] px-2 py-4"
      >
        <span className="grid size-8 place-items-center rounded-full border border-[#e1e8f1] bg-[#f8fafc] text-xs">
          D
        </span>

        <span className="text-xs leading-4">
          <span className="block font-medium">Developer</span>
          <span className="text-[#8b9bb2]">My Workspace</span>
        </span>
      </Link>
    </div>
  )
}