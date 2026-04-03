import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Mail, Lock, User, CreditCard, Phone, Calendar, Users, AlertCircle } from 'lucide-react';

// ==========================================
// 🔗 ตั้งค่า API URL (Backend บน Render)
// ==========================================
const API_BASE_URL = import.meta.env.VITE_API_URL + '/api';

const Auth = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true); // สลับหน้าต่าง ล็อกอิน/สมัคร
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ข้อมูลฟอร์มทั้งหมด
    const [formData, setFormData] = useState({
        Name: '',
        IDCard13: '',
        Gender: 'ชาย',
        Birthday: '',
        Phone: '',
        Email: '',
        Password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // เปลี่ยนจาก localhost เป็น Render URL
        const url = isLogin
            ? `${API_BASE_URL}/login`
            : `${API_BASE_URL}/register`;

        const payload = isLogin
            ? { Email: formData.Email, Password: formData.Password }
            : formData;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'เกิดข้อผิดพลาดในการดำเนินการ');
            }

            if (isLogin) {
                // --- กรณีเข้าสู่ระบบสำเร็จ ---
                localStorage.setItem('token', data.token);
                
                // เก็บ Role (ตัว R ใหญ่) และค่าอื่นๆ เพื่อใช้ใน Navbar/หน้าอื่นๆ
                localStorage.setItem('Role', data.role);
                localStorage.setItem('patientId', data.patientId);
                localStorage.setItem('userName', data.name || '');

                // ตรวจสอบสิทธิ์และนำทาง
                const userRole = data.role?.toLowerCase();
                if (userRole === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/');
                }

                // รีเฟรชเพื่ออัปเดตสถานะ Login ทั่วทั้งแอป
                window.location.reload();
            } else {
                // --- กรณีสมัครสมาชิกสำเร็จ ---
                alert('✅ สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
                setIsLogin(true);
                // ล้างค่ารหัสผ่านหลังสมัครสำเร็จเพื่อความปลอดภัย
                setFormData(prev => ({ ...prev, Password: '' }));
            }

        } catch (err) {
            console.error('Auth Error:', err);
            setError(err.message === 'Failed to fetch' ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (Network Error)' : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 animate-fade-in">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-4">
                    {isLogin ? <LogIn size={32} /> : <UserPlus size={32} />}
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                    {isLogin ? 'ยินดีต้อนรับกลับมา' : 'สร้างบัญชีผู้ป่วยใหม่'}
                </h2>
                <p className="text-gray-500 mt-2 text-sm">
                    {isLogin ? 'เข้าสู่ระบบเพื่อจัดการคิวและดูประวัติการรักษา' : 'ลงทะเบียนเพื่อเริ่มต้นใช้งานระบบจองคิวออนไลน์'}
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 flex items-center gap-2 rounded-xl text-sm border border-red-100">
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                    <>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input type="text" name="Name" required placeholder="ชื่อ-นามสกุล" value={formData.Name} onChange={handleChange} className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 font-bold text-lg">*</span>
                        </div>
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input type="text" name="IDCard13" required maxLength="13" placeholder="เลขบัตรประชาชน 13 หลัก" value={formData.IDCard13} onChange={handleChange} className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 font-bold text-lg">*</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <select name="Gender" value={formData.Gender} onChange={handleChange} className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    <option value="ชาย">ชาย</option>
                                    <option value="หญิง">หญิง</option>
                                    <option value="อื่นๆ">อื่นๆ</option>
                                </select>
                                {/* ขยับ * สำหรับ Select ให้ห่างจากลูกศร Dropdown นิดหน่อย */}
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-red-500 font-bold text-lg pointer-events-none">*</span>
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input type="date" name="Birthday" required value={formData.Birthday} onChange={handleChange} className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 font-bold text-lg pointer-events-none">*</span>
                            </div>
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input type="tel" name="Phone" required placeholder="เบอร์โทรศัพท์" value={formData.Phone} onChange={handleChange} className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 font-bold text-lg">*</span>
                        </div>
                    </>
                )}

                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="email" name="Email" required placeholder="อีเมล" value={formData.Email} onChange={handleChange} className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 font-bold text-lg">*</span>
                </div>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="password" name="Password" required placeholder="รหัสผ่าน" value={formData.Password} onChange={handleChange} className="w-full pl-10 pr-8 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 font-bold text-lg">*</span>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3.5 rounded-xl font-bold text-white transition-all ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg active:scale-[0.98]'}`}
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            กำลังดำเนินการ...
                        </div>
                    ) : (isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก')}
                </button>
            </form>

            <div className="mt-8 text-center text-gray-500 text-sm border-t pt-6">
                {isLogin ? "ยังไม่มีบัญชีใช่ไหม? " : "มีบัญชีอยู่แล้วใช่ไหม? "}
                <button
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setError('');
                    }}
                    className="text-blue-600 font-bold hover:underline"
                >
                    {isLogin ? 'สมัครสมาชิกตอนนี้' : 'กลับไปหน้าเข้าสู่ระบบ'}
                </button>
            </div>
        </div>
    );
};

export default Auth;