import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Appointment from './pages/Appointment';
import Auth from './pages/Auth';
import Doctors from './pages/Doctors';
import Admin from './pages/Admin'; // 👈 นำเข้าหน้า Admin

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
        <Navbar />

        <main className="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Appointment />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/doctors" element={<Doctors />} />

            {/* 🟢 แก้ไขตรงนี้! เพิ่ม path="/dashboard" เข้าไปเพื่อให้ตรงกับปุ่มใน Navbar */}
            <Route path="/dashboard" element={<Admin />} />

            {/* 🟢 เผื่อเอาไว้: กรณีพิมพ์ /admin ในช่อง URL ตรงๆ หรือ Auth เตะมาหน้านี้ ก็จะยังเข้าได้ปกติ */}
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;