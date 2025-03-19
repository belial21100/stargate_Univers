import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Home } from './pages/Home';
import { Buildings } from './pages/Buildings';
import { ResearchPage } from './pages/Research';
import { Map } from './pages/Map';
import { Shipyard } from './pages/Shipyard';
import { Combat } from './pages/Combat';
import { HallOfFame } from './pages/HallOfFame';
import { AuthLayout } from './components/AuthLayout';
import { GameLayout } from './components/GameLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        
        <Route path="/" element={<GameLayout><Home /></GameLayout>} />
        <Route path="/buildings" element={<GameLayout><Buildings /></GameLayout>} />
        <Route path="/research" element={<GameLayout><ResearchPage /></GameLayout>} />
        <Route path="/map" element={<GameLayout><Map /></GameLayout>} />
        <Route path="/shipyard" element={<GameLayout><Shipyard /></GameLayout>} />
        <Route path="/combat" element={<GameLayout><Combat /></GameLayout>} />
        <Route path="/hall-of-fame" element={<GameLayout><HallOfFame /></GameLayout>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;