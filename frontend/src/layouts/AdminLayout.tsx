import { NavLink, Outlet } from 'react-router-dom'

const navigation = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'API Analytics', path: '/admin/analytics' },
  { label: 'APIs', path: '/admin/apis' },
  { label: 'Developers', path: '/admin/developers' },
  { label: 'Subscriptions', path: '/admin/subscriptions' },
  { label: 'Billing', path: '/admin/billing' },
  { label: 'Settings', path: '/admin/settings' },
]

function AdminLayout() {
  return (
    <div>
      <aside>
        <div>Stanbic API Marketplace</div>

        <nav>
          {navigation.map((item) => (
            <NavLink key={item.path} to={item.path}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div>
        <header>
          <h1>Admin Portal</h1>
        </header>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout