import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Feather } from 'lucide-react';

const links = [
  { name: 'Overview', path: '/', icon: 'bar-chart-2' },
  { name: 'Analytics', path: '/analytics', icon: 'trending-up' },
  { name: 'Community', path: '/community', icon: 'users' },
  { name: 'Services', path: '/services', icon: 'tool' },
  { name: 'Investor', path: '/investor', icon: 'briefcase' },
  { name: 'Users', path: '/users', icon: 'users' },
  { name: 'Listings', path: '/listings', icon: 'home' },
  { name: 'Interests', path: '/interests', icon: 'heart' },
  { name: 'Messages', path: '/messages', icon: 'message-square' },
  { name: 'Households', path: '/households', icon: 'layers' },
  { name: 'Reports', path: '/reports', icon: 'alert-circle' },
];

const Layout = () => {
  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white">UrbanHut Admin</h1>
        </div>
        <nav className="flex flex-col p-4">
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center p-3 my-1 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-sidebar-hover text-sidebar-text-active'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'
                }`
              }
            >
              <Feather name={link.icon} className="mr-3" />
              {link.name}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <header className="topbar">
          {/* Top bar content can go here */}
        </header>
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
