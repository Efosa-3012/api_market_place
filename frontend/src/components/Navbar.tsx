import { useState } from 'react'
import { Link } from 'react-router-dom'


const navigation = [
    ['APIs', '/#apis'], ['Solutions', '/#features'],
    ['Developers', '/app/developer-portal'], ['Pricing', '/app/marketplace'],
    ['Resources', '/app/developer-portal'], ['Support', '/#support'],
]

export default function Navbar() {
    const [open, setOpen] = useState(false)
    return (
        <header className="public-header">
            <a className="skip-link" href="#main-content">Skip to content</a>
            <div className="public-nav">
                <Link className="brand" to="/" aria-label="Stanbic IBTC home" onClick={() => setOpen(false)}>
                    <img
                        src="/images/LogoWhite.png"
                        alt="Stanbic IBTC"
                        className="h-10 w-70 object-contain"
                    />
                </Link>
                <nav className="desktop-links" aria-label="Main navigation">
                    {navigation.map(([label, to]) => <a key={label} href={to}>{label}</a>)}
                </nav>
                <div className="nav-actions">
                    <a className="nav-search" href="/#apis" aria-label="Search APIs"><SearchIcon /></a>
                    <Link className="sign-in" to="/login" onClick={() => setOpen(false)}>Sign In</Link>
                    <Link className="landing-button nav-start" to="/signup" onClick={() => setOpen(false)}>Get Started</Link>
                    <button className="menu-toggle" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button>
                </div>
            </div>
            {open && <nav className="mobile-links" id="mobile-navigation" aria-label="Mobile navigation" onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); document.querySelector<HTMLButtonElement>('.menu-toggle')?.focus() } }}>
                {navigation.map(([label, to]) => <a key={label} href={to} onClick={() => setOpen(false)}>{label}</a>)}
            </nav>}
        </header>
    )
}

export function SearchIcon() {
    return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10.5" cy="10.5" r="7.5" /><path d="m16 16 6 6" /></svg>
}
