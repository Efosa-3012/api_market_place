import { NavLink } from 'react-router-dom'

const navigation = [
  { label: 'Dashboard', path: '/app/dashboard' },
  { label: 'Marketplace', path: '/app/marketplace' },
  { label: 'My APIs', path: '/app/my-apis' },
  { label: 'Developer Portal', path: '/app/developer-portal' },
  { label: 'Billing', path: '/app/billing' },
  { label: 'Settings', path: '/app/settings' },
]

function Sidebar() {
  return (
    <aside>
      <div>API Marketplace</div>

      <nav>
        {navigation.map((item) => (
          <NavLink key={item.path} to={item.path}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar