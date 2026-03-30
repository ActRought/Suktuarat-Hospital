import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, FileText, CheckCircle, ShieldPlus } from 'lucide-react';

// ==========================================
// 🛠️ ฟังก์ชันช่วยเหลือ (Helper Functions)
// ==========================================
// ฟังก์ชันสำหรับสร้างช่วงเวลา
const generateTimeSlots = (start, end) => {
    const slots = [];
    let current = new Date(`2024-01-01T${start}`);
    const stop = new Date(`2024-01-01T${end}`);

    while (current <= stop) {
        slots.push(current.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        current.setMinutes(current.getMinutes() + 30);
    }
    return slots;
};

const Appointment = () => {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [doctorInfo, setDoctorInfo] = useState(null);
    const [availableTimeSlots, setAvailableTimeSlots] = useState([]);

    // 🟢 State สำหรับสิทธิการรักษา
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

    // 1. เช็คสิทธิ์และดึงข้อมูลแผนกตอนโหลดหน้า
    useEffect(() => {
        const token = localStorage.getItem('token');
        const patientId = localStorage.getItem('patientId');

        if (!token || !patientId) {
            alert('กรุณาเข้าสู่ระบบก่อนจองคิว');
            navigate('/auth');
            return;
        }

        fetch('http://localhost:5000/api/departments')
            .then(res => res.json())
            .then(data => setDepartments(data))
            .catch(err => console.error('Error fetching departments:', err));
    }, [navigate]);

    // 2. ดึงข้อมูลหมอ เมื่อผู้ใช้เลือกแผนก
    useEffect(() => {
        if (formData.departmentId) {
            fetch(`http://localhost:5000/api/departments/${formData.departmentId}/doctors`)
                .then(res => res.json())
                .then(data => {
                    setDoctors(data);
                    setFormData(prev => ({ ...prev, doctorId: '' }));
                    setDoctorInfo(null);
                })
                .catch(err => console.error('Error fetching doctors:', err));
        } else {
            setDoctors([]);
        }
    }, [formData.departmentId]);

    // 3. ดึงข้อมูลตารางเวลาและความเชี่ยวชาญ เมื่อเลือกหมอ
    useEffect(() => {
        if (formData.doctorId) {
            fetch(`http://localhost:5000/api/doctors/${formData.doctorId}/info`)
                .then(res => res.json())
                .then(data => setDoctorInfo(data))
                .catch(err => console.error('Error fetching doctor info:', err));
        } else {
            setDoctorInfo(null);
        }
    }, [formData.doctorId]);

    // 4. สร้างช่วงเวลา เมื่อเลือก "วันที่" และ "หมอ"
    useEffect(() => {
        if (formData.appointDate && doctorInfo && doctorInfo.schedules) {
            const selectedDate = new Date(`${formData.appointDate}T00:00:00`);
            const dayIndex = selectedDate.getDay();

            const dayNamesMap = {
                0: ['sunday', 'อาทิตย์', 'sun'],
                1: ['monday', 'จันทร์', 'mon'],
                2: ['tuesday', 'อังคาร', 'tue'],
                3: ['wednesday', 'พุธ', 'wed'],
                4: ['thursday', 'พฤหัสบดี', 'thu'],
                5: ['friday', 'ศุกร์', 'fri'],
                6: ['saturday', 'เสาร์', 'sat']
            };

            const validDayNames = dayNamesMap[dayIndex];

            const daySchedule = doctorInfo.schedules.find(s =>
                s.Day_of_Week && validDayNames.includes(s.Day_of_Week.trim().toLowerCase())
            );

            if (daySchedule && daySchedule.Start_Time && daySchedule.End_Time) {
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
            // 🌟 1. ดึง Token จาก LocalStorage
            const token = localStorage.getItem('token');

            const response = await fetch('http://localhost:5000/api/appointments', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    // 🌟 2. แนบ Token ไปกับ Header ด้วย!
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

    // 🟢 ฟังก์ชันล้างค่าฟอร์มเพื่อกลับหน้าจองคิว
    const handleResetForm = () => {
        setSuccessQueue(null);
        setFormData({
            departmentId: '',
            doctorId: '',
            insuranceId: '',
            appointDate: '',
            appointTime: '',
            symptoms: ''
        });
        setUseInsurance(false);
        setDoctorInfo(null);
        setAvailableTimeSlots([]);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // เลื่อนหน้าจอกลับขึ้นบนสุด
    };

    if (successQueue) {
        return (
            <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-3xl shadow-sm border border-green-100 text-center animate-fade-in">
                <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">จองคิวสำเร็จ!</h2>
                <p className="text-gray-500 mb-6">กรุณารอการอนุมัติจากเจ้าหน้าที่</p>
                <div className="bg-green-50 rounded-2xl p-6 mb-6">
                    <p className="text-sm text-green-600 font-medium mb-1">หมายเลขคิวของคุณ</p>
                    <p className="text-4xl font-black text-green-700">{successQueue}</p>
                </div>
                <button
                    onClick={handleResetForm}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                    กลับสู่หน้าจองคิว
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-3xl shadow-sm border border-gray-100 animate-fade-in">
            <div className="mb-8 border-b pb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Calendar className="text-blue-600" /> นัดหมายแพทย์
                </h2>
                <p className="text-gray-500 mt-2">กรอกข้อมูลด้านล่างเพื่อทำการจองคิวล่วงหน้า</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* แผนกและแพทย์ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">แผนกที่ต้องการตรวจ</label>
                        <select name="departmentId" value={formData.departmentId} onChange={handleChange} required className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                            <option value="">-- เลือกแผนก --</option>
                            {departments.map(dep => (
                                <option key={dep.Department_ID} value={dep.Department_ID}>{dep.Department_Name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">แพทย์</label>
                        <select name="doctorId" value={formData.doctorId} onChange={handleChange} required disabled={!formData.departmentId} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-50">
                            <option value="">-- เลือกแพทย์ --</option>
                            {doctors.map(doc => (
                                <option key={doc.Doctor_ID} value={doc.Doctor_ID}>{doc.Doctor_Name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ข้อมูลความเชี่ยวชาญและวันเข้าตรวจของหมอ */}
                {doctorInfo && (
                    <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700 flex flex-col gap-3">
                        {doctorInfo.specialties && doctorInfo.specialties.length > 0 && (
                            <div className="flex items-start gap-2">
                                <User size={18} className="mt-0.5 shrink-0" />
                                <p><strong>ความเชี่ยวชาญ:</strong> {doctorInfo.specialties.join(', ')}</p>
                            </div>
                        )}

                        <div className="flex items-start gap-2">
                            <Calendar size={18} className="mt-0.5 shrink-0 text-blue-500" />
                            <p>
                                <strong className="text-blue-800">วันเข้าตรวจ:</strong>{' '}
                                {doctorInfo.schedules && doctorInfo.schedules.length > 0
                                    ? [...new Set(doctorInfo.schedules.map(s => s.Day_of_Week.trim()))].map(day => {
                                        const thaiDays = { Sunday: 'อาทิตย์', Monday: 'จันทร์', Tuesday: 'อังคาร', Wednesday: 'พุธ', Thursday: 'พฤหัสบดี', Friday: 'ศุกร์', Saturday: 'เสาร์' };
                                        return thaiDays[day] || day;
                                    }).join(', ')
                                    : 'ไม่มีข้อมูลตารางตรวจ'
                                }
                            </p>
                        </div>
                    </div>
                )}

                {/* วันและเวลา */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Calendar size={16} /> วันที่นัดหมาย</label>
                        <input type="date" name="appointDate" value={formData.appointDate} onChange={handleChange} required className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Clock size={16} /> เวลา</label>
                        <select
                            name="appointTime"
                            value={formData.appointTime}
                            onChange={handleChange}
                            required
                            disabled={availableTimeSlots.length === 0}
                            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-50"
                        >
                            <option value="">-- เลือกเวลา --</option>
                            {availableTimeSlots.map(slot => (
                                <option key={slot} value={slot}>{slot} น.</option>
                            ))}
                        </select>
                        {formData.appointDate && doctorInfo && availableTimeSlots.length === 0 && (
                            <p className="text-red-500 text-sm mt-2">* ขออภัย แพทย์ไม่เข้าตรวจในวันดังกล่าว</p>
                        )}
                    </div>
                </div>

                {/* สิทธิการรักษา */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <ShieldPlus size={18} className="text-blue-600" /> สิทธิการรักษา / ประกันสุขภาพ
                    </label>

                    <div className="flex gap-6 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="insurance_choice"
                                checked={!useInsurance}
                                onChange={() => {
                                    setUseInsurance(false);
                                    setFormData({ ...formData, insuranceId: '' });
                                }}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-gray-700">ไม่ใช้สิทธิ (ชำระเงินเอง)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="insurance_choice"
                                checked={useInsurance}
                                onChange={() => setUseInsurance(true)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-gray-700">ใช้สิทธิ / ประกัน</span>
                        </label>
                    </div>

                    {useInsurance && (
                        <input
                            type="text"
                            name="insuranceId"
                            value={formData.insuranceId}
                            onChange={handleChange}
                            required={useInsurance}
                            placeholder="โปรดระบุประกันสังคม, เลขกรมธรรม์..."
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none mt-2 transition-all"
                        />
                    )}
                </div>

                {/* อาการ */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><FileText size={16} /> อาการเบื้องต้น</label>
                    <textarea name="symptoms" value={formData.symptoms} onChange={handleChange} rows="3" required placeholder="อธิบายอาการเบื้องต้นของคุณ..." className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
                </div>

                <button
                    type="submit"
                    disabled={loading || availableTimeSlots.length === 0}
                    className={`w-full py-4 rounded-xl font-bold text-white transition-all text-lg ${(loading || availableTimeSlots.length === 0) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                        }`}
                >
                    {loading ? 'กำลังดำเนินการ...' : 'ยืนยันการจองคิว'}
                </button>
            </form>
        </div>
    );
};

export default Appointment;