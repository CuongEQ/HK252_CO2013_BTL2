import { Link, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import VisualizerSimulator from './pages/VisualizerSimulator';
import { useAuth } from './context/AuthContext';
import { apiClient } from './api/client';

function roleLabel(role) {
    const labels = {
        admin: 'Quản trị hệ thống',
        customer: 'Khách hàng',
        driver: 'Tài xế',
        staff: 'Nhân viên bưu cục',
        manager: 'Quản lý bưu cục',
        unknown: 'Vai trò chưa xác định'
    };

    return labels[role] || labels.unknown;
}

export default function App() {
    const { user, isAuthenticated, logout, refreshUser, updateUser } = useAuth();

    const formatCurrency = (value) => {
        const numeric = Number(value || 0);
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numeric);
    };

    const refreshTier = async () => {
        if (!user?.userId) return;

        try {
            const res = await apiClient.post('/customer/refresh-tier', { customerId: user.userId });
            updateUser({ customerTier: res.data?.tier || user.customerTier });
            await refreshUser();
        } catch (error) {
            console.error('Failed to refresh tier:', error);
        }
    };

    return (
        <div className="min-h-screen px-4 py-6 md:px-8">
            <header className="mx-auto mb-6 flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/80 px-6 py-4 shadow-panel backdrop-blur-sm">
                <div>
                    <h1 className="font-display text-2xl font-bold text-slate-900">Hệ thống Quản lý Vận chuyển</h1>
                    <p className="text-sm text-slate-600">Theo dõi đơn hàng, điều phối vận hành và quản trị dữ liệu tập trung</p>
                </div>
                {isAuthenticated ? (
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold">{user.lastName} {user.firstName}</p>
                                {user.customerTier ? (
                                    <button
                                        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                        onClick={refreshTier}
                                        type="button"
                                        title="Làm mới hạng thành viên"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                            <path d="M20 12a8 8 0 0 1-14.31 4.74" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M4 12A8 8 0 0 1 18.31 7.26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M20 4v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M4 20v-4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                ) : null}
                            </div>
                            <p className="text-xs text-slate-600">{user.userId} • {roleLabel(user.primaryRole)}</p>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                <span 
                                    className="rounded-full bg-white px-2 py-0.5 text-slate-700 cursor-help"
                                    title={user.createDate ? `Ngày tham gia: ${new Date(user.createDate).toLocaleDateString('vi-VN')}` : 'Ngày tham gia: -'}
                                >
                                    Hạng: {user.customerTier || '-'}
                                </span>
                                <span className="rounded-full bg-white px-2 py-0.5 text-emerald-700">
                                    Số dư: {formatCurrency(user.balance)}
                                </span>
                            </div>
                        </div>
                        <nav className="flex gap-3 items-center">
                            <Link className="btn-primary" to="/">
                                Bảng điều khiển
                            </Link>
                            <Link className="text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg" to="/visualizer">
                                Visualizer 🌟
                            </Link>
                            <button className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white" onClick={logout} type="button">
                                Đăng xuất
                            </button>
                        </nav>
                    </div>
                ) : null}
            </header>

            <main className="mx-auto w-full max-w-7xl">
                <Routes>
                    {isAuthenticated ? (
                        <>
                            <Route path="/" element={<HomePage user={user} />} />
                            <Route path="/visualizer" element={<VisualizerSimulator />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </>
                    ) : (
                        <>
                            <Route path="/" element={<LoginPage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </>
                    )}
                </Routes>
            </main>
        </div>
    );
}
