import React from 'react';
import { Bell, Search, User as UserIcon, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Topbar = () => {
  const location = useLocation();
  
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview';
    if (path === '/retention') return 'Growth & Retention';
    if (path === '/funnels') return 'Marketplace Funnels';
    if (path === '/search') return 'Search Analytics';
    return path.substring(1).charAt(0).toUpperCase() + path.slice(2);
  };

  return (
    <header className="topbar">
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{getPageTitle()}</h1>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search..." 
            style={{ 
              padding: '8px 12px 8px 36px', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0',
              fontSize: '0.875rem',
              width: '240px',
              backgroundColor: '#f8fafc'
            }} 
          />
        </div>
        
        <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', position: 'relative' }}>
          <Bell size={20} />
          <span style={{ 
            position: 'absolute', 
            top: '-2px', 
            right: '-2px', 
            width: '8px', 
            height: '8px', 
            backgroundColor: '#ef4444', 
            borderRadius: '50%',
            border: '2px solid #fff'
          }}></span>
        </button>
        
        <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <UserIcon size={18} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Admin User</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Administrator</p>
          </div>
          <ChevronDown size={14} style={{ color: '#64748b' }} />
        </div>
      </div>
    </header>
  );
};

export default Topbar;
