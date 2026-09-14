import { createBrowserRouter } from 'react-router-dom'

import PublicLayout from '../layouts/PublicLayout'
import AppLayout from '../layouts/AppLayout'
import AdminLayout from '../layouts/AdminLayout'

import LandingPage from '../pages/public/LandingPage'
import LoginPage from '../pages/auth/LoginPage'
import SignupPage from '../pages/auth/SignupPage'

import DashboardPage from '../pages/app/DashboardPage'
import MarketplacePage from '../pages/app/MarketplacePage'
import ApiDetailsPage from '../pages/app/ApiDetailsPage'
import MyApisPage from '../pages/app/MyApisPage'
import DeveloperPortalPage from '../pages/app/DeveloperPortalPage'
import BillingPage from '../pages/app/BillingPage'
import SettingsPage from '../pages/app/SettingsPage'

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