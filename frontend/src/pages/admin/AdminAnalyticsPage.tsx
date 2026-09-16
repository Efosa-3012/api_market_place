import { Navigate, useLocation } from 'react-router-dom'

// Analytics now live in Portal Overview. Keep existing bookmarks working.
export default function AdminAnalyticsPage() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/admin/dashboard', search }} replace />
}
