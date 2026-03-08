import { useState, useCallback, useRef } from 'react'

/**
 * Hook for copy-to-clipboard with auto-reset feedback.
 * Returns the currently-copied value (or null) and a copy function.
 *
 * Usage:
 *   const [copiedId, copyId] = useCopyToClipboard()
 *   <button onClick={(e) => copyId(e, someId)}>
 *     {copiedId === someId ? <Check /> : <Copy />}
 *   </button>
 */
export function useCopyToClipboard(resetMs = 1500) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const copyId = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      navigator.clipboard.writeText(id).then(() => {
        setCopiedId(id)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setCopiedId(null), resetMs)
      })
    },
    [resetMs],
  )

  return [copiedId, copyId] as const
}
