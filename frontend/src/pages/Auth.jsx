import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Mail, Lock, User, CreditCard, Phone, Calendar, Users, AlertCircle } from 'lucide-react';

const Auth = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true); // สลับหน้าต่าง ล็อกอิน/สมัคร
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ข้อมูลฟอร์มทั้งหมด (ทั้ง Login และ Register)
    const [formData, setFormData] = useState({
        Name: '',
        IDCard13: '',
        Gender: 'ชาย',
        Birthday: '',
        Phone: '',
        Email: '',
        Password: ''
    });

    // อัปเดตค่าเมื่อพิมพ์ในช่องกรอกข้อมูล
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // เมื่อกดปุ่ม Submit ฟอร์ม
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // เลือก URL API ตามโหมดที่ใช้งานอยู่
        const url = isLogin
            ? 'http://localhost:5000/api/login'
            : 'http://localhost:5000/api/register';

        // เลือกข้อมูลที่จะส่ง (ถ้าล็อกอินส่งแค่ Email, Password / ถ้าสมัครส่งทั้งหมด)
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

            // ถ้ายิง API ไม่ผ่าน (เช่น รหัสผิด, อีเมลซ้ำ)
            if (!response.ok) {
                throw new Error(data.message || 'เกิดข้อผิดพลาดในการดำเนินการ');
            }

            // ถ้าทำสำเร็จ
            if (isLogin) {
                // --- กรณีเข้าสู่ระบบสำเร็จ ---
                // บันทึก Token และสิทธิ์ลงในเครื่อง
                localStorage.setItem('token', data.token);

                // 🟢 แก้ไขตรงนี้! เปลี่ยนจาก 'role' เป็น 'Role' (ตัว R ใหญ่) เพื่อให้ตรงกับ Navbar
                localStorage.setItem('Role', data.role);

                localStorage.setItem('patientId', data.patientId);

                // เตะไปหน้าตามสิทธิ์
                if (data.role === 'Admin' || data.role === 'admin') {
                    navigate('/admin'); // ถ้าเป็น Admin ไปหน้าจัดการ (แก้ path ให้ตรงกับที่สร้างไว้ ถ้าใช้ /dashboard ก็แก้เป็น /dashboard)
                } else {
                    navigate('/'); // ถ้าเป็น User ทั่วไป ไปหน้าจองคิว
                }
                // รีเฟรชหน้าต่าง 1 รอบเพื่ออัปเดต Navbar (เมนูเปลี่ยนตามสถานะ)
                window.location.reload();
            } else {
                // --- กรณีสมัครสมาชิกสำเร็จ ---
                alert('✅ สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
                setIsLogin(true); // สลับกลับไปหน้าเข้าสู่ระบบ
            }

        } catch (err) {
            setError(err.message);
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
                <p className="text-gray-500 mt-2">
                    {isLogin ? 'เข้าสู่ระบบเพื่อจัดการคิวและดูประวัติการรักษา' : 'ลงทะเบียนเพื่อเริ่มต้นใช้งานระบบจองคิวออนไลน์'}
                </p>
            </div>

            {/* กล่องแสดงข้อความ Error (ถ้ามี) */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 flex items-center gap-2 rounded-lg text-sm">
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* ฟิลด์เฉพาะตอนสมัครสมาชิก */}
                {!isLogin && (
                    <>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input type="text" name="Name" required placeholder="ชื่อ-นามสกุล" value={formData.Name} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input type="text" name="IDCard13" required maxLength="13" placeholder="เลขบัตรประชาชน 13 หลัก" value={formData.IDCard13} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <select name="Gender" value={formData.Gender} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white">
                                    <option value="ชาย">ชาย</option>
                                    <option value="หญิง">หญิง</option>
                                    <option value="อื่นๆ">อื่นๆ</option>
                                </select>
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input type="date" name="Birthday" required value={formData.Birthday} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input type="tel" name="Phone" required placeholder="เบอร์โทรศัพท์" value={formData.Phone} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </>
                )}

                {/* ฟิลด์ที่ใช้ทั้ง Login และ Register */}
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="email" name="Email" required placeholder="อีเมล" value={formData.Email} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="password" name="Password" required placeholder="รหัสผ่าน" value={formData.Password} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 rounded-xl font-bold text-white transition-all ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                        }`}
                >
                    {loading ? 'กำลังดำเนินการ...' : (isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก')}
                </button>
            </form>

            <div className="mt-6 text-center text-gray-500 text-sm">
                {isLogin ? "ยังไม่มีบัญชีใช่ไหม? " : "มีบัญชีอยู่แล้วใช่ไหม? "}
                <button
                    onClick={() => {
                        setIsLogin(!isLogin);
                        setError(''); // เคลียร์แจ้งเตือนเมื่อสลับหน้า
                    }}
                    className="text-blue-600 font-bold hover:underline"
                >
                    {isLogin ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
                </button>
            </div>
        </div>
    );
};

export default Auth;