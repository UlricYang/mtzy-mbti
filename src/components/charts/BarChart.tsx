import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { BarChartData } from '@/types'

interface BarChartProps {
  data: BarChartData[]
  className?: string
}

export function BarChart({ data, className }: BarChartProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart 
          data={data} 
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))"
            horizontal={true}
            vertical={false}
          />
          <XAxis 
            type="number" 
            domain={[0, 'dataMax + 10']}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis 
            type="category" 
            dataKey="name"
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            width={75}
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
            formatter={(value) => [`${value}分`, '得分']}
          />
          <Bar 
            dataKey="value" 
            radius={[0, 4, 4, 0]}
            maxBarSize={35}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill || '#667eea'} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
