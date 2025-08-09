
"use client"

import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

interface ChartProps {
  type: 'timeline' | 'performance' | 'roles'
  data: any[]
}

export default function AdminReportsCharts({ type, data }: ChartProps) {
  if (type === 'timeline') {
    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="scripts" stroke="#60B5FF" strokeWidth={2} name="Scripts" />
            <Line type="monotone" dataKey="assignments" stroke="#FF9149" strokeWidth={2} name="Assignments" />
            <Line type="monotone" dataKey="feedback" stroke="#72BF78" strokeWidth={2} name="Feedback" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === 'performance') {
    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10 }} 
              angle={-45} 
              textAnchor="end" 
              height={60} 
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="scriptsSubmitted" fill="#60B5FF" name="Scripts" />
            <Bar dataKey="tasksCompleted" fill="#FF9149" name="Tasks" />
            <Bar dataKey="feedbackGiven" fill="#72BF78" name="Feedback" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (type === 'roles') {
    return (
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              label={({ name, value }: any) => `${name}: ${value}`}
            >
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return <div>Chart type not supported</div>
}
