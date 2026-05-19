import { useCallback } from 'react'
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion'

interface SuggestionListProps {
  disabled: boolean
  onSuggestionClick: (suggestion: string) => void
  suggestions: string[]
}

function SuggestionItem({
  disabled,
  onClick,
  suggestion,
}: {
  disabled: boolean
  onClick: (suggestion: string) => void
  suggestion: string
}) {
  const handleClick = useCallback(() => {
    onClick(suggestion)
  }, [onClick, suggestion])

  return (
    <Suggestion
      disabled={disabled}
      onClick={handleClick}
      suggestion={suggestion}
    />
  )
}

export function SuggestionList({
  disabled,
  onSuggestionClick,
  suggestions,
}: SuggestionListProps) {
  return (
    <Suggestions className="px-4">
      {suggestions.map((suggestion) => (
        <SuggestionItem
          disabled={disabled}
          key={suggestion}
          onClick={onSuggestionClick}
          suggestion={suggestion}
        />
      ))}
    </Suggestions>
  )
}
