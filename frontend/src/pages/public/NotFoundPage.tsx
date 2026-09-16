import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'

/**
 * Catch-all for unknown URLs and for render errors anywhere in the tree. On a
 * bank domain a raw stack trace is never acceptable; this is what shows instead.
 */
export default function NotFoundPage() {
  const error = useRouteError()
  const notFound = !error || (isRouteErrorResponse(error) && error.status === 404)

  return (
    <div className="grid min-h-dvh place-items-center bg-[#f3f5f9] px-4 font-[Arial,Helvetica,sans-serif] text-[#151c2d]">
      <div className="w-full max-w-md rounded-2xl border border-[#e3e9f2] bg-white p-8 text-center shadow-sm">
        <img src="/images/LogoBlue_.png" alt="Stanbic IBTC" className="mx-auto mb-6 h-9 object-contain" />
        <h1 className="text-xl font-semibold">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
        <p className="mt-3 text-sm leading-6 text-[#58708f]">
          {notFound
            ? 'The link may be out of date, or the page may have moved.'
            : 'The page could not be displayed. Our team has been notified. Please try again.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
          <Link to="/" className="min-h-10 rounded-md bg-[#0450ff] px-4 py-2.5 font-medium text-white hover:bg-[#003bd0]">Marketplace home</Link>
          <Link to="/bank/connected-apps" className="min-h-10 rounded-md border border-[#e1e6ee] px-4 py-2.5 hover:bg-[#f7f9fc]">Internet Banking</Link>
        </div>
      </div>
    </div>
  )
}
