import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LabelList
} from 'recharts';
import { Filter, Calendar, Download } from 'lucide-react';

const FunnelsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch from /api/funnels
    setTimeout(() => {
      setData({
        onboarding: [
          { label: 'App Opened', count: 12500 },
          { label: 'Signup Started', count: 8400 },
          { label: 'Signup Completed', count: 6200 },
          { label: 'Profile Finished', count: 4800 },
          { label: 'Verified', count: 3100 }
        ],
        marketplace: [
          { label: 'Search', count: 15200 },
          { label: 'View Listing', count: 9800 },
          { label: 'Send Interest', count: 4200 },
          { label: 'Message', count: 2100 },
          { label: 'Accepted', count: 850 }
        ]
      });
      setLoading(false);
    }, 800);
  }, []);

  const renderFunnelChart = (funnelData, title, color) => {
    const chartData = funnelData.map((item, index) => ({
      ...item,
      percentage: index === 0 ? 100 : Math.round((item.count / funnelData[0].count) * 100),
      dropoff: index === 0 ? 0 : Math.round((1 - item.count / funnelData[index-1].count) * 100)
    }));

    return (
      <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '1rem' }}>{title}</h3>
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 5, right: 80, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="label" 
                type="category" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                width={120}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} barSize={32}>
                <LabelList 
                  dataKey="percentage" 
                  position="right" 
                  formatter={(v) => `${v}%`}
                  style={{ fill: 'var(--text-main)', fontSize: 12, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading funnels...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Monitor user journey conversion and drop-offs</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
            <Calendar size={16} /> Last 30 Days
          </button>
          <button className="card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
            <Filter size={16} /> All Channels
          </button>
          <button className="card" style={{ padding: '8px 16px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {renderFunnelChart(data.onboarding, 'Onboarding Funnel (Conversion)', '#0ea5e9')}
        {renderFunnelChart(data.marketplace, 'Marketplace Funnel (Seeker Journey)', '#10b981')}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '1rem' }}>Step-by-Step Conversion Analysis</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Step Name</th>
              <th>Users</th>
              <th>Conversion Rate</th>
              <th>Drop-off Rate</th>
              <th>Avg. Time to Complete</th>
            </tr>
          </thead>
          <tbody>
            {[...data.onboarding].map((step, i) => {
              const conv = i === 0 ? 100 : Math.round((step.count / data.onboarding[i-1].count) * 100);
              return (
                <tr key={step.label}>
                  <td className="font-semibold">{step.label}</td>
                  <td>{step.count.toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${conv}%`, height: '100%', backgroundColor: '#0ea5e9' }}></div>
                      </div>
                      {conv}%
                    </div>
                  </td>
                  <td style={{ color: 'var(--danger)' }}>{i === 0 ? '-' : `${100 - conv}%`}</td>
                  <td>{i === 0 ? '-' : `${(i * 1.2).toFixed(1)}m`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FunnelsPage;
