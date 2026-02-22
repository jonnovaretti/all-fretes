import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function HomePage() {
  const [status, setStatus] = useState('Checking API...')

  useEffect(() => {
    api
      .get('/')
      .then(() => setStatus('API is reachable.'))
      .catch(() => setStatus('API not reachable right now.'))
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-slate-100">
      <section className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-800/70 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold">Welcome to All Fretes Web</h1>
        <p className="mt-4 text-slate-300">
          Your React + TypeScript + Tailwind frontend is ready with routing and API integration.
        </p>
        <p className="mt-6 rounded-lg bg-slate-900 px-4 py-3 text-sm text-sky-300">{status}</p>
      </section>
    </main>
  )
}
