import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MetricCard = ({ title, value, trend, trendValue, icon: Icon, color }) => {
  const isPositive = trend === 'up';
  
  return (
    <div className="card metric-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="metric-label">{title}</span>
        <div style={{ 
          padding: '8px', 
          borderRadius: '8px', 
          backgroundColor: `${color}15`, 
          color: color 
        }}>
          <Icon size={20} />
        </div>
      </div>
      
      <div className="metric-value">{value}</div>
      
      <div className={`trend ${isPositive ? 'trend-up' : 'trend-down'}`}>
        {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        <span className="font-medium">{trendValue}%</span>
        <span style={{ color: '#94a3b8' }}>vs last month</span>
      </div>
    </div>
  );
};

export default MetricCard;
