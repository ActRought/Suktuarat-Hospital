import React, { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, X, User } from 'lucide-react'; // เพิ่ม User icon
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // 🟢 ตรวจสอบสถานะการ Login
  const isLoggedIn = !!localStorage.getItem('token'); 
  const userRole = (localStorage.getItem('Role') || 'user').trim().toLowerCase();
  const patientId = localStorage.getItem('patientId'); 

  // 🟢 ตั้งค่า API URL ให้ชี้ไปที่ Render เป็นหลัก
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://suktuarat-hospital.onrender.com';

  const [notifications, setNotifications] = useState([]);
  const [selectedAppoint, setSelectedAppoint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const unreadCount = notifications.filter(n => 
    n.Status === 'รออนุมัติ' || n.Status === 'รอเรียก' || n.Status === 'อนุมัติแล้ว'
  ).length;

  const fetchAppointments = async () => {
    if (!patientId || userRole === 'admin') return;
    try {
      // ใช้ API_BASE_URL ที่ตั้งไว้ข้างบน
      const res = await axios.get(`${API_BASE_URL}/api/patients/${patientId}/appointments`);
      setNotifications(res.data);
    } catch (error) {
      console.error("Network Error:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchAppointments();

    const intervalId = setInterval(() => {
      if (isLoggedIn) fetchAppointments();
    }, 10000);

    const handleUpdateNotifications = () => fetchAppointments();
    window.addEventListener('updateNotifications', handleUpdateNotifications);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('updateNotifications', handleUpdateNotifications);
    };
  }, [patientId, isLoggedIn]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (appoint) => {
    setSelectedAppoint(appoint);
    setIsModalOpen(true);
    setShowNotifications(false);
  };

  const handleCancelAppointment = async (appointId) => {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคิวนี้?")) {
      try {
        await axios.put(`${API_BASE_URL}/api/appointments/${appointId}/cancel`);
        alert("ยกเลิกคิวสำเร็จ");
        setIsModalOpen(false);
        fetchAppointments();
      } catch (error) {
        alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อยกเลิกคิวได้");
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/auth');
  };

  const isActive = (path) => location.pathname === path;

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('th-TH', options);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">

            {/* Logo Section */}
            <Link to="/" className="flex items-center gap-4 group">
              <img
                src="/logo.png"
                alt="โลโก้โรงพยาบาล"
                className="h-16 md:h-18 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <div className="flex flex-col justify-center">
                <h1 className="text-xl md:text-2xl font-extrabold text-blue-900 leading-tight">
                  โรงพยาบาลสุขทั่วราษฎร์
                </h1>
                <span className="text-[11px] md:text-xs text-gray-400 font-bold tracking-widest uppercase">
                  Suktuarat Hospital
                </span>
              </div>
            </Link>

            <div className="flex items-center h-full">
              {/* ================= เมนูสำหรับผู้ที่ Login แล้ว ================= */}
              {isLoggedIn ? (
                <>
                  <nav className="hidden md:flex h-full mr-8">
                    {userRole === 'admin' && (
                      <Link to="/dashboard" className={`relative flex items-center px-5 text-sm font-semibold transition-colors duration-200 hover:text-blue-600 ${isActive('/dashboard') ? 'text-blue-600' : 'text-gray-500'}`}>
                        แดชบอร์ด (Admin)
                        {isActive('/dashboard') && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-md"></span>}
                      </Link>
                    )}
                    <Link to="/" className={`relative flex items-center px-5 text-sm font-semibold transition-colors duration-200 hover:text-blue-600 ${isActive('/') ? 'text-blue-600' : 'text-gray-500'}`}>
                      จองคิวตรวจ
                      {isActive('/') && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-md"></span>}
                    </Link>
                    <Link to="/doctors" className={`relative flex items-center px-5 text-sm font-semibold transition-colors duration-200 hover:text-blue-600 ${isActive('/doctors') ? 'text-blue-600' : 'text-gray-500'}`}>
                      รายชื่อแพทย์
                      {isActive('/doctors') && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-md"></span>}
                    </Link>
                  </nav>

                  <div className="hidden md:block w-px h-8 bg-gray-200 mx-2"></div>

                  {userRole !== 'admin' && (
                    <div className="relative mx-4" ref={notificationRef}>
                      <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition duration-200">
                        <Bell size={22} />
                        {unreadCount > 0 && <span className="absolute top-1 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">{unreadCount}</span>}
                      </button>
                      {showNotifications && (
                        <div className="absolute right-0 mt-4 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-[110] overflow-hidden">
                          <div className="p-4 border-b bg-gray-50 font-bold text-gray-800">การจองคิวของคุณ</div>
                          <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                              <div className="p-6 text-center text-gray-500 text-sm">ไม่มีประวัติการจองคิว</div>
                            ) : (
                              notifications.map((noti) => (
                                <div key={noti.AppointID} onClick={() => handleNotificationClick(noti)} className="p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors">
                                  <p className="text-sm font-semibold text-gray-800">คิวตรวจวันที่ {formatDate(noti.AppointDate)}</p>
                                  <p className="text-[11px] mt-1 font-medium">สถานะ: <span className={noti.Status === 'ยกเลิก' ? 'text-red-500' : 'text-green-500'}>{noti.Status}</span></p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button onClick={handleLogout} className="group flex items-center gap-2 text-sm font-semibold text-gray-500 px-4 py-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-all">
                    <LogOut size={18} />
                    <span className="hidden md:block">ออกจากระบบ</span>
                  </button>
                </>
              ) : (
                /* ================= เมนูสำหรับผู้ที่ยังไม่ได้ Login ================= */
                <Link to="/auth" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
                  <User size={18} />
                  เข้าสู่ระบบ / สมัครสมาชิก
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modal Detail (คงเดิม) */}
      {isModalOpen && selectedAppoint && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
             {/* ... (โค้ด Modal เดิมของคุณ) ... */}
             <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
               <h2 className="text-lg font-bold text-blue-900">รายละเอียดคิว</h2>
               <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
             </div>
             <div className="p-6 text-sm space-y-3">
                <p><strong>แพทย์:</strong> {selectedAppoint.Doctor_Name}</p>
                <p><strong>วันที่:</strong> {formatDate(selectedAppoint.AppointDate)}</p>
                <p><strong>สถานะ:</strong> {selectedAppoint.Status}</p>
             </div>
             <div className="p-4 bg-gray-50 flex justify-end gap-2">
               <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg">ปิด</button>
               {(selectedAppoint.Status === 'รออนุมัติ') && (
                 <button onClick={() => handleCancelAppointment(selectedAppoint.AppointID)} className="bg-red-500 text-white px-4 py-2 rounded-lg">ยกเลิกคิว</button>
               )}
             </div>
           </div>
        </div>
      )}
    </>
  );
};

export default Navbar;