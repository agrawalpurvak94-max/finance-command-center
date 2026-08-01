import { PageContainer } from '@/layouts/PageContainer'

interface ModulePlaceholderProps {
  title: string
  status: string
}

export function ModulePlaceholder({ title, status }: ModulePlaceholderProps) {
  return (
    <PageContainer className="flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-headline-lg font-semibold text-foreground">{title}</h1>
        <p className="mt-sm text-body-md text-muted-foreground">{status}</p>
      </div>
    </PageContainer>
  )
}
