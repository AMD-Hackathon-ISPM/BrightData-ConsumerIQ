import { mockResponses } from '../data/chat-content'

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })

const getDeterministicIndex = (value: string) =>
  [...value].reduce((total, character) => total + character.charCodeAt(0), 0) %
  mockResponses.length

export const buildMockResponse = (prompt: string) =>
  mockResponses[getDeterministicIndex(prompt)]
