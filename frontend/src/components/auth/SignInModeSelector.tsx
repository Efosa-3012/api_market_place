export type SignInMode = 'developer' | 'admin'
export default function SignInModeSelector({
  value,
  onChange,
}: {
  value: SignInMode
  onChange: (mode: SignInMode) => void
}) {
  return (
    <fieldset className="mb-5">
      <legend className="mb-2 text-xs font-medium text-body">
        Sign in as
      </legend>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1">
        {(['developer', 'admin'] as const).map((mode) => (
          <label
            key={mode}
            className={`relative cursor-pointer rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600 ${value === mode ? 'bg-white text-primary shadow-sm' : 'text-muted'}`}
          >
            <input
              className="sr-only"
              type="radio"
              name="sign-in-mode"
              value={mode}
              checked={value === mode}
              onChange={() => onChange(mode)}
            />
            {mode === 'developer' ? 'Developer' : 'Admin'}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
