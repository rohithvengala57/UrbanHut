import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  MessageSquare, 
  Heart, 
  TrendingUp, 
  Search, 
  ShieldCheck, 
  Activity,
  Briefcase,
  Settings,
  HelpCircle
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { section: 'MAIN', items: [
      { name: 'Overview', path: '/', icon: LayoutDashboard },
      { name: 'Users', path: '/users', icon: Users },
      { name: 'Listings', path: '/listings', icon: Home },
      { name: 'Interests', path: '/interests', icon: Heart },
      { name: 'Messages', path: '/messages', icon: MessageSquare },
    ]},
    { section: 'ANALYTICS', items: [
      { name: 'Growth & Retention', path: '/retention', icon: TrendingUp },
      { name: 'Marketplace Funnels', path: '/funnels', icon: Activity },
      { name: 'Search Analytics', path: '/search', icon: Search },
    ]},
    { section: 'SYSTEM', items: [
      { name: 'Trust & Safety', path: '/trust', icon: ShieldCheck },
      { name: 'Services', path: '/services', icon: Briefcase },
      { name: 'Settings', path: '/settings', icon: Settings },
    ]}
  ];

  return (
    <aside className="sidebar">
      <div style={{ padding: '24px', borderBottom: '1px solid #334155' }}>
        <h2 style={{ color: '#fff', fontSize: '1.25rem' }}>UrbanHut Admin</h2>
      </div>
      <nav style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
        {navItems.map((section) => (
          <div key={section.section} style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', paddingLeft: '12px' }}>
              {section.section}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive ? '#fff' : '#94a3b8',
                  backgroundColor: isActive ? '#334155' : 'transparent',
                  marginBottom: '4px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                })}
              >
                <item.icon size={18} />
                {item.name}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div style={{ padding: '16px', borderTop: '1px solid #334155' }}>
        <button style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          width: '100%', 
          background: 'none', 
          border: 'none', 
          color: '#94a3b8', 
          cursor: 'pointer',
          padding: '8px 12px'
        }}>
          <HelpCircle size={18} />
          Support
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
