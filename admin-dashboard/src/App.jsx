import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Import pages
import Overview from './app/index';
import Analytics from './app/analytics';
import Community from './app/community';
import Households from './app/households';
import Interests from './app/interests';
import Investor from './app/investor';
import Listings from './app/listings';
import Messages from './app/messages';
import Reports from './app/reports';
import Services from './app/services';
import Users from './app/users';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/community" element={<Community />} />
          <Route path="/households" element={<Households />} />
          <Route path="/interests" element={<Interests />} />
          <Route path="/investor" element={<Investor />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/services" element={<Services />} />
          <Route path="/users" element={<Users />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
