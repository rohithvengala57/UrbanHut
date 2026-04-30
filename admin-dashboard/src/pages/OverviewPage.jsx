import React from 'react';
import { 
  Users, 
  Home, 
  Heart, 
  MessageSquare, 
  TrendingUp, 
  Activity, 
  Search 
} from 'lucide-react';
import MetricCard from '../components/MetricCard';

const OverviewPage = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="grid grid-cols-4 gap-6">
        <MetricCard title="New Users Today" value="248" trend="up" trendValue={12} icon={Users} color="#0ea5e9" />
        <MetricCard title="Active Listings" value="1,240" trend="up" trendValue={5} icon={Home} color="#10b981" />
        <MetricCard title="Interests Sent" value="850" trend="up" trendValue={8} icon={Heart} color="#f59e0b" />
        <MetricCard title="Messages Sent" value="3,200" trend="up" trendValue={15} icon={MessageSquare} color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card" style={{ height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
          <TrendingUp size={48} color="#0ea5e9" />
          <h3 style={{ color: 'var(--text-secondary)' }}>User Growth Chart Placeholder</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Phase 1 Implementation</p>
        </div>
        <div className="card" style={{ height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
          <Activity size={48} color="#10b981" />
          <h3 style={{ color: 'var(--text-secondary)' }}>Feature Usage Chart Placeholder</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Phase 1 Implementation</p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '1rem' }}>Recent Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: i % 2 === 0 ? 'var(--primary)' : 'var(--accent)' }}></div>
              <p style={{ fontSize: '0.875rem', flex: 1 }}>
                <span className="font-semibold">User #{1000 + i}</span> {i % 2 === 0 ? 'published a new listing in' : 'expressed interest in a listing in'} <span className="font-semibold">{['New York', 'London', 'Berlin'][i % 3]}</span>
              </p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{i * 2} mins ago</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
