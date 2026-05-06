import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function AccountManager({ user }) {
    const toast = useToast();
    const { refreshUser } = useAuth();
    const [profile, setProfile] = useState({
        userId: user?.userId || '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: user?.phone || ''
    });
    const [password, setPassword] = useState({
        userId: user?.userId || '',
        oldPassword: '',
        newPassword: ''
    });
    const [payments, setPayments] = useState([]);
    const [walletForm, setWalletForm] = useState({ amount: '', loading: false });
    const [showTopupModal, setShowTopupModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);

    const formatAmount = (amount) => {
        const value = Number(amount || 0);
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    useEffect(() => {
        if (!user) {
            return;
        }

        setProfile({
            userId: user.userId,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || ''
        });

        setPassword((prev) => ({ ...prev, userId: user.userId }));
        
        loadPayments(user.userId);
    }, [user]);

    const loadPayments = async (userId) => {
        try {
            const res = await apiClient.get(`/customer/payments?senderId=${userId}`);
            setPayments(res.data);
        } catch (err) {
            console.error('Failed to fetch payments:', err);
        }
    };

    const updateProfile = async (event) => {
        event.preventDefault();
        try {
            await apiClient.put('/account/profile', profile);
            await refreshUser();
            toast.success('Cập nhật tài khoản thành công');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const changePassword = async (event) => {
        event.preventDefault();
        try {
            await apiClient.post('/account/change-password', password);
            toast.success('Đổi mật khẩu thành công');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const submitTopup = async (event) => {
        event.preventDefault();
        const amount = Number(walletForm.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error('Số tiền nạp không hợp lệ');
            return;
        }

        setWalletForm((prev) => ({ ...prev, loading: true }));
        try {
            await apiClient.post('/account/topup', { userId: user.userId, amount });
            toast.success('Nạp tiền thành công');
            setWalletForm({ amount: '', loading: false });
            setShowTopupModal(false);
            await refreshUser();
            loadPayments(user.userId);
        } catch (error) {
            setWalletForm((prev) => ({ ...prev, loading: false }));
            toast.error(error.message);
        }
    };

    const submitWithdraw = async (event) => {
        event.preventDefault();
        const amount = Number(walletForm.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error('Số tiền rút không hợp lệ');
            return;
        }

        setWalletForm((prev) => ({ ...prev, loading: true }));
        try {
            await apiClient.post('/account/withdraw', { userId: user.userId, amount });
            toast.success('Rút tiền thành công');
            setWalletForm({ amount: '', loading: false });
            setShowWithdrawModal(false);
            await refreshUser();
            loadPayments(user.userId);
        } catch (error) {
            setWalletForm((prev) => ({ ...prev, loading: false }));
            toast.error(error.message);
        }
    };

    return (
        <>
        <section className="panel">
            <div className="grid gap-5 lg:grid-cols-2">
                <div className="flex flex-col space-y-2 rounded-xl border border-slate-200 p-4">
                    <p className="mb-2 font-semibold text-slate-700">Quản lý tài khoản</p>
                    <div className="flex-1 space-y-6">
                        <form className="space-y-2 rounded-xl border border-slate-200 p-4" onSubmit={updateProfile}>
                            <p className="mb-2 font-semibold text-slate-700">Thông tin cá nhân</p>
                            <input
                            className="input"
                            placeholder="Mã người dùng"
                            value={profile.userId}
                            readOnly
                        />
                        <input
                            className="input"
                            placeholder="Họ"
                            value={profile.lastName}
                            onChange={(e) => setProfile((prev) => ({ ...prev, lastName: e.target.value }))}
                            required
                        />
                        <input
                            className="input"
                            placeholder="Tên"
                            value={profile.firstName}
                            onChange={(e) => setProfile((prev) => ({ ...prev, firstName: e.target.value }))}
                            required
                        />
                        <input
                            className="input bg-slate-50 text-slate-500"
                            placeholder="Số điện thoại"
                            value={profile.phone}
                            readOnly
                        />
                        <button className="btn-primary w-full" type="submit">
                            Cập nhật thông tin
                        </button>
                    </form>

                    <form className="space-y-2 rounded-xl border border-slate-200 p-4" onSubmit={changePassword}>
                        <p className="mb-2 font-semibold text-slate-700">Đổi mật khẩu</p>
                        <input
                            className="input hidden"
                            placeholder="Mã người dùng"
                            value={password.userId}
                            readOnly
                        />
                        <input
                            className="input"
                            type="password"
                            placeholder="Mật khẩu hiện tại"
                            value={password.oldPassword}
                            onChange={(e) => setPassword((prev) => ({ ...prev, oldPassword: e.target.value }))}
                            required
                        />
                        <input
                            className="input"
                            type="password"
                            placeholder="Mật khẩu mới"
                            value={password.newPassword}
                            onChange={(e) => setPassword((prev) => ({ ...prev, newPassword: e.target.value }))}
                            required
                        />
                        <button className="btn-secondary w-full" type="submit">
                            Xác nhận đổi mật khẩu
                        </button>
                    </form>
                    </div>
                </div>

                <div className="flex flex-col space-y-2 rounded-xl border border-slate-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="font-semibold text-slate-700">Lịch sử thanh toán</p>
                        <div className="flex gap-2">
                            <button 
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700" 
                                onClick={() => { setWalletForm({ amount: '', loading: false }); setShowTopupModal(true); }}
                            >
                                Nạp tiền
                            </button>
                            <button 
                                className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-700" 
                                onClick={() => { setWalletForm({ amount: '', loading: false }); setShowWithdrawModal(true); }}
                            >
                                Rút tiền
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto rounded-lg border border-slate-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-100 text-left">
                                <tr>
                                    <th className="px-3 py-2">Mã TT</th>
                                    <th className="px-3 py-2">Loại</th>
                                    <th className="px-3 py-2">Trạng thái</th>
                                    <th className="px-3 py-2">Số tiền</th>
                                    <th className="px-3 py-2">Thời gian</th>
                                    <th className="px-3 py-2">Tham chiếu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p) => (
                                    <tr key={p.Payment_ID} className="border-t border-slate-200">
                                        <td className="px-3 py-2">{p.Payment_ID}</td>
                                        <td className="px-3 py-2">{p.Type || '-'}</td>
                                        <td className="px-3 py-2">{p.Status || '-'}</td>
                                        <td className={`px-3 py-2 font-semibold ${Number(p.Amount) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatAmount(p.Amount)}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-500">
                                            {p.Payment_Time ? new Date(p.Payment_Time).toLocaleString('vi-VN') : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-500">
                                            {p.Order_ID || p.Shipment_ID || '-'}
                                        </td>
                                    </tr>
                                ))}
                                {payments.length === 0 && (
                                    <tr>
                                        <td className="px-3 py-4 text-center text-slate-500" colSpan={6}>
                                            Chưa có lịch sử thanh toán
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>

            {showTopupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
                        <h3 className="mb-4 text-lg font-bold text-slate-800">Nạp tiền vào ví</h3>
                        <form onSubmit={submitTopup} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Số tiền (VNĐ)</label>
                                <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    step="1000"
                                    placeholder="Nhập số tiền nạp"
                                    value={walletForm.amount}
                                    onChange={(e) => setWalletForm((prev) => ({ ...prev, amount: e.target.value }))}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    className="rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-200"
                                    type="button"
                                    onClick={() => setShowTopupModal(false)}
                                    disabled={walletForm.loading}
                                >
                                    Hủy
                                </button>
                                <button 
                                    className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50" 
                                    type="submit" 
                                    disabled={walletForm.loading}
                                >
                                    Xác nhận nạp
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
                        <h3 className="mb-4 text-lg font-bold text-slate-800">Rút tiền từ ví</h3>
                        <form onSubmit={submitWithdraw} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Số tiền (VNĐ)</label>
                                <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    step="1000"
                                    placeholder="Nhập số tiền rút"
                                    value={walletForm.amount}
                                    onChange={(e) => setWalletForm((prev) => ({ ...prev, amount: e.target.value }))}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    className="rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-600 transition hover:bg-slate-200"
                                    type="button"
                                    onClick={() => setShowWithdrawModal(false)}
                                    disabled={walletForm.loading}
                                >
                                    Hủy
                                </button>
                                <button 
                                    className="rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50" 
                                    type="submit" 
                                    disabled={walletForm.loading}
                                >
                                    Xác nhận rút
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
