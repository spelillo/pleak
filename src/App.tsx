function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-canvas px-6 text-center">
      <img
        src={`${import.meta.env.BASE_URL}pleak-glyph.png`}
        alt="Pleak"
        className="h-20 w-auto"
      />
      <h1 className="display-lg text-ink">PLEAK</h1>
      <p className="max-w-xs text-body text-base">
        Your workouts, tracked simply.
      </p>
      <span className="rounded-pill bg-surface-card px-3 py-1 text-xs font-medium text-muted">
        Brand shell &middot; Phase 1
      </span>
    </div>
  )
}

export default App
