import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, CalendarCheck, CheckCircle2,
    Search, Clock, Activity, BarChart3, Stethoscope, AlertCircle, Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Admin = () => {
    const rawRole = localStorage.getItem('Role') || '';
    const role = rawRole.trim();

    const [appointments, setAppointments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);

    const [stats, setStats] = useState({
        totalPatients: 0,
        completed: 0,
        waiting: 0,
        doctorsActive: 0
    });

    const [chartData, setChartData] = useState([]);
    const [deptDensity, setDeptDensity] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.VITE_API_URL || 'https://suktuarat-hospital.onrender.com';

            const [appResponse, dashboardResponse] = await Promise.all([
                fetch(`${apiUrl}/api/appointments`, { 
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`${apiUrl}/api/admin/dashboard`, { 
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            if (!appResponse.ok || !dashboardResponse.ok) {
                throw new Error('Network response was not ok หรือ Token อาจจะหมดอายุ');
            }

            const data = await appResponse.json();
            const dashboardData = await dashboardResponse.json(); 

            setAppointments(data);

            const todayStr = new Date().toLocaleDateString('en-CA');
            const todayAppointments = data.filter(app => {
                if (!app.date) return false;
                const appDateStr = new Date(app.date).toLocaleDateString('en-CA');
                return appDateStr === todayStr;
            });

            const waitingCount = todayAppointments.filter(app => app.status === 'ยืนยันแล้ว').length;
            const completedCount = todayAppointments.filter(app => app.status === 'ตรวจเสร็จสิ้น').length;

            setStats({
                totalPatients: todayAppointments.length,
                completed: completedCount,
                waiting: waitingCount,
                doctorsActive: dashboardData.stats.totalDoctors 
            });

            const deptCounts = {};
            todayAppointments.forEach(app => {
                if (app.dept) {
                    deptCounts[app.dept] = (deptCounts[app.dept] || 0) + 1;
                }
            });

            const totalToday = todayAppointments.length || 1;
            const densityArray = Object.keys(deptCounts).map(dept => ({
                name: dept,
                count: deptCounts[dept],
                percent: Math.round((deptCounts[dept] / totalToday) * 100)
            })).sort((a, b) => b.count - a.count);

            setDeptDensity(densityArray);

            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d;
            });

            const formattedChartData = last7Days.map(dateObj => {
                const dateStr = dateObj.toLocaleDateString('en-CA');
                const displayDate = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

                const count = data.filter(app => {
                    if (!app.date) return false;
                    const appDateStr = new Date(app.date).toLocaleDateString('en-CA');
                    return appDateStr === dateStr;
                }).length;

                return {
                    name: displayDate,
                    'จำนวนผู้ป่วย (คน)': count
                };
            });

            setChartData(formattedChartData);

        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        const confirmMsg = newStatus === 'ยกเลิก'
            ? 'คุณต้องการยกเลิกคิวนี้ใช่หรือไม่?'
            : 'ยืนยันว่าการตรวจเสร็จสิ้นแล้วใช่หรือไม่?';

        if (window.confirm(confirmMsg)) {
            try {
                const token = localStorage.getItem('token');
                const apiUrl = import.meta.env.VITE_API_URL || 'https://suktuarat-hospital.onrender.com';

                const response = await fetch(`${apiUrl}/api/appointments/${id}/status`, { 
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                if (response.ok) {
                    fetchDashboardData();
                    setEditingId(null);
                } else {
                    alert("เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ ไม่สามารถอัปเดตสถานะได้");
                }

            } catch (error) {
                console.error("ไม่สามารถอัปเดตสถานะได้:", error);
                alert("เกิดข้อผิดพลาด ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
            }
        } else {
            setEditingId(null);
        }
    };

    const filteredAppointments = appointments.filter((app) => {
        const term = searchTerm.toLowerCase();
        const patientName = app.patient ? app.patient.toLowerCase() : '';
        const deptName = app.dept ? app.dept.toLowerCase() : '';
        return patientName.includes(term) || deptName.includes(term);
    });

    if (role !== 'Admin' && role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in px-4">
                <AlertCircle className="w-16 h-16 md:w-24 md:h-24 text-red-400 mb-6" />
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
            </div>
        );
    }

    return (
        /* เพิ่ม px-4 md:px-6 เพื่อไม่ให้เนื้อหาชิดขอบจอมือถือเกินไป */
        <div className="max-w-7xl mx-auto py-6 px-4 md:px-6 animate-fade-in w-full overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 flex items-center gap-2 md:gap-3">
                        <LayoutDashboard className="text-blue-600 w-7 h-7 md:w-8 md:h-8" />
                        ภาพรวมระบบ (Dashboard)
                    </h2>
                    <p className="text-sm md:text-base text-gray-500 mt-1">ข้อมูลสถิติอัปเดตล่าสุดจากระบบ</p>
                </div>
                <div className="relative w-full md:w-72 mt-2 md:mt-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อผู้ป่วย, แผนก..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none w-full shadow-sm text-sm"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-500 text-sm md:text-base">กำลังเชื่อมต่อฐานข้อมูล...</p>
                </div>
            ) : (
                <>
                    {/* การ์ดสถิติ ปรับ padding และ font ให้เล็กลงในมือถือ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="bg-blue-100 p-3 md:p-4 rounded-xl md:rounded-2xl text-blue-600"><Users className="w-6 h-6 md:w-7 md:h-7" /></div>
                            <div>
                                <p className="text-gray-500 text-xs md:text-sm font-medium">ผู้ป่วยเข้ารับบริการวันนี้</p>
                                <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.totalPatients} <span className="text-xs md:text-sm font-normal text-gray-400">คน</span></h3>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="bg-emerald-100 p-3 md:p-4 rounded-xl md:rounded-2xl text-emerald-600"><CheckCircle2 className="w-6 h-6 md:w-7 md:h-7" /></div>
                            <div>
                                <p className="text-gray-500 text-xs md:text-sm font-medium">ตรวจเสร็จสิ้นแล้ว</p>
                                <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.completed} <span className="text-xs md:text-sm font-normal text-gray-400">คน</span></h3>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="bg-amber-100 p-3 md:p-4 rounded-xl md:rounded-2xl text-amber-600"><Clock className="w-6 h-6 md:w-7 md:h-7" /></div>
                            <div>
                                <p className="text-gray-500 text-xs md:text-sm font-medium">คิวรอตรวจ (Waiting)</p>
                                <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.waiting} <span className="text-xs md:text-sm font-normal text-gray-400">คน</span></h3>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="bg-purple-100 p-3 md:p-4 rounded-xl md:rounded-2xl text-purple-600"><Stethoscope className="w-6 h-6 md:w-7 md:h-7" /></div>
                            <div>
                                <p className="text-gray-500 text-xs md:text-sm font-medium">แพทย์ที่ออกตรวจ</p>
                                <h3 className="text-xl md:text-2xl font-bold text-gray-800">{stats.doctorsActive} <span className="text-xs md:text-sm font-normal text-gray-400">ท่าน</span></h3>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 lg:col-span-2">
                            <div className="flex justify-between items-center mb-4 md:mb-6">
                                <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <BarChart3 className="text-blue-500 w-5 h-5 md:w-6 md:h-6" /> สถิติผู้ป่วย 7 วันย้อนหลัง
                                </h3>
                            </div>

                            {/* ปรับความสูงของกราฟนิดหน่อยในมือถือ */}
                            <div className="h-56 md:h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={chartData}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 10 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 10 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                                        <Bar
                                            dataKey="จำนวนผู้ป่วย (คน)"
                                            fill="#3b82f6"
                                            radius={[6, 6, 0, 0]}
                                            barSize={30}
                                            animationDuration={1500}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2 mb-4 md:mb-6">
                                <Activity className="text-emerald-500 w-5 h-5 md:w-6 md:h-6" /> ความหนาแน่นแต่ละแผนก
                            </h3>
                            <div className="space-y-4 md:space-y-5">
                                {deptDensity.length === 0 ? (
                                    <p className="text-gray-500 text-xs md:text-sm text-center py-4">ยังไม่มีคิวตรวจในวันนี้</p>
                                ) : (
                                    deptDensity.map((dept, idx) => (
                                        <div key={idx}>
                                            <div className="flex justify-between text-xs md:text-sm mb-1">
                                                <span className="text-gray-600 font-medium">{dept.name}</span>
                                                <span className="text-gray-800 font-bold">{dept.percent}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2 md:h-2.5">
                                                <div
                                                    className="bg-emerald-500 h-2 md:h-2.5 rounded-full transition-all duration-500"
                                                    style={{ width: `${dept.percent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full">
                        <div className="p-4 md:p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2">
                                <CalendarCheck className="text-blue-500 w-5 h-5 md:w-6 md:h-6" /> คิวตรวจทั้งหมด
                            </h3>
                            <button onClick={fetchDashboardData} className="text-xs md:text-sm text-blue-600 font-medium hover:underline bg-blue-50 px-3 py-1.5 rounded-md">
                                รีเฟรชข้อมูล
                            </button>
                        </div>
                        {/* ส่วนตาราง เพิ่ม whitespace-nowrap เพื่อให้มือถือสามารถเลื่อนซ้ายขวาได้สวยงาม ไม่บีบอัดข้อความ */}
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs md:text-sm border-b border-gray-100">
                                        <th className="py-3 px-4 md:py-4 md:px-6 font-medium">วันที่</th>
                                        <th className="py-3 px-4 md:py-4 md:px-6 font-medium">เวลา</th>
                                        <th className="py-3 px-4 md:py-4 md:px-6 font-medium">ชื่อผู้ป่วย</th>
                                        <th className="py-3 px-4 md:py-4 md:px-6 font-medium">แผนก / แพทย์</th>
                                        <th className="py-3 px-4 md:py-4 md:px-6 font-medium">สถานะ</th>
                                        <th className="py-3 px-4 md:py-4 md:px-6 font-medium text-center w-24 md:w-32">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredAppointments.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="py-8 text-center text-gray-500 text-sm">
                                                {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่พบข้อมูลในระบบ'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAppointments.map((app) => (
                                            <tr key={app.id} className="hover:bg-slate-50 transition-colors text-xs md:text-sm">
                                                <td className="py-3 px-4 md:py-4 md:px-6 font-semibold text-gray-700">
                                                    {app.date ? new Date(app.date).toLocaleDateString('th-TH') : '-'}
                                                </td>
                                                <td className="py-3 px-4 md:py-4 md:px-6 font-bold text-blue-600">
                                                    {app.time ? app.time.substring(0, 5) : '-'} น.
                                                </td>
                                                <td className="py-3 px-4 md:py-4 md:px-6 text-gray-800">{app.patient}</td>
                                                <td className="py-3 px-4 md:py-4 md:px-6">
                                                    <p className="text-gray-800 font-medium">{app.dept}</p>
                                                    <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">{app.doctor}</p>
                                                </td>
                                                <td className="py-3 px-4 md:py-4 md:px-6">
                                                    {app.status === 'ยืนยันแล้ว' && <span className="px-2 py-1 md:px-3 md:py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] md:text-xs font-bold border border-blue-100">ยืนยันแล้ว</span>}
                                                    {app.status === 'ตรวจเสร็จสิ้น' && <span className="px-2 py-1 md:px-3 md:py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] md:text-xs font-bold border border-emerald-100">ตรวจเสร็จสิ้น</span>}
                                                    {app.status === 'ยกเลิก' && <span className="px-2 py-1 md:px-3 md:py-1 rounded-full bg-red-50 text-red-600 text-[10px] md:text-xs font-bold border border-red-100">ยกเลิกแล้ว</span>}
                                                </td>
                                                <td className="py-3 px-4 md:py-4 md:px-6 text-center">
                                                    {app.status === 'ยืนยันแล้ว' ? (
                                                        editingId === app.id ? (
                                                            <select
                                                                className="border border-gray-300 rounded-md px-2 py-1.5 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                                                onChange={(e) => {
                                                                    if (e.target.value) {
                                                                        handleUpdateStatus(app.id, e.target.value);
                                                                    }
                                                                }}
                                                                onBlur={() => setEditingId(null)}
                                                                autoFocus
                                                            >
                                                                <option value="">-- เลือก --</option>
                                                                <option value="ตรวจเสร็จสิ้น">ตรวจเสร็จสิ้น</option>
                                                                <option value="ยกเลิก">ยกเลิก</option>
                                                            </select>
                                                        ) : (
                                                            <button
                                                                onClick={() => setEditingId(app.id)}
                                                                className="text-xs md:text-sm font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 md:px-4 md:py-1.5 rounded-lg transition-colors w-full"
                                                            >
                                                                แก้ไข
                                                            </button>
                                                        )
                                                    ) : (
                                                        <span className="text-gray-300 text-xs md:text-sm">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Admin;