import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchIcon } from '../../components/Navbar'

const features = [
  { label: 'SECURE APIS', title: 'Security built into every integration', description: 'Control access with authentication, authorization, consent, and secure API connections.' },
  { label: 'REAL-TIME DATA', title: 'Access the information you need', description: 'Build experiences using account, transaction, identity, and other banking data through APIs.' },
  { label: 'DEVELOPER-FIRST', title: 'Built for developers', description: 'Clear documentation, easy API discovery, sandbox testing, credentials, and tools to get started faster.' },
  { label: 'SANDBOX TESTING', title: 'Build without the risk', description: 'Test your integrations using a safe sandbox environment before moving to production.' },
  { label: 'SCALABLE INFRASTRUCTURE', title: 'Designed to grow with you', description: 'Create integrations that can support growing users, transactions, and business needs.' },
  { label: 'DEDICATED SUPPORT', title: "We're here when you need us", description: 'Get guidance and support throughout your integration journey.' },
]
const categories = [
  { id: 'accounts-api', category: 'Accounts', title: 'Accounts API', description: 'List the accounts a customer has chosen to share — type, currency, status and a masked number.' },
  { id: 'balances-api', category: 'Balances', title: 'Balances API', description: 'Available and ledger balances for a consented account, with an as-of timestamp.' },
  { id: 'transactions-api', category: 'Transactions', title: 'Transactions API', description: 'Paginated, filterable transaction history for budgeting, reconciliation and lending.' },
  { id: 'consent-api', category: 'Consent', title: 'Consent & Authorization', description: 'OAuth 2.0 flow that lets customers grant, scope and revoke access — without ever sharing a password.' },
]

export default function LandingPage() {
  const [query, setQuery] = useState('')
  const filtered = categories.filter(item => `${item.category} ${item.title} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <>
    <section className="landing-hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">Build the next big<br className="hero-break" /> thing with<br /><span>banking APIs</span></h1>
        <p>Secure, reliable access to Stanbic IBTC’s banking services. Discover, test, and integrate APIs built to help you create innovative financial solutions for individuals and businesses.</p>
        <div className="hero-actions"><Link className="landing-button" to="/signup">Get Started</Link><a className="landing-button secondary" href="#apis">Explore APIs</a></div>
        <ul className="trust-list">{['Secure & Compliant', 'Developer support', 'Sandbox Environment'].map(item => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>
      </div>
      <div className="hero-placeholder">
        <img
          src="/images/Landing.png"
          alt="Banking API platform illustration"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
      </div>
    </section>
    <section className="landing-features" id="features" aria-labelledby="features-title">
      <div className="section-intro"><h2 id="features-title">Everything you need to<br /> build, test, and scale</h2><p>Connect to banking capabilities through a secure, developer-first platform designed for innovation.</p></div>
      <div className="feature-grid">{features.map((feature, index) => <article key={feature.label} id={index === 5 ? 'support' : undefined} className={`feature-card ${index % 2 ? 'blue-card' : ''}`}>
        <span className="feature-icon" aria-hidden="true">{index % 2 ? '◇' : '⌁'}</span><p className="feature-label">{feature.label}</p><h3>{feature.title}</h3><p>{feature.description}</p>
      </article>)}</div>
    </section>
    <section className="landing-apis" id="apis" aria-labelledby="apis-title">
      <div className="api-intro"><p className="eyebrow">EXPLORE OUR APIS</p><h2 id="apis-title">Banking building blocks<br /> for your business</h2><p>Discover the APIs you need to create connected financial experiences.</p></div>
      <form className="api-search" role="search" onSubmit={event => { event.preventDefault(); document.getElementById('api-results')?.focus() }}>
        <label className="sr-only" htmlFor="api-query">Search API categories</label><input id="api-query" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="What are you searching for?" /><button type="submit" aria-label="Search APIs"><SearchIcon /></button>
      </form>
      <p className="sr-only" role="status">{filtered.length} API categories found</p>
      <div className="api-grid" id="api-results" tabIndex={-1}>{filtered.map(item => <article className="api-card" key={item.category}>
        <div className="api-card-top"><span className="category-label">{item.category}</span><span className="category-icon" aria-hidden="true">◎</span></div>
        <h3>{item.title}</h3><span className="red-rule" aria-hidden="true" /><p>{item.description}</p>
        <Link className="landing-button explore-button" to={`/app/marketplace/${item.id}`} aria-label={`Explore ${item.title}`}>EXPLORE API <span aria-hidden="true">→</span></Link>
      </article>)}</div>
      {!filtered.length && <div className="empty-results"><p>No API categories match “{query}”. Try accounts, balances, transactions or consent.</p><button className="landing-button" onClick={() => setQuery('')}>Clear search</button></div>}
    </section>
  </>
}
