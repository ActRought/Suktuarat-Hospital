import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
// 🟢 1. นำเข้า MapPin และ Phone เพิ่มเติม
import { Users, Stethoscope, Award, CalendarCheck, ChevronRight, ChevronDown, MapPin, Phone } from 'lucide-react';

// ==========================================
// 🔗 ตั้งค่า API URL (Backend บน Render)
// ==========================================
const API_BASE_URL = import.meta.env.VITE_API_URL + '/api';

const Doctors = () => {
    const navigate = useNavigate(); 
    const [selectedDept, setSelectedDept] = useState('all');
    const [departments, setDepartments] = useState([{ id: 'all', name: 'แพทย์ทั้งหมด' }]);
    const [doctorsData, setDoctorsData] = useState([]);
    const [loading, setLoading] = useState(true);

    // ดึงข้อมูลเมื่อโหลดหน้าเว็บ
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. ดึงข้อมูลแผนกทั้งหมด
                const deptRes = await fetch(`${API_BASE_URL}/departments`);
                const deptData = await deptRes.json();
                
                const formattedDepts = [
                    { id: 'all', name: 'แพทย์ทั้งหมด' },
                    // 🟢 2. เพิ่มการเก็บ Location และ Phone จาก API
                    ...deptData.map(d => ({ 
                        id: d.Department_ID.toString(), 
                        name: d.Department_Name,
                        location: d.Location, 
                        phone: d.Phone
                    }))
                ];
                setDepartments(formattedDepts);

                // 2. ดึงข้อมูลแพทย์ทั้งหมด
                const docRes = await fetch(`${API_BASE_URL}/all-doctors`);
                const docData = await docRes.json();
                
                // ตรวจสอบและแมพข้อมูลให้เข้ากับตัวแปรใน UI
                const mappedDocs = docData.map(doc => ({
                    id: doc.Doctor_ID || doc.id,
                    name: doc.Doctor_Name || doc.name,
                    spec: doc.Specialization || doc.spec,
                    departmentId: doc.Department_ID || doc.departmentId,
                    departmentName: doc.Department_Name || doc.departmentName
                }));
                
                setDoctorsData(mappedDocs);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // กรองรายชื่อแพทย์ตามแผนก
    const filteredDoctors = selectedDept === 'all'
        ? doctorsData
        : doctorsData.filter(doc => doc.departmentId?.toString() === selectedDept);

    // ฟังก์ชันสำหรับรับมือตอนกดปุ่มนัดหมายหมอ
    const handleBookAppointment = (doc) => {
        navigate('/', { 
            state: { 
                selectedDepartmentId: doc.departmentId, 
                selectedDoctorId: doc.id 
            } 
        });
    };

    // 🟢 3. Logic สำหรับดึงข้อมูลสถานที่และเบอร์โทรมาแสดง
    let displayContact = null;
    if (selectedDept === 'all') {
        // หาข้อมูล Call Center จาก departments (ถ้ามี) ถ้าไม่มีให้ใช้ค่าเริ่มต้น
        const callCenter = departments.find(d => d.name.includes('Call Center') || d.id === 'D046');
        displayContact = {
            title: 'เบอร์ติดต่อกลาง (Call Center)',
            location: callCenter?.location || '-',
            phone: callCenter?.phone || '1474 หรือ 02-419-1000'
        };
    } else {
        const dept = departments.find(d => d.id === selectedDept);
        // เช็คว่ามีข้อมูลแผนก และ (มีสถานที่ หรือ มีเบอร์โทร) อย่างน้อย 1 อย่างถึงจะให้แสดง
        if (dept && (dept.location || dept.phone)) {
            displayContact = {
                title: dept.name,
                location: dept.location,
                phone: dept.phone
            };
        }
    }

    return (
        <div className="max-w-7xl mx-auto py-4 md:py-6 animate-fade-in px-4">

            {/* ส่วนหัวของหน้า */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-3xl p-6 md:p-12 text-white shadow-lg mb-6 md:mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <h2 className="text-2xl md:text-4xl font-extrabold mb-3 md:mb-4 flex items-center gap-2 md:gap-3 relative z-10">
                    <Users className="text-blue-200 w-8 h-8 md:w-9 md:h-9" /> ทีมแพทย์ผู้เชี่ยวชาญ
                </h2>
                <p className="text-blue-50 text-sm md:text-lg max-w-2xl font-light relative z-10">
                    ค้นหาแพทย์และผู้เชี่ยวชาญเฉพาะทาง จากโรงพยาบาลสุขทั่วราษฎร์ พร้อมให้บริการและดูแลสุขภาพของคุณอย่างใกล้ชิด
                </p>
            </div>

            {/* แถบเลือกแผนก */}
            <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                    <h3 className="text-gray-700 font-bold text-base md:text-lg">ค้นหาแพทย์ตามแผนก</h3>
                </div>

                <div className="relative w-full md:w-1/3">
                    <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="w-full p-2.5 md:p-3 pl-4 pr-10 appearance-none rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 hover:bg-white text-gray-700 cursor-pointer transition-all text-sm md:text-base font-medium"
                    >
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>

                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-blue-500">
                        <ChevronDown size={18} className="md:w-5 md:h-5" />
                    </div>
                </div>
            </div>

            {/* 🟢 4. การแสดงผลข้อมูลสถานที่และเบอร์โทร (จะแสดงก็ต่อเมื่อมีข้อมูล) */}
            {displayContact && (displayContact.location || displayContact.phone) && (
                <div className="mb-6 md:mb-8 bg-blue-50 border border-blue-100 rounded-2xl p-4 md:p-6 shadow-sm animate-fade-in">
                    <h3 className="text-blue-800 font-bold text-lg md:text-xl mb-3 md:mb-4 border-b border-blue-200 pb-2">
                        {displayContact.title}
                    </h3>
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8 text-sm md:text-base text-gray-700">
                        {displayContact.location && displayContact.location !== '-' && (
                            <div className="flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-xl flex-1 border border-blue-100 shadow-sm">
                                <MapPin size={20} className="text-blue-500 shrink-0" />
                                <span><strong className="text-blue-900">สถานที่:</strong> {displayContact.location}</span>
                            </div>
                        )}
                        {displayContact.phone && displayContact.phone !== '-' && (
                            <div className="flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-xl flex-1 border border-blue-100 shadow-sm">
                                <Phone size={20} className="text-blue-500 shrink-0" />
                                <span><strong className="text-blue-900">ติดต่อ:</strong> {displayContact.phone}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* การแสดงผลข้อมูลรายชื่อแพทย์ */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 md:py-20 text-gray-400">
                    <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-medium text-sm md:text-base">กำลังโหลดข้อมูลทีมแพทย์...</p>
                </div>
            ) : (
                filteredDoctors.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                        {filteredDoctors.map((doc) => {
                            const doctorName = doc.name || 'Unknown Doctor';
                            const defaultImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=0ea5e9&color=fff&size=128`;

                            return (
                                <div key={doc.id} className="bg-white rounded-3xl p-5 md:p-6 shadow-lg shadow-gray-100 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-4 md:gap-5 mb-5 md:mb-6">
                                            <img 
                                                src={defaultImage} 
                                                alt={doctorName} 
                                                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-blue-50 group-hover:border-blue-100 transition-colors shrink-0" 
                                            />
                                            <div>
                                                <h3 className="text-lg md:text-xl font-bold text-gray-800 line-clamp-1">{doctorName}</h3>
                                                <p className="text-blue-600 font-medium flex items-center gap-1.5 mt-1 text-xs md:text-sm">
                                                    <Stethoscope size={14} className="md:w-4 md:h-4" /> <span className="line-clamp-1">{doc.spec || 'แพทย์ทั่วไป'}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl p-3 md:p-4 mb-5 md:mb-6 space-y-2 md:space-y-3 border border-gray-100">
                                            <div className="flex items-center justify-between text-xs md:text-sm">
                                                <span className="text-gray-500 flex items-center gap-2">
                                                    <Award size={14} className="text-blue-400 md:w-4 md:h-4" /> แผนก
                                                </span>
                                                <span className="font-semibold text-gray-700 text-right line-clamp-1 ml-2">{doc.departmentName || 'ไม่ระบุแผนก'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => handleBookAppointment(doc)} 
                                        className="w-full flex items-center justify-center gap-2 bg-white border-2 border-blue-600 text-blue-600 py-2.5 md:py-3 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95 text-sm md:text-base"
                                    >
                                        <CalendarCheck size={16} className="md:w-5 md:h-5" /> นัดหมายแพทย์ <ChevronRight size={16} className="md:w-5 md:h-5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 md:py-20 bg-white rounded-3xl border border-gray-100 shadow-sm mx-auto">
                        <Stethoscope className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-3 md:mb-4" />
                        <h3 className="text-lg md:text-xl font-bold text-gray-500">ไม่พบรายชื่อแพทย์ในแผนกที่เลือก</h3>
                        <button 
                            onClick={() => setSelectedDept('all')}
                            className="mt-3 md:mt-4 text-blue-600 hover:underline font-medium text-sm md:text-base"
                        >
                            แสดงแพทย์ทั้งหมด
                        </button>
                    </div>
                )
            )}

        </div>
    );
};

export default Doctors;