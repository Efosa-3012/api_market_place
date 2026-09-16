import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import '../styles/landing.css'

export default function PublicLayout() {
  const { pathname } = useLocation()
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'

  const isLoginPage = normalizedPath === '/login'
  const isSignupPage = normalizedPath === '/signup'
  const isAuthPage = isLoginPage || isSignupPage

  return (
    <div className="public-site">
      {!isAuthPage && <Navbar />}

      <main id="main-content">
        <Outlet />
      </main>

    
      {!isAuthPage && <Footer />}
    </div>
  )
}