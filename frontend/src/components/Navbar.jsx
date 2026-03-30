import React, { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, X } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // 🟢 ดึงข้อมูล Role และ PatientID (ปรับให้รองรับ Case-insensitive)
  const userRole = (localStorage.getItem('Role') || 'user').trim().toLowerCase();
  const patientId = localStorage.getItem('patientId'); 

  const [notifications, setNotifications] = useState([]);
  const [selectedAppoint, setSelectedAppoint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // นับแจ้งเตือน: รวม 'อนุมัติแล้ว' เข้าไปด้วยเพื่อให้คนไข้ทราบเมื่อสถานะเปลี่ยน
  const unreadCount = notifications.filter(n => 
    n.Status === 'รออนุมัติ' || n.Status === 'รอเรียก' || n.Status === 'อนุมัติแล้ว'
  ).length;

  const fetchAppointments = async () => {
    if (!patientId || userRole === 'admin') return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.get(`${apiUrl}/api/patients/${patientId}/appointments`);
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
  }, [patientId]);

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
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        await axios.put(`${apiUrl}/api/appointments/${appointId}/cancel`);
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

            {/* Nav Items */}
            <div className="flex items-center h-full">
              <nav className="hidden md:flex h-full mr-8">
                {userRole === 'admin' && (
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

              {/* Notification Bell */}
              {userRole !== 'admin' && (
                <div className="relative mx-4" ref={notificationRef}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNotifications(!showNotifications)
                    }}
                    className="relative p-2 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition duration-200"
                  >
                    <Bell size={22} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-4 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-[110] overflow-hidden">
                      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">การจองคิวของคุณ</h3>
                      </div>

                      <div className="max-h-80 overflow-y-auto">
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
                                  <p className="text-[11px] mt-1 font-medium">
                                    สถานะ: <span className={`
                                      ${noti.Status === 'ยกเลิก' ? 'text-red-500' : ''}
                                      ${noti.Status === 'รออนุมัติ' ? 'text-yellow-600' : ''}
                                      ${noti.Status === 'อนุมัติแล้ว' || noti.Status === 'รอเรียก' ? 'text-green-500' : ''}
                                    `}>{noti.Status}</span>
                                  </p>
                                </div>
                                {(noti.Status === 'รออนุมัติ' || noti.Status === 'รอเรียก' || noti.Status === 'อนุมัติแล้ว') && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0"></div>
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

              <button
                onClick={handleLogout}
                className="group flex items-center gap-2 text-sm font-semibold text-gray-500 px-4 py-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-all"
              >
                <LogOut size={18} />
                <span className="hidden md:block">ออกจากระบบ</span>
              </button>

            </div>
          </div>
        </div>
      </header>

      {/* Modal */}
      {isModalOpen && selectedAppoint && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-blue-900">รายละเอียดการจองคิว</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-y-3 text-sm">
                <div className="text-gray-500 font-medium">เลขคิว:</div>
                <div className="col-span-2 font-semibold text-blue-600">{selectedAppoint.QueueNumber || 'รอจัดลำดับ'}</div>

                <div className="text-gray-500 font-medium">วันที่ตรวจ:</div>
                <div className="col-span-2">{formatDate(selectedAppoint.AppointDate)}</div>

                <div className="text-gray-500 font-medium">เวลา:</div>
                <div className="col-span-2">{selectedAppoint.AppointTime}</div>

                <div className="text-gray-500 font-medium">แพทย์:</div>
                <div className="col-span-2">{selectedAppoint.Doctor_Name}</div>

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

            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg"
              >
                ปิด
              </button>
              {(selectedAppoint.Status === 'รออนุมัติ' || selectedAppoint.Status === 'อนุมัติแล้ว') && (
                <button
                  onClick={() => handleCancelAppointment(selectedAppoint.AppointID)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600"
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