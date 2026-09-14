const links = ['Security Centre', 'Regulatory', 'Legal', 'Manage Cookies', 'Terms & Conditions', 'Complaints Process']

export default function Footer() {
  return <footer className="public-footer" aria-label="Policies">
    {links.map(label => <span key={label} aria-disabled="true" title="Page awaiting content">{label}</span>)}
  </footer>
}
