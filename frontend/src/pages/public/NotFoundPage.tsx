import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { ButtonLink } from '../../components/ui'

/**
 * Catch-all for unknown URLs and for render errors anywhere in the tree. On a
 * bank domain a raw stack trace is never acceptable; this is what shows instead.
 */
export default function NotFoundPage() {
  const error = useRouteError()
  const notFound = !error || (isRouteErrorResponse(error) && error.status === 404)

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4 font-[Arial,Helvetica,sans-serif] text-ink">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
        <img src="/images/LogoBlue_.png" alt="Stanbic IBTC" className="mx-auto mb-6 h-9 object-contain" />
        <h1 className="text-xl font-semibold">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {notFound
            ? 'The link may be out of date, or the page may have moved.'
            : 'The page could not be displayed. Our team has been notified. Please try again.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/">Marketplace home</ButtonLink>
          <ButtonLink to="/bank/connected-apps" secondary>Internet Banking</ButtonLink>
        </div>
      </div>
    </div>
  )
}
