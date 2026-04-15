import type { RadarChartData } from '@/types';
import {
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart as RechartsRadarChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

interface RadarChartProps {
  data: RadarChartData[]
  className?: string
}

const COLORS = {
  fill: 'rgba(102, 126, 234, 0.3)',
  stroke: '#667eea',
}

export function RadarChart({ data, className }: RadarChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="90%" data={data}>
          <PolarGrid 
            stroke="hsl(var(--border))" 
            strokeDasharray="3 3"
          />
          <PolarAngleAxis 
            dataKey="name" 
            tick={{ 
              fill: 'hsl(var(--foreground))', 
              fontSize: 18,
              fontWeight: 500,
            }}
            tickLine={false}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Radar
            name="智能得分"
            dataKey="value"
            stroke={COLORS.stroke}
            fill={COLORS.fill}
            fillOpacity={0.6}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{
              color: 'hsl(var(--foreground))',
              fontWeight: 600,
            }}
            itemStyle={{
              color: 'hsl(var(--foreground))',
            }}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  )
}
