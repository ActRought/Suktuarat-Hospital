import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, LogOut, X, LogIn, Menu } from 'lucide-react'; // 🟢 เพิ่มไอคอน Menu เข้ามา
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  
  // 🟢 State สำหรับเปิด/ปิดเมนูแฮมเบอร์เกอร์ในมือถือ
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ดึงข้อมูล Role และ PatientID จาก localStorage
  const rawRole = localStorage.getItem('Role');
  const userRole = (rawRole || 'user').trim().toLowerCase();
  const patientId = localStorage.getItem('patientId'); 

  // เช็กว่าเข้าสู่ระบบหรือยัง
  const isLoggedIn = !!patientId || !!rawRole; 

  // State สำหรับเก็บข้อมูลการแจ้งเตือน(คิว) และ Modal
  const [notifications, setNotifications] = useState([]);
  const [selectedAppoint, setSelectedAppoint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ดึงคิวที่ "รออนุมัติ" หรือ "รอเรียก" มานับเป็นแจ้งเตือนที่ยังไม่อ่าน
  const unreadCount = notifications.filter(n => n.Status === 'รออนุมัติ' || n.Status === 'รอเรียก').length;

  // ฟังก์ชันดึงข้อมูลการจองของ User คนนี้
  const fetchAppointments = async () => {
    if (!isLoggedIn || !patientId || userRole === 'admin') return; 
    try {
      const res = await axios.get(`https://suktuarat-hospital.onrender.com/api/patients/${patientId}/appointments`);
      setNotifications(res.data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  useEffect(() => {
    fetchAppointments();

    const intervalId = setInterval(() => {
      fetchAppointments();
    }, 10000);

    const handleUpdateNotifications = () => {
      fetchAppointments();
    };
    window.addEventListener('updateNotifications', handleUpdateNotifications);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('updateNotifications', handleUpdateNotifications);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, isLoggedIn]);

  // ปิด Dropdown แจ้งเตือนเมื่อคลิกที่อื่น
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
        await axios.put(`https://suktuarat-hospital.onrender.com/api/appointments/${appointId}/cancel`);
        alert("ยกเลิกคิวสำเร็จ");
        setIsModalOpen(false);
        fetchAppointments(); 
      } catch (error) {
        console.error("Error cancelling appointment", error);
        alert("เกิดข้อผิดพลาดในการยกเลิกคิว");
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsMobileMenuOpen(false); // ปิดเมนูมือถือตอนกดออก
    navigate('/auth'); 
  };

  const isActive = (path) => location.pathname === path;

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('th-TH', options);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-[999]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">

            {/* ================= ฝั่งซ้าย: โลโก้และชื่อโรงพยาบาล ================= */}
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="โลโก้โรงพยาบาลสุขทั่วราษฎร์"
                className="h-12 md:h-18 w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-sm"
              />
              <div className="flex flex-col justify-center">
                <h1 className="text-lg md:text-2xl font-extrabold text-blue-900 leading-tight tracking-tight">
                  โรงพยาบาลสุขทั่วราษฎร์
                </h1>
                <span className="text-[10px] md:text-xs text-gray-400 font-bold tracking-widest uppercase mt-0.5">
                  Suktuarat Hospital
                </span>
              </div>
            </Link>

            {/* ================= ฝั่งขวา: เมนู, แจ้งเตือน, เข้าสู่ระบบ/ออกจากระบบ ================= */}
            <div className="flex items-center h-full gap-2 md:gap-0">

              {/* เมนูสำหรับจอคอมพิวเตอร์ (ซ่อนในมือถือ) */}
              <nav className="hidden md:flex h-full mr-8">
                {userRole === 'admin' && isLoggedIn && (
                  <Link
                    to="/dashboard"
                    className={`relative flex items-center px-5 text-sm font-semibold transition-colors duration-200 hover:text-blue-600 ${isActive('/dashboard') ? 'text-blue-600' : 'text-gray-500'}`}
                  >
                    แดชบอร์ด (Admin)
                    {isActive('/dashboard') && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-md"></span>}
                  </Link>
                )}

                <Link
                  to="/"
                  className={`relative flex items-center px-5 text-sm font-semibold transition-colors duration-200 hover:text-blue-600 ${isActive('/') ? 'text-blue-600' : 'text-gray-500'}`}
                >
                  จองคิวตรวจ
                  {isActive('/') && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-md"></span>}
                </Link>

                <Link
                  to="/doctors"
                  className={`relative flex items-center px-5 text-sm font-semibold transition-colors duration-200 hover:text-blue-600 ${isActive('/doctors') ? 'text-blue-600' : 'text-gray-500'}`}
                >
                  รายชื่อแพทย์
                  {isActive('/doctors') && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-md"></span>}
                </Link>
              </nav>

              <div className="hidden md:block w-px h-8 bg-gray-200 mx-2"></div>

              {/* ปุ่มแจ้งเตือน */}
              {isLoggedIn && userRole !== 'admin' && (
                <div className="relative mx-1 md:mx-4" ref={notificationRef}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNotifications(!showNotifications)
                    }}
                    className="relative p-2 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition duration-200"
                  >
                    <Bell size={22} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown แจ้งเตือน */}
                  {showNotifications && (
                    <div className="absolute right-[-60px] md:right-0 mt-4 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">การจองคิวของคุณ</h3>
                      </div>

                      <div className="max-h-80 overflow-y-auto scrollbar-hide">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-gray-500 text-sm">ไม่มีประวัติการจองคิว</div>
                        ) : (
                          notifications.map((noti) => (
                            <div
                              key={noti.AppointID}
                              onClick={() => handleNotificationClick(noti)}
                              className="p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 bg-white"
                            >
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">
                                    คิวตรวจวันที่ {formatDate(noti.AppointDate)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">แพทย์: {noti.Doctor_Name}</p>
                                  <p className="text-[11px] text-gray-400 mt-1 font-medium">
                                    สถานะ: <span className={`
                                      ${noti.Status === 'ยกเลิก' ? 'text-red-500' : ''}
                                      ${noti.Status === 'รออนุมัติ' ? 'text-yellow-600' : ''}
                                      ${noti.Status === 'อนุมัติแล้ว' || noti.Status === 'รอเรียก' ? 'text-green-500' : ''}
                                    `}>{noti.Status}</span>
                                  </p>
                                </div>
                                {(noti.Status === 'รออนุมัติ' || noti.Status === 'รอเรียก') && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0 shadow-sm shadow-blue-200"></div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ปุ่ม เข้าสู่ระบบ / ออกจากระบบ */}
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="group flex items-center gap-2 text-sm font-semibold text-gray-500 px-3 py-2 border border-transparent rounded-full hover:border-red-100 hover:bg-red-50 hover:text-red-600 transition-all duration-300"
                >
                  <LogOut size={20} className="text-gray-400 group-hover:text-red-500 transition-colors" />
                  <span className="hidden md:block">ออกจากระบบ</span>
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="group flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 px-4 md:px-5 py-2 md:py-2.5 rounded-full hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg ml-1 md:ml-2"
                >
                  <LogIn size={18} className="text-white group-hover:scale-110 transition-transform" />
                  <span className="hidden md:block">เข้าสู่ระบบ / สมัครสมาชิก</span>
                </Link>
              )}

              {/* 🟢 ปุ่มแฮมเบอร์เกอร์สำหรับมือถือ */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors ml-1"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

            </div>
          </div>
        </div>

        {/* 🟢 เมนู Dropdown สำหรับจอมือถือ */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg absolute w-full left-0 animate-fade-in">
            <div className="px-4 pt-2 pb-4 space-y-1">
              {userRole === 'admin' && isLoggedIn && (
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-3 rounded-md text-base font-medium ${isActive('/dashboard') ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'}`}
                >
                  แดชบอร์ด (Admin)
                </Link>
              )}
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-3 rounded-md text-base font-medium ${isActive('/') ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'}`}
              >
                จองคิวตรวจ
              </Link>
              <Link
                to="/doctors"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-3 rounded-md text-base font-medium ${isActive('/doctors') ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'}`}
              >
                รายชื่อแพทย์
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ================= Modal แสดงรายละเอียดและยกเลิกคิว ================= */}
      {isModalOpen && selectedAppoint && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in relative">

            {/* Header Modal */}
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-blue-900">รายละเอียดการจองคิว</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-y-3 text-sm">
                <div className="text-gray-500 font-medium">เลขคิว (ถ้ามี):</div>
                <div className="col-span-2 font-semibold text-blue-600">{selectedAppoint.QueueNumber || '-'}</div>

                <div className="text-gray-500 font-medium">วันที่ตรวจ:</div>
                <div className="col-span-2">{formatDate(selectedAppoint.AppointDate)}</div>

                <div className="text-gray-500 font-medium">เวลา:</div>
                <div className="col-span-2">{selectedAppoint.AppointTime}</div>

                <div className="text-gray-500 font-medium">แพทย์ผู้ตรวจ:</div>
                <div className="col-span-2">{selectedAppoint.Doctor_Name}</div>

                <div className="text-gray-500 font-medium">อาการเบื้องต้น:</div>
                <div className="col-span-2 text-gray-700">{selectedAppoint.Symptoms || '-'}</div>

                <div className="text-gray-500 font-medium">สถานะ:</div>
                <div className={`col-span-2 font-semibold
                  ${selectedAppoint.Status === 'ยกเลิก' ? 'text-red-500' : ''}
                  ${selectedAppoint.Status === 'รออนุมัติ' ? 'text-yellow-600' : ''}
                  ${selectedAppoint.Status === 'อนุมัติแล้ว' || selectedAppoint.Status === 'รอเรียก' ? 'text-green-500' : ''}
                `}>
                  {selectedAppoint.Status}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ปิดหน้าต่าง
              </button>

              {/* ซ่อนปุ่มยกเลิก หากสถานะเป็น 'ยกเลิก' หรือ 'เสร็จสิ้น' ไปแล้ว */}
              {(selectedAppoint.Status === 'รออนุมัติ' || selectedAppoint.Status === 'รอเรียก') && (
                <button
                  onClick={() => handleCancelAppointment(selectedAppoint.AppointID)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                >
                  ยกเลิกคิว
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;