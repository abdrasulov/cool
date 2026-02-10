import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import DeviceList from './components/DeviceList';
import DeviceDetail from './components/DeviceDetail';
import EnrollDevice from './components/EnrollDevice';
import './App.css';

function App() {
  const location = useLocation();

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <Link to="/">MDM Server</Link>
        </div>
        <div className="nav-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Devices
          </Link>
          <Link to="/enroll" className={location.pathname === '/enroll' ? 'active' : ''}>
            Enroll
          </Link>
        </div>
      </nav>
      <main className="content">
        <Routes>
          <Route path="/" element={<DeviceList />} />
          <Route path="/devices/:udid" element={<DeviceDetail />} />
          <Route path="/enroll" element={<EnrollDevice />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
