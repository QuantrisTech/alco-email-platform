import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

export function PerformanceChart({ data = [] }) {
  // If backend hasn't loaded any points yet, show an empty state or basic baseline
  const chartData = data.length > 0 && data[0].name !== "No Data" 
    ? data 
    : [{ name: "No Data", sent: 0, opened: 0 }]

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary, #0f172a)" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="var(--primary, #0f172a)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent, #f59e0b)" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="var(--accent, #f59e0b)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, #e2e8f0)" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "var(--muted-foreground, #64748b)", fontSize: 12 }} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "var(--muted-foreground, #64748b)", fontSize: 12 }} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "var(--card, #fff)", 
              borderColor: "var(--border, #e2e8f0)",
              borderRadius: "8px" 
            }} 
          />
          <Area 
            type="monotone" 
            dataKey="sent" 
            stroke="var(--primary, #0f172a)" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorSent)" 
          />
          <Area 
            type="monotone" 
            dataKey="opened" 
            stroke="var(--accent, #f59e0b)" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorOpened)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}