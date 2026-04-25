'use client'

export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main>Something went wrong.{error.digest ? ` Ref: ${error.digest}` : null}</main>
}
