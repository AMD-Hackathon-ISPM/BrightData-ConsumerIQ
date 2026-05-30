import { ConsumerIQExperience } from '@/consumer-iq-app'
import { AuthGate } from '@/features/auth/AuthGate'
import { useAuth } from '@/lib/auth'
import { useEffect, useState } from 'react'

type SessionResponse = {
  email: string
  user_id: number
}

function App() {
  const { user, loginWithToken } = useAuth()
  const [restoringSession, setRestoringSession] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).has('session')
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const token = url.searchParams.get('session')
    if (!token) {
      setRestoringSession(false)
      return
    }

    let cancelled = false
    fetch('/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('session restore failed')
        return response.json() as Promise<SessionResponse>
      })
      .then((session) => {
        if (cancelled) return
        const email = session.email.trim().toLowerCase()
        loginWithToken(
          { fullName: email.split('@')[0] || 'User', email },
          token,
        )
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return
        url.searchParams.delete('session')
        url.searchParams.delete('formId')
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
        setRestoringSession(false)
      })

    return () => {
      cancelled = true
    }
  }, [loginWithToken])

  if (restoringSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-background-default text-sm text-foreground-light">
        Opening your dashboard...
      </main>
    )
  }

  return user ? <ConsumerIQExperience /> : <AuthGate />
}

export default App
