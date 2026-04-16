import { useState, useEffect } from 'react'
import { BlurFade } from '@/components/ui/blur-fade'
import { SectionTitle } from '@/components/ui/section-title'
import { HeroSection } from '@/components/modules/HeroSection'
import { CognitiveFunctionStack } from '@/components/modules/CognitiveFunctionStack'
import { MBTITypeComparison } from '@/components/modules/MBTITypeComparison'
import { MBTIInsightsCard } from '@/components/modules/MBTIInsightsCard'
import { MBTIPersonalityDetail } from '@/components/modules/MBTIPersonalityDetail'
import { getMBTITypeData, getMBTITypeName, loadFunctionStacks, getFunctionStack, loadMBTITypeVariants, loadMBTIPersonalityData, loadMBTIDistribution, getMBTIDistribution, loadCelebritiesOccupation } from '@/lib/data-loader'
import type { TestData, FunctionStacksData, MBTITypeDetail, MBTIPersonalityData, MBTIDistributionData } from '@/types'
import type { CelebritiesOccupation } from '@/lib/data-loader'
import { Eye } from 'lucide-react'

interface MBTISectionProps {
  data: TestData
}

export function MBTISection({ data }: MBTISectionProps) {
  const [functionStacksData, setFunctionStacksData] = useState<FunctionStacksData | null>(null)
  const [typeVariants, setTypeVariants] = useState<{ typeA: MBTITypeDetail | null; typeT: MBTITypeDetail | null } | null>(null)
  const [personalityData, setPersonalityData] = useState<MBTIPersonalityData | null>(null)
  const [distributionData, setDistributionData] = useState<MBTIDistributionData | null>(null)
  const [celebritiesOccupation, setCelebritiesOccupation] = useState<CelebritiesOccupation | null>(null)
  
  const typeName = getMBTITypeName(data)
  const typeData = getMBTITypeData(data)

  useEffect(() => {
    loadFunctionStacks()
      .then(setFunctionStacksData)
      .catch(console.error)
    
    loadMBTITypeVariants(typeName)
      .then(setTypeVariants)
      .catch(console.error)
    
    loadMBTIPersonalityData(typeName)
      .then(setPersonalityData)
      .catch(console.error)
    
    loadMBTIDistribution()
      .then(setDistributionData)
      .catch(console.error)
    
    loadCelebritiesOccupation()
      .then(setCelebritiesOccupation)
      .catch(console.error)
  }, [typeName])

  if (!typeData) return null

  const functionStack = functionStacksData ? getFunctionStack(functionStacksData, typeName) : null
  const showComparison = typeVariants?.typeA && typeVariants?.typeT
  const distribution = distributionData ? getMBTIDistribution(distributionData, typeName) : null

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-6xl mx-auto space-y-8">
        <SectionTitle
          title="MBTI 人格分析"
          subtitle={`深入了解您的 ${typeName} 人格特质`}
          icon={<Eye className="w-5 h-5" />}
          gradient="from-indigo-500 to-purple-500"
        />

        <BlurFade delay={0.1}>
          <HeroSection data={data} distributionPercentage={distribution?.total} />
        </BlurFade>

        {functionStacksData && functionStack && (
          <BlurFade delay={0.15}>
            <CognitiveFunctionStack 
              functionStack={functionStack}
              functionStacksData={functionStacksData}
            />
          </BlurFade>
        )}

        {personalityData && (
          <BlurFade delay={0.18}>
            <MBTIPersonalityDetail data={personalityData} celebritiesOccupation={celebritiesOccupation} />
          </BlurFade>
        )}

        {showComparison && (
          <BlurFade delay={0.2}>
            <MBTITypeComparison 
              typeA={typeVariants!.typeA!}
              typeT={typeVariants!.typeT!}
              distributionA={distribution?.typeA}
              distributionT={distribution?.typeT}
            />
          </BlurFade>
        )}

        <BlurFade delay={0.1}>
          <MBTIInsightsCard typeData={typeData} />
        </BlurFade>
      </div>
    </section>
  )
}
