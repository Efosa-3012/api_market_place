import { createBrowserRouter } from 'react-router-dom'

import PublicLayout from '../layouts/PublicLayout'
import AppLayout from '../layouts/AppLayout'
import AdminLayout from '../layouts/AdminLayout'
import BankLayout from '../layouts/BankLayout'
import SampleAppLayout from '../layouts/SampleAppLayout'

import LandingPage from '../pages/public/LandingPage'
import CallbackPage from '../pages/public/CallbackPage'
import NotFoundPage from '../pages/public/NotFoundPage'
import LoginPage from '../pages/auth/LoginPage'
import SignupPage from '../pages/auth/SignupPage'

import DashboardPage from '../pages/app/DashboardPage'
import MarketplacePage from '../pages/app/MarketplacePage'
import ApiDetailsPage from '../pages/app/ApiDetailsPage'
import MyApisPage from '../pages/app/MyApisPage'
import DeveloperPortalPage from '../pages/app/DeveloperPortalPage'
import SettingsPage from '../pages/app/SettingsPage'

import BankLoginPage from '../pages/bank/BankLoginPage'
import ConsentPage from '../pages/bank/ConsentPage'
import ConnectedAppsPage from '../pages/bank/ConnectedAppsPage'
import SandboxPage from '../pages/app/SandboxPage'
import BudgetBuddyPage from '../pages/sample/BudgetBuddyPage'

import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import AdminAnalyticsPage from '../pages/admin/AdminAnalyticsPage'

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <NotFoundPage />,
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
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },

  // BudgetBuddy — the sample fintech app. Deliberately outside the marketplace
  // chrome: the customer should feel they left this app to visit their bank.
  {
    element: <SampleAppLayout />,
    children: [{ path: '/budgetbuddy', element: <BudgetBuddyPage /> }],
  },
  // Its registered redirect_uri, where the bank sends the customer back.
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
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

export default router