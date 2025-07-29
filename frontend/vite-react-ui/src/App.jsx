import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import TopologyPage from './pages/Topology';
import './styles/auth.css';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isLoggedIn ? <Navigate to="/topology" /> : <LoginForm setIsLoggedIn={setIsLoggedIn} />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/topology" element={isLoggedIn ? <TopologyPage /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;