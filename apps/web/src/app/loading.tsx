import { Skeleton } from '@/components/skeleton'

export default function Loading() {
  return (
    <main className="min-h-dvh px-5 py-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </main>
  )
}
