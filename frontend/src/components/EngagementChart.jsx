import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

const COLORS = ["var(--accent, #f59e0b)", "var(--success, #10b981)", "var(--border, #e2e8f0)"]

export function EngagementChart({ data = [], total = 0 }) {
  // If data counts are completely zero, display a neutral gray ring placeholder
  const isZero = total === 0
  const chartData = isZero 
    ? [{ name: "No Activity", value: 1 }] 
    : data

  return (
    <div className="relative flex h-[200px] w-full items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={isZero ? 0 : 4}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={isZero ? "var(--muted, #f1f5f9)" : COLORS[index % COLORS.length]} 
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Central absolute stat label */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="font-display text-2xl font-bold text-foreground">
          {total.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">recipients</span>
      </div>
    </div>
  )
}