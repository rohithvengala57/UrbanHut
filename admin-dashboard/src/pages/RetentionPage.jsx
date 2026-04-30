import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Users, MousePointer2, Clock, Calendar } from 'lucide-react';
import MetricCard from '../components/MetricCard';

const RetentionPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch from /api/retention
    setTimeout(() => {
      setData({
        metrics: {
          d1: 45.2,
          d7: 22.8,
          d30: 12.5,
          stickiness: 18.4
        },
        cohorts: [
          { cohort: 'Apr 01', size: 1200, retention: [100, 45, 32, 28, 22, 18, 15, 12] },
          { cohort: 'Apr 08', size: 1450, retention: [100, 48, 35, 30, 24, 20, 17] },
          { cohort: 'Apr 15', size: 1100, retention: [100, 42, 30, 25, 21, 16] },
          { cohort: 'Apr 22', size: 1600, retention: [100, 50, 38, 33, 28] },
          { cohort: 'Apr 29', size: 1300, retention: [100, 46, 34, 29] },
          { cohort: 'May 06', size: 1550, retention: [100, 49, 36] },
          { cohort: 'May 13', size: 1400, retention: [100, 47] }
        ],
        trends: [
          { name: 'Week 1', d1: 42, d7: 18 },
          { name: 'Week 2', d1: 45, d7: 20 },
          { name: 'Week 3', d1: 48, d7: 22 },
          { name: 'Week 4', d1: 46, d7: 21 },
          { name: 'Week 5', d1: 50, d7: 24 },
          { name: 'Week 6', d1: 52, d7: 25 },
        ]
      });
      setLoading(false);
    }, 800);
  }, []);

  const getDensityClass = (value) => {
    if (value >= 80) return 'density-5';
    if (value >= 60) return 'density-4';
    if (value >= 40) return 'density-3';
    if (value >= 20) return 'density-2';
    if (value >= 5) return 'density-1';
    return 'density-0';
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading retention data...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="grid grid-cols-4 gap-6">
        <MetricCard title="Day 1 Retention" value={`${data.metrics.d1}%`} trend="up" trendValue={2.4} icon={MousePointer2} color="#0ea5e9" />
        <MetricCard title="Day 7 Retention" value={`${data.metrics.d7}%`} trend="up" trendValue={1.8} icon={Clock} color="#10b981" />
        <MetricCard title="Day 30 Retention" value={`${data.metrics.d30}%`} trend="down" trendValue={0.5} icon={Calendar} color="#f59e0b" />
        <MetricCard title="Stickiness (DAU/MAU)" value={`${data.metrics.stickiness}%`} trend="up" trendValue={3.1} icon={Users} color="#8b5cf6" />
      </div>

      <div className="card" style={{ height: '350px' }}>
        <h3 style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '1rem' }}>Retention Trends (D1 vs D7)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.trends}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} unit="%" />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
            <Line type="monotone" dataKey="d1" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9' }} activeDot={{ r: 6 }} name="Day 1" />
            <Line type="monotone" dataKey="d7" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} name="Day 7" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <h3 style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '1rem' }}>Cohort Retention Analysis (Weekly)</h3>
        <table className="data-table" style={{ textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Cohort</th>
              <th>Size</th>
              {Array.from({ length: 8 }).map((_, i) => (
                <th key={i}>W{i}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.cohorts.map((row) => (
              <tr key={row.cohort}>
                <td style={{ textAlign: 'left', fontWeight: 600 }}>{row.cohort}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{row.size.toLocaleString()}</td>
                {Array.from({ length: 8 }).map((_, i) => {
                  const val = row.retention[i];
                  return (
                    <td 
                      key={i} 
                      className={val !== undefined ? getDensityClass(val) : ''}
                      style={{ 
                        fontWeight: 500,
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      {val !== undefined ? `${val}%` : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RetentionPage;
