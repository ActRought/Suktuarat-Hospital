import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, Clock, User, FileText, CheckCircle, ShieldPlus, AlertCircle } from 'lucide-react';

// ==========================================
// 🔗 ตั้งค่า API URL (Backend บน Render)
// ==========================================
const API_BASE_URL = import.meta.env.VITE_API_URL + '/api';

// ฟังก์ชันสำหรับสร้างช่วงเวลา (ปรับปรุงให้ไม่เกินเวลาเลิกงาน)
const generateTimeSlots = (start, end) => {
    const slots = [];
    if (!start || !end) return slots;

    let current = new Date(`2024-01-01T${start}`);
    const stop = new Date(`2024-01-01T${end}`);

    // ใช้ < แทน <= เพื่อให้ Slot สุดท้ายไม่ไปทับเวลาเลิกงานพอดี
    while (current < stop) {
        slots.push(current.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        current.setMinutes(current.getMinutes() + 30);
    }
    return slots;
};

const Appointment = () => {
    const navigate = useNavigate();
    const location = useLocation(); 
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [doctorInfo, setDoctorInfo] = useState(null);
    const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
    const [useInsurance, setUseInsurance] = useState(false);

    const [formData, setFormData] = useState({
        departmentId: '',
        doctorId: '',
        insuranceId: '',
        appointDate: '',
        appointTime: '',
        symptoms: ''
    });

    const [loading, setLoading] = useState(false);
    const [successQueue, setSuccessQueue] = useState(null);

    // 1. ดักจับข้อมูล State ที่ส่งมาจากหน้า Doctors.jsx (ทำงานครั้งเดียวตอนโหลดหน้า)
    useEffect(() => {
        if (location.state && location.state.selectedDepartmentId) {
            setFormData(prev => ({
                ...prev,
                departmentId: location.state.selectedDepartmentId,
                doctorId: location.state.selectedDoctorId || ''
            }));
            
            // เคลียร์ state ใน history ออก ป้องกันการกด Refresh แล้วค่าค้าง
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // 2. เช็คสิทธิ์และดึงข้อมูลแผนก
    useEffect(() => {
        const token = localStorage.getItem('token');
        const patientId = localStorage.getItem('patientId');

        if (!token || !patientId) {
            alert('กรุณาเข้าสู่ระบบก่อนจองคิว');
            navigate('/auth');
            return;
        }

        fetch(`${API_BASE_URL}/departments`)
            .then(res => res.json())
            .then(data => setDepartments(data))
            .catch(err => console.error('Error fetching departments:', err));
    }, [navigate]);

    // 3. ดึงข้อมูลหมอ เมื่อผู้ใช้เลือกแผนก หรือเมื่อมีการรับค่าจากหน้า Doctors
    useEffect(() => {
        if (formData.departmentId) {
            fetch(`${API_BASE_URL}/departments/${formData.departmentId}/doctors`)
                .then(res => res.json())
                .then(data => {
                    setDoctors(data);
                    // เช็คว่าถ้าไม่มีการตั้งค่าหมอไว้ล่วงหน้า (กรณีเลือกเองในหน้าจอง) ค่อยรีเซ็ตค่า
                    if (!location.state?.selectedDoctorId) {
                        setFormData(prev => ({ ...prev, doctorId: prev.doctorId || '' }));
                    }
                    setDoctorInfo(null);
                })
                .catch(err => console.error('Error fetching doctors:', err));
        } else {
            setDoctors([]);
        }
    }, [formData.departmentId, location.state]);

    // 4. ดึงข้อมูลตารางเวลาและความเชี่ยวชาญ เมื่อเลือกหมอ
    useEffect(() => {
        if (formData.doctorId) {
            fetch(`${API_BASE_URL}/doctors/${formData.doctorId}/info`)
                .then(res => res.json())
                .then(data => setDoctorInfo(data))
                .catch(err => console.error('Error fetching doctor info:', err));
        } else {
            setDoctorInfo(null);
        }
    }, [formData.doctorId]);

    // 5. สร้างช่วงเวลา (Logic การคำนวณวันในสัปดาห์แบบแม่นยำ)
    useEffect(() => {
        if (formData.appointDate && doctorInfo?.schedules) {
            // แยกวันที่เพื่อเลี่ยงปัญหา Timezone
            const [year, month, day] = formData.appointDate.split('-').map(Number);
            const selectedDate = new Date(year, month - 1, day);
            const dayIndex = selectedDate.getDay();

            const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const targetDay = dayNamesEn[dayIndex];

            const daySchedule = doctorInfo.schedules.find(s =>
                s.Day_of_Week?.trim().toLowerCase() === targetDay
            );

            if (daySchedule?.Start_Time && daySchedule?.End_Time) {
                const slots = generateTimeSlots(daySchedule.Start_Time, daySchedule.End_Time);
                setAvailableTimeSlots(slots);
            } else {
                setAvailableTimeSlots([]);
            }

            setFormData(prev => ({ ...prev, appointTime: '' }));
        } else {
            setAvailableTimeSlots([]);
        }
    }, [formData.appointDate, doctorInfo]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.appointTime) {
            alert('กรุณาเลือกเวลาที่ต้องการนัดหมาย');
            return;
        }

        setLoading(true);

        const payload = {
            patientId: localStorage.getItem('patientId'),
            doctorId: formData.doctorId,
            insuranceId: useInsurance ? formData.insuranceId : '',
            appointDate: formData.appointDate,
            appointTime: formData.appointTime,
            symptoms: formData.symptoms
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/appointments`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessQueue(data.queueNumber);
                window.dispatchEvent(new Event('updateNotifications'));
            } else {
                alert(data.message || 'เกิดข้อผิดพลาดในการจองคิว');
            }
        } catch (error) {
            console.error('Submit Error:', error);
            alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        } finally {
            setLoading(false);
        }
    };

    const handleResetForm = () => {
        setSuccessQueue(null);
        setFormData({
            departmentId: '', doctorId: '', insuranceId: '',
            appointDate: '', appointTime: '', symptoms: ''
        });
        setUseInsurance(false);
        setDoctorInfo(null);
        setAvailableTimeSlots([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // แสดงหน้าจอเมื่อจองสำเร็จ
    if (successQueue) {
        return (
            <div className="max-w-md mx-4 sm:mx-auto mt-6 md:mt-10 p-6 md:p-8 bg-white rounded-3xl shadow-sm border border-green-100 text-center animate-fade-in">
                <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">จองคิวสำเร็จ!</h2>
                <p className="text-sm md:text-base text-gray-500 mb-6">กรุณารอการอนุมัติจากเจ้าหน้าที่</p>
                <div className="bg-green-50 rounded-2xl p-6 mb-6">
                    <p className="text-sm text-green-600 font-medium mb-1">หมายเลขคิวของคุณ</p>
                    <p className="text-4xl font-black text-green-700">{successQueue}</p>
                </div>
                <button onClick={handleResetForm} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all">
                    กลับสู่หน้าจองคิว
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-4 md:mx-auto mt-4 md:mt-10 p-5 md:p-8 bg-white rounded-3xl shadow-sm border border-gray-100 animate-fade-in">
            <div className="mb-6 md:mb-8 border-b pb-4 md:pb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Calendar className="text-blue-600" /> นัดหมายแพทย์
                </h2>
                <p className="text-sm md:text-base text-gray-500 mt-2">กรอกข้อมูลด้านล่างเพื่อทำการจองคิวล่วงหน้า</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                {/* แผนกและแพทย์ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">แผนกที่ต้องการตรวจ</label>
                        <select name="departmentId" value={formData.departmentId} onChange={handleChange} required className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm md:text-base">
                            <option value="">-- เลือกแผนก --</option>
                            {departments.map(dep => (
                                <option key={dep.Department_ID} value={dep.Department_ID}>{dep.Department_Name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">แพทย์</label>
                        <select name="doctorId" value={formData.doctorId} onChange={handleChange} required disabled={!formData.departmentId} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-50 text-sm md:text-base">
                            <option value="">-- เลือกแพทย์ --</option>
                            {doctors.map(doc => (
                                <option key={doc.Doctor_ID} value={doc.Doctor_ID}>{doc.Doctor_Name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ข้อมูลหมอ */}
                {doctorInfo && (
                    <div className="p-4 bg-blue-50 rounded-xl text-xs md:text-sm text-blue-700 flex flex-col gap-3">
                        {doctorInfo.specialties?.length > 0 && (
                            <div className="flex items-start gap-2">
                                <User size={18} className="mt-0.5 shrink-0" />
                                <p><strong>ความเชี่ยวชาญ:</strong> {doctorInfo.specialties.join(', ')}</p>
                            </div>
                        )}
                        <div className="flex items-start gap-2">
                            <Calendar size={18} className="mt-0.5 shrink-0 text-blue-500" />
                            <p>
                                <strong className="text-blue-800">วันเข้าตรวจ:</strong>{' '}
                                {doctorInfo.schedules?.length > 0
                                    ? [...new Set(doctorInfo.schedules.map(s => s.Day_of_Week.trim()))].map(day => {
                                        const thaiDays = { Sunday: 'อาทิตย์', Monday: 'จันทร์', Tuesday: 'อังคาร', Wednesday: 'พุธ', Thursday: 'พฤหัสบดี', Friday: 'ศุกร์', Saturday: 'เสาร์' };
                                        return thaiDays[day] || day;
                                    }).join(', ')
                                    : 'ไม่มีข้อมูลตารางตรวจ'}
                            </p>
                        </div>
                    </div>
                )}

                {/* วันและเวลา */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Calendar size={16} /> วันที่นัดหมาย</label>
                        <input type="date" name="appointDate" value={formData.appointDate} onChange={handleChange} required className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm md:text-base" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Clock size={16} /> เวลา</label>
                        <select name="appointTime" value={formData.appointTime} onChange={handleChange} required disabled={availableTimeSlots.length === 0} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-50 text-sm md:text-base">
                            <option value="">-- เลือกเวลา --</option>
                            {availableTimeSlots.map(slot => (
                                <option key={slot} value={slot}>{slot} น.</option>
                            ))}
                        </select>
                        {formData.appointDate && doctorInfo && availableTimeSlots.length === 0 && (
                            <div className="flex items-center gap-1 text-red-500 text-xs md:text-sm mt-2 font-medium">
                                <AlertCircle size={14} /> แพทย์ไม่เข้าตรวจในวันดังกล่าว
                            </div>
                        )}
                    </div>
                </div>

                {/* สิทธิการรักษา */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <ShieldPlus size={18} className="text-blue-600" /> สิทธิการรักษา / ประกันสุขภาพ
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="insurance_choice" checked={!useInsurance} onChange={() => { setUseInsurance(false); setFormData({ ...formData, insuranceId: '' }); }} className="w-4 h-4 text-blue-600" />
                            <span className="text-sm md:text-base text-gray-700">ไม่ใช้สิทธิ</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="insurance_choice" checked={useInsurance} onChange={() => setUseInsurance(true)} className="w-4 h-4 text-blue-600" />
                            <span className="text-sm md:text-base text-gray-700">ใช้สิทธิ / ประกัน</span>
                        </label>
                    </div>
                    {useInsurance && (
                        <input type="text" name="insuranceId" value={formData.insuranceId} onChange={handleChange} required placeholder="โปรดระบุประกันสังคม, เลขกรมธรรม์..." className="w-full p-3 rounded-xl border border-gray-300 outline-none text-sm md:text-base mt-2" />
                    )}
                </div>

                {/* อาการ */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><FileText size={16} /> อาการเบื้องต้น</label>
                    <textarea name="symptoms" value={formData.symptoms} onChange={handleChange} rows="3" required placeholder="อธิบายอาการ..." className="w-full p-3 rounded-xl border border-gray-200 outline-none resize-none text-sm md:text-base"></textarea>
                </div>

                <button type="submit" disabled={loading || (formData.appointDate && availableTimeSlots.length === 0)} className={`w-full py-3 md:py-4 rounded-xl font-bold text-white transition-all text-base md:text-lg ${ (loading || (formData.appointDate && availableTimeSlots.length === 0)) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg' }`}>
                    {loading ? 'กำลังดำเนินการ...' : 'ยืนยันการจองคิว'}
                </button>
            </form>
        </div>
    );
};

export default Appointment;