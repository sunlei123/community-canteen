import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Order from './pages/Order';
import Success from './pages/Success';
import Login from './pages/Login';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/order" element={<Order />} />
          <Route path="/success" element={<Success />} />
          <Route path="/login" element={<Login />} />
        </Routes>
        
        {/* 全局通知组件 */}
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 2000,
            style: {
              background: '#fff',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              fontSize: '14px'
            }
          }}
        />
      </div>
    </Router>
  );
}

export default App;
