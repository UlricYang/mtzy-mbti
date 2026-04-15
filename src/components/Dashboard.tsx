import type { TestData } from '@/types'
import { MBTISection } from './sections/MBTISection'
import { IntelligencesSection } from './sections/IntelligencesSection'
import { ValuesSection } from './sections/ValuesSection'

interface DashboardProps {
  data: TestData
}

export function Dashboard({ data }: DashboardProps) {
  return (
    <main className="min-h-screen bg-background">
      <MBTISection data={data} />
      <IntelligencesSection data={data} />
      <ValuesSection data={data} />
      
      <footer className="py-8 px-4 border-t bg-muted/10">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>
            生成时间: {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </footer>
    </main>
  )
}
