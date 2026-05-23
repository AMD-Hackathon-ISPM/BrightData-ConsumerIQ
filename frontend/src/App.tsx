import { ConsumerIQExperience } from '@/consumer-iq-app'
import { AuthGate } from '@/features/auth/AuthGate'
import { useAuth } from '@/lib/auth'

function App() {
  const { user } = useAuth()
  return user ? <ConsumerIQExperience /> : <AuthGate />
}

export default App
