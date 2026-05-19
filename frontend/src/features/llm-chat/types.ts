export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error'

export interface MessageType {
  key: string
  from: 'user' | 'assistant'
  sources?: { href: string; title: string }[]
  versions: {
    id: string
    content: string
  }[]
  reasoning?: {
    content: string
    duration: number
  }
}
