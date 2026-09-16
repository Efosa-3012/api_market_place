import { createBrowserRouter } from 'react-router-dom'

import PublicLayout from '../layouts/PublicLayout'
import AppLayout from '../layouts/AppLayout'
import AdminLayout from '../layouts/AdminLayout'
import BankLayout from '../layouts/BankLayout'

import LandingPage from '../pages/public/LandingPage'
import CallbackPage from '../pages/public/CallbackPage'
import LoginPage from '../pages/auth/LoginPage'
import SignupPage from '../pages/auth/SignupPage'

import DashboardPage from '../pages/app/DashboardPage'
import MarketplacePage from '../pages/app/MarketplacePage'
import ApiDetailsPage from '../pages/app/ApiDetailsPage'
import MyApisPage from '../pages/app/MyApisPage'
import DeveloperPortalPage from '../pages/app/DeveloperPortalPage'
import BillingPage from '../pages/app/BillingPage'
import SettingsPage from '../pages/app/SettingsPage'

import BankLoginPage from '../pages/bank/BankLoginPage'
import ConsentPage from '../pages/bank/ConsentPage'
import ConnectedAppsPage from '../pages/bank/ConnectedAppsPage'
import SandboxPage from '../pages/app/SandboxPage'

import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import AdminAnalyticsPage from '../pages/admin/AdminAnalyticsPage'
import AdminApisPage from '../pages/admin/AdminApisPage'
import AdminDevelopersPage from '../pages/admin/AdminDevelopersPage'
import AdminSubscriptionsPage from '../pages/admin/AdminSubscriptionsPage'
import AdminBillingPage from '../pages/admin/AdminBillingPage'
import AdminSettingsPage from '../pages/admin/AdminSettingsPage'

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: <LandingPage />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/signup',
        element: <SignupPage />,
      },
    ],
  },

  {
    path: '/app',
    element: <AppLayout />,
    children: [
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'marketplace',
        element: <MarketplacePage />,
      },
      {
        path: 'marketplace/:id',
        element: <ApiDetailsPage />,
      },
      {
        path: 'my-apis',
        element: <MyApisPage />,
      },
      {
        path: 'sandbox',
        element: <SandboxPage />,
      },
      {
        path: 'developer-portal',
        element: <DeveloperPortalPage />,
      },
      {
        path: 'billing',
        element: <BillingPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },

  // The sample fintech app's redirect_uri (registered on the demo client).
  { path: '/callback', element: <CallbackPage /> },

  // The bank's own customer-facing pages. /consent is where /oauth/authorize
  // sends the customer (CONSENT_UI_URL on the backend).
  {
    element: <BankLayout />,
    children: [
      { path: '/bank/login', element: <BankLoginPage /> },
      { path: '/consent', element: <ConsentPage /> },
      { path: '/bank/connected-apps', element: <ConnectedAppsPage /> },
    ],
  },

  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        path: 'dashboard',
        element: <AdminDashboardPage />,
      },
      {
        path: 'analytics',
        element: <AdminAnalyticsPage />,
      },
      {
        path: 'apis',
        element: <AdminApisPage />,
      },
      {
        path: 'developers',
        element: <AdminDevelopersPage />,
      },
      {
        path: 'subscriptions',
        element: <AdminSubscriptionsPage />,
      },
      {
        path: 'billing',
        element: <AdminBillingPage />,
      },
      {
        path: 'settings',
        element: <AdminSettingsPage />,
      },
    ],
  },
])

export default router