import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
}

export default function SignupLayout({ children }: Props) {
  return (
    <div className="min-h-dvh bg-white font-[Arial,Helvetica,sans-serif] text-[#151c2d]">
      <div className="mx-auto grid min-h-dvh max-w-[1600px] lg:grid-cols-[52%_48%]">
        <div className="px-6 py-5 sm:px-10 lg:py-6 lg:pl-[15%] lg:pr-10">
          <div className="mx-auto w-full max-w-[380px] lg:mx-0">
            <Link
              to="/"
              aria-label="Stanbic IBTC home"
              className="mb-5 inline-flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
            >
             <img
                        src="/images/LogoBlue_.png"
                        alt="Stanbic IBTC"
                        className="h-10 w-70 object-contain"
                    />
            </Link>

            {children}
          </div>
        </div>

        <aside className="hidden min-h-0 pb-0 pr-4 pt-4 lg:block">
  <div className="relative h-full overflow-hidden rounded-t-2xl">
    <img
      src="/images/Sign in.png"
      alt=""
      className="absolute inset-0 h-full w-full object-cover"
    />
  </div>
</aside>
      </div>
    </div>
  )
}