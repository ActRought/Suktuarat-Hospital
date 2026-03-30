import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Stethoscope, Award, CalendarCheck, ChevronRight, ChevronDown } from 'lucide-react';

const Doctors = () => {
    const [selectedDept, setSelectedDept] = useState('all');
    const [departments, setDepartments] = useState([{ id: 'all', name: 'แพทย์ทั้งหมด' }]);
    const [doctorsData, setDoctorsData] = useState([]);
    const [loading, setLoading] = useState(true);

    // ดึงข้อมูลเมื่อโหลดหน้าเว็บ
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. ดึงข้อมูลแผนกทั้งหมด
                const deptRes = await fetch('http://localhost:5000/api/departments');
                const deptData = await deptRes.json();
                // จัดรูปแบบแผนกให้เข้ากับ UI ของเรา
                const formattedDepts = [
                    { id: 'all', name: 'แพทย์ทั้งหมด' },
                    ...deptData.map(d => ({ id: d.Department_ID.toString(), name: d.Department_Name }))
                ];
                setDepartments(formattedDepts);

                // 2. ดึงข้อมูลแพทย์ทั้งหมด
                const docRes = await fetch('http://localhost:5000/api/all-doctors');
                const docData = await docRes.json();
                setDoctorsData(docData);
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
        : doctorsData.filter(doc => doc.departmentId.toString() === selectedDept);

    return (
        <div className="max-w-7xl mx-auto py-6 animate-fade-in">

            {/* ส่วนหัวของหน้า */}
            <div className="bg-gradient-to-r from-hospital-blue to-blue-600 rounded-3xl p-8 md:p-12 text-white shadow-lg mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <h2 className="text-3xl md:text-4xl font-extrabold mb-4 flex items-center gap-3">
                    <Users className="text-blue-200" size={36} /> ทีมแพทย์ผู้เชี่ยวชาญ
                </h2>
                <p className="text-blue-100 text-lg max-w-2xl font-light">
                    ค้นหาแพทย์และผู้เชี่ยวชาญเฉพาะทาง จากโรงพยาบาลสุขทั่วราษฎร์ พร้อมให้บริการและดูแลสุขภาพของคุณอย่างใกล้ชิด
                </p>
            </div>

            {/* แถบเลือกแผนก (Filter เปลี่ยนเป็น Dropdown) */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                    <h3 className="text-gray-700 font-bold text-lg">ค้นหาแพทย์ตามแผนก</h3>
                </div>

                <div className="relative w-full md:w-1/3">
                    <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="w-full p-3 pl-4 pr-10 appearance-none rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-gray-50 hover:bg-white text-gray-700 cursor-pointer transition-all text-base font-medium"
                    >
                        {/* วนลูปแสดงแผนกทั้งหมดที่มีใน State departments */}
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>

                    {/* ไอคอนลูกศรลงที่ปรับแต่งให้สวยงาม */}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-blue-500">
                        <ChevronDown size={20} />
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="text-center py-20 text-gray-500 font-bold text-xl">
                    กำลังโหลดข้อมูลแพทย์...
                </div>
            ) : (
                /* แสดงรายชื่อแพทย์ (Grid) */
                filteredDoctors.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {filteredDoctors.map((doc) => {
                            // สร้าง Avatar อัตโนมัติจากชื่อถ้าใน DB ไม่มีรูป
                            const defaultImage = `https://ui-avatars.com/api/?name=${doc.name.replace(' ', '+')}&background=0ea5e9&color=fff&size=128`;

                            return (
                                <div key={doc.id} className="bg-white rounded-3xl p-6 shadow-lg shadow-gray-100 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-5 mb-6">
                                            <img src={defaultImage} alt={doc.name} className="w-20 h-20 rounded-full object-cover border-4 border-blue-50 group-hover:border-blue-100 transition-colors" />
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-800">{doc.name}</h3>
                                                <p className="text-hospital-blue font-medium flex items-center gap-1.5 mt-1 text-sm">
                                                    <Stethoscope size={16} /> {doc.spec || 'แพทย์ทั่วไป'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-3 border border-gray-100">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 flex items-center gap-2"><Award size={16} className="text-blue-400" /> แผนก</span>
                                                <span className="font-semibold text-gray-700">{doc.departmentName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ลิงก์ไปหน้าจองคิว */}
                                    <Link to="/appointment" className="w-full flex items-center justify-center gap-2 bg-white border-2 border-hospital-blue text-hospital-blue py-3 rounded-xl font-bold hover:bg-hospital-blue hover:text-white transition-colors">
                                        <CalendarCheck size={18} /> นัดหมายแพทย์ <ChevronRight size={18} />
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-500">ยังไม่มีรายชื่อแพทย์ในแผนกนี้</h3>
                    </div>
                )
            )}

        </div>
    );
};

export default Doctors;