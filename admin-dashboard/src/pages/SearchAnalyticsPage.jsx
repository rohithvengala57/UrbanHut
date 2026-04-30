import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Search, Map, Sliders, ArrowUpRight } from 'lucide-react';
import MetricCard from '../components/MetricCard';

const SearchAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch from /api/search-analytics
    setTimeout(() => {
      setData({
        metrics: {
          total_searches: 85400,
          unique_searchers: 22100,
          avg_filters_used: 3.4,
          no_results_rate: 4.2
        },
        top_cities: [
          { city: 'New York', count: 12400 },
          { city: 'London', count: 9800 },
          { city: 'San Francisco', count: 7200 },
          { city: 'Berlin', count: 5400 },
          { city: 'Paris', count: 4200 },
          { city: 'Toronto', count: 3800 },
          { city: 'Sydney', count: 3100 }
        ],
        filter_usage: [
          { name: 'Price Range', value: 45 },
          { name: 'Room Type', value: 25 },
          { name: 'Pets Allowed', value: 15 },
          { name: 'Amenities', value: 15 }
        ],
        recent_queries: [
          { query: 'Studio in Brooklyn', count: 120, trend: 'up' },
          { query: 'Shared house London', count: 95, trend: 'up' },
          { query: 'Pet friendly SF', count: 88, trend: 'stable' },
          { query: 'Berlin Mitte room', count: 74, trend: 'down' },
          { query: 'Ensuite NYC', count: 62, trend: 'up' }
        ]
      });
      setLoading(false);
    }, 800);
  }, []);

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'];

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading search analytics...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="grid grid-cols-4 gap-6">
        <MetricCard title="Total Searches" value={data.metrics.total_searches.toLocaleString()} trend="up" trendValue={12.4} icon={Search} color="#0ea5e9" />
        <MetricCard title="Unique Searchers" value={data.metrics.unique_searchers.toLocaleString()} trend="up" trendValue={8.2} icon={Map} color="#10b981" />
        <MetricCard title="Avg Filters Used" value={data.metrics.avg_filters_used} trend="up" trendValue={0.5} icon={Sliders} color="#f59e0b" />
        <MetricCard title="No Results Rate" value={`${data.metrics.no_results_rate}%`} trend="down" trendValue={1.1} icon={ArrowUpRight} color="#ef4444" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card" style={{ height: '400px' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '1rem' }}>Top Searched Cities</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.top_cities} layout="vertical" margin={{ left: 20, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
              <XAxis type="number" hide />
              <YAxis dataKey="city" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={100} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '1rem' }}>Filter Usage Distribution</h3>
          <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.filter_usage}
                  cx="50%"
                  cy="45%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.filter_usage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '1rem' }}>Trending Search Queries</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Query</th>
              <th>Volume (Last 24h)</th>
              <th>Trend</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_queries.map((q) => (
              <tr key={q.query}>
                <td className="font-semibold">{q.query}</td>
                <td>{q.count} searches</td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    backgroundColor: q.trend === 'up' ? '#ecfdf5' : q.trend === 'down' ? '#fef2f2' : '#f8fafc',
                    color: q.trend === 'up' ? '#10b981' : q.trend === 'down' ? '#ef4444' : '#64748b'
                  }}>
                    {q.trend.toUpperCase()}
                  </span>
                </td>
                <td>
                  <button style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                    View Results
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SearchAnalyticsPage;
