import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../api/client';

export default function LoginPage() {
    const { login } = useAuth();
    const toast = useToast();

    // 'check-phone' | 'login' | 'register' | 'activate'
    const [mode, setMode] = useState('check-phone');
    const [phone, setPhone] = useState('');

    const [loginForm, setLoginForm] = useState({ userId: '', password: '' });
    const [registerForm, setRegisterForm] = useState({ firstName: '', lastName: '', password: '', confirmPassword: '' });
    const [activateForm, setActivateForm] = useState({ userId: '', firstName: '', lastName: '', password: '', confirmPassword: '' });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const onCheckPhone = async (event) => {
        event.preventDefault();
        
        const phoneRegex = /^0\d{9}$/;
        const isPotentialId = !/^\d+$/.test(phone); // If it contains letters, it's probably an ID

        if (!isPotentialId && !phoneRegex.test(phone)) {
            toast.error('Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0');
            return;
        }

        if (!phone) {
            toast.error('Vui lòng nhập số điện thoại hoặc ID');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await apiClient.post('/auth/check-phone', { phone });
            if (!res.exists) {
                // If ID doesn't exist, it must be treated as a phone for registration
                if (!phoneRegex.test(phone)) {
                    toast.error('Tài khoản không tồn tại. Để đăng ký mới, vui lòng nhập SĐT hợp lệ (10 chữ số, bắt đầu bằng 0)');
                    return;
                }
                setMode('register');
            } else if (res.isDummy) {
                setActivateForm((prev) => ({ ...prev, userId: res.userId }));
                setMode('activate');
            } else {
                setLoginForm((prev) => ({ ...prev, userId: res.userId })); 
                setMode('login');
            }
        } catch (error) {
            toast.error(error.message || 'Lỗi kết nối đến máy chủ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onLogin = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await login({ userId: loginForm.userId, password: loginForm.password });
            toast.success('Đăng nhập thành công');
        } catch (error) {
            toast.error('Sai thông tin đăng nhập');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onRegister = async (event) => {
        event.preventDefault();

        if (registerForm.password !== registerForm.confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }

        setIsSubmitting(true);
        try {
            const newUserId = `C${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
            const res = await apiClient.post('/auth/register', {
                userId: newUserId,
                phone,
                password: registerForm.password,
                firstName: registerForm.firstName,
                lastName: registerForm.lastName
            });
            toast.success(res.message);
            setLoginForm({ userId: res.userId, password: '' });
            setMode('login');
        } catch (error) {
            toast.error(error.message || 'Đăng ký thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onActivate = async (event) => {
        event.preventDefault();

        if (activateForm.password !== activateForm.confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await apiClient.post('/auth/activate-dummy', {
                userId: activateForm.userId,
                password: activateForm.password,
                firstName: activateForm.firstName,
                lastName: activateForm.lastName
            });
            toast.success(res.message);
            setLoginForm({ userId: activateForm.userId, password: '' });
            setMode('login');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto mt-10 w-full max-w-md panel">
            {mode === 'check-phone' && (
                <>
                    <h2 className="font-display text-2xl font-bold text-slate-900">Chào mừng</h2>
                    <p className="mt-1 text-sm text-slate-600">Nhập SĐT hoặc ID người dùng để tiếp tục.</p>

                    <form className="mt-5 space-y-3" onSubmit={onCheckPhone}>
                        <input
                            className="input"
                            placeholder="SĐT hoặc ID"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                        <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Đang kiểm tra...' : 'Tiếp tục'}
                        </button>
                    </form>
                </>
            )}

            {mode === 'login' && (
                <>
                    <h2 className="font-display text-2xl font-bold text-slate-900">Đăng nhập</h2>
                    <p className="mt-1 text-sm text-slate-600">Chào mừng bạn trở lại.</p>

                    <form className="mt-5 space-y-3" onSubmit={onLogin}>
                        <input
                            className="input bg-slate-50 text-slate-500"
                            value={loginForm.userId}
                            readOnly
                        />
                        <input
                            className="input"
                            type="password"
                            placeholder="Mật khẩu"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                            required
                        />
                        <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </button>
                    </form>
                    <div className="mt-4 text-center">
                        <button className="text-sm font-semibold text-blue-600" onClick={() => setMode('check-phone')} type="button">
                            Quay lại
                        </button>
                    </div>
                </>
            )}

            {mode === 'register' && (
                <>
                    <h2 className="font-display text-2xl font-bold text-slate-900">Đăng ký tài khoản</h2>
                    <p className="mt-1 text-sm text-slate-600">Số điện thoại chưa được đăng ký, vui lòng tạo tài khoản mới.</p>

                    <form className="mt-5 space-y-3" onSubmit={onRegister}>
                        <input
                            className="input bg-slate-50 text-slate-500"
                            value={phone}
                            readOnly
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                className="input"
                                placeholder="Họ"
                                value={registerForm.lastName}
                                onChange={(e) => setRegisterForm((prev) => ({ ...prev, lastName: e.target.value }))}
                            />
                            <input
                                className="input"
                                placeholder="Tên *"
                                value={registerForm.firstName}
                                onChange={(e) => setRegisterForm((prev) => ({ ...prev, firstName: e.target.value }))}
                                required
                            />
                        </div>
                        <input
                            className="input"
                            type="password"
                            placeholder="Mật khẩu *"
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                            required
                        />
                        <input
                            className="input"
                            type="password"
                            placeholder="Xác nhận mật khẩu *"
                            value={registerForm.confirmPassword}
                            onChange={(e) => setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                            required
                        />
                        <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Đang xử lý...' : 'Đăng ký'}
                        </button>
                    </form>
                    <div className="mt-4 text-center">
                        <button className="text-sm font-semibold text-blue-600" onClick={() => setMode('check-phone')} type="button">
                            Quay lại
                        </button>
                    </div>
                </>
            )}

            {mode === 'activate' && (
                <>
                    <h2 className="font-display text-2xl font-bold text-slate-900">Kích hoạt tài khoản</h2>
                    <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        <strong>Lưu ý:</strong> Số điện thoại này đã được tạo tài khoản tự động khi bạn nhận đơn hàng.
                        Vui lòng đặt mật khẩu để kích hoạt tài khoản.
                    </div>

                    <form className="mt-5 space-y-3" onSubmit={onActivate}>
                        <input
                            className="input bg-slate-50 text-slate-500"
                            value={phone}
                            readOnly
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                className="input"
                                placeholder="Họ"
                                value={activateForm.lastName}
                                onChange={(e) => setActivateForm((prev) => ({ ...prev, lastName: e.target.value }))}
                            />
                            <input
                                className="input"
                                placeholder="Tên *"
                                value={activateForm.firstName}
                                onChange={(e) => setActivateForm((prev) => ({ ...prev, firstName: e.target.value }))}
                                required
                            />
                        </div>
                        <input
                            className="input"
                            type="password"
                            placeholder="Mật khẩu mới *"
                            value={activateForm.password}
                            onChange={(e) => setActivateForm((prev) => ({ ...prev, password: e.target.value }))}
                            required
                        />
                        <input
                            className="input"
                            type="password"
                            placeholder="Xác nhận mật khẩu *"
                            value={activateForm.confirmPassword}
                            onChange={(e) => setActivateForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                            required
                        />
                        <button className="btn-primary w-full" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Đang xử lý...' : 'Kích hoạt tài khoản'}
                        </button>
                    </form>
                    <div className="mt-4 text-center">
                        <button className="text-sm font-semibold text-blue-600" onClick={() => setMode('check-phone')} type="button">
                            Quay lại
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
