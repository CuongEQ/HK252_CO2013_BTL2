import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';

function formatDateTime(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('vi-VN');
}

export default function ManagerPanel({ user }) {
    const toast = useToast();
    const [hubId] = useState(user?.hubId || '');
    const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'staff', 'ranking'
    
    // Data states
    const [orders, setOrders] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [capacity, setCapacity] = useState(null);
    const [rankingData, setRankingData] = useState([]);
    const [rankingMonth, setRankingMonth] = useState(new Date().getMonth() + 1);
    const [rankingYear, setRankingYear] = useState(new Date().getFullYear());

    // Filter states
    const [searchOrder, setSearchOrder] = useState('');
    const [searchStaff, setSearchStaff] = useState('');
    const [sortBy, setSortBy] = useState('arrival_desc');

    // Modal states
    const [showAddStaff, setShowAddStaff] = useState(false);
    const [showEditCapacity, setShowEditCapacity] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);

    // Form states
    const [addStaffForm, setAddStaffForm] = useState({
        phone: '',
        role: 'Nhân viên',
        memberType: 'staff' // 'staff' or 'driver'
    });
    const [newCapacity, setNewCapacity] = useState('');

    useEffect(() => {
        if (hubId) {
            loadInitialData();
            loadRankingData(rankingMonth, rankingYear);
        }
    }, [hubId]);

    const loadRankingData = async (month, year) => {
        try {
            const res = await apiClient.get(`/staff/hub-performance?month=${month}&year=${year}`);
            setRankingData(res.data);
        } catch (error) {
            toast.error('Lỗi tải bảng xếp hạng: ' + error.message);
        }
    };

    const handleRankingFilter = (e) => {
        e.preventDefault();
        loadRankingData(rankingMonth, rankingYear);
    };

    const loadInitialData = async () => {
        try {
            const [ordersRes, capacityRes, staffRes] = await Promise.all([
                apiClient.get(`/staff/hub-orders?hubId=${hubId}`),
                apiClient.get(`/staff/hub-capacity?hubId=${hubId}`),
                apiClient.get(`/staff/hub-staff?hubId=${hubId}`)
            ]);
            setOrders(ordersRes.data);
            setCapacity(capacityRes.data);
            setStaffList(staffRes.data);
            setNewCapacity(capacityRes.data.Max_Capacity);
        } catch (error) {
            toast.error('Lỗi tải dữ liệu: ' + error.message);
        }
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        try {
            const endpoint = addStaffForm.memberType === 'staff' ? '/staff/add-staff' : '/staff/add-driver';
            await apiClient.post(endpoint, { ...addStaffForm, hubId });
            toast.success(`Thêm ${addStaffForm.memberType === 'staff' ? 'nhân viên' : 'tài xế'} thành công`);
            setShowAddStaff(false);
            setAddStaffForm({ phone: '', role: 'Nhân viên', memberType: 'staff' });
            loadInitialData();
        } catch (error) {
            toast.error(error.message || 'Lỗi thêm thành viên');
        }
    };

    // ... (rest of the file remains same, but I'll update the modal part in another chunk if needed) ...


    const handleUpdateRole = async (userId, newRole) => {
        try {
            await apiClient.patch('/staff/role', { userId, role: newRole });
            toast.success('Cập nhật chức vụ thành công');
            setEditingStaff(null);
            loadInitialData();
        } catch (error) {
            toast.error('Lỗi cập nhật chức vụ');
        }
    };

    const handleDeleteStaff = async (userId) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa nhân viên ${userId} khỏi bưu cục?`)) return;
        try {
            await apiClient.delete(`/staff/${userId}`);
            toast.success('Đã xóa nhân viên');
            loadInitialData();
        } catch (error) {
            toast.error('Lỗi xóa nhân viên');
        }
    };

    const handleUpdateCapacity = async (e) => {
        e.preventDefault();
        const cap = parseInt(newCapacity);
        if (isNaN(cap) || cap < 0) {
            toast.error('Sức chứa không hợp lệ');
            return;
        }

        try {
            await apiClient.patch('/staff/hub-capacity', { hubId, maxCapacity: cap });
            toast.success('Cập nhật sức chứa thành công');
            setShowEditCapacity(false);
            loadInitialData();
        } catch (error) {
            toast.error('Lỗi cập nhật sức chứa');
        }
    };

    const filteredOrders = [...orders]
        .filter(o => o.Order_ID.toLowerCase().includes(searchOrder.toLowerCase()))
        .sort((a, b) => {
            switch (sortBy) {
                case 'arrival_desc': return new Date(b.Arrival || 0) - new Date(a.Arrival || 0);
                case 'arrival_asc': return new Date(a.Arrival || 0) - new Date(b.Arrival || 0);
                case 'departure_desc': return new Date(b.Departure || 0) - new Date(a.Departure || 0);
                case 'departure_asc': return new Date(a.Departure || 0) - new Date(b.Departure || 0);
                case 'status_asc': return String(a.Display_Status).localeCompare(String(b.Display_Status));
                default: return 0;
            }
        });

    const filteredStaff = staffList.filter(s => 
        s.User_ID.toLowerCase().includes(searchStaff.toLowerCase()) ||
        `${s.First_Name} ${s.Last_Name}`.toLowerCase().includes(searchStaff.toLowerCase()) ||
        s.Phone.includes(searchStaff)
    );

    return (
        <section className="space-y-6">
            {/* Header / Stats */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow-panel">
                    <h2 className="text-xl font-bold text-slate-900">Quản lý Bưu cục: {capacity?.Hub_Name || hubId}</h2>
                    <p className="text-slate-500 text-sm">Vai trò: Trưởng bưu cục</p>
                    <div className="mt-6 flex gap-4">
                        <button 
                            onClick={() => setActiveTab('orders')}
                            className={`flex-1 rounded-xl p-3 text-sm font-bold transition ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Quản lý Đơn hàng
                        </button>
                        <button 
                            onClick={() => setActiveTab('staff')}
                            className={`flex-1 rounded-xl p-3 text-sm font-bold transition ${activeTab === 'staff' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Quản lý Nhân viên
                        </button>
                        <button 
                            onClick={() => setActiveTab('ranking')}
                            className={`flex-1 rounded-xl p-3 text-sm font-bold transition ${activeTab === 'ranking' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Xếp hạng Bưu cục
                        </button>
                    </div>
                </div>

                <div className="group relative rounded-2xl bg-white p-6 shadow-panel">
                    <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-700">Tình trạng bưu cục</p>
                        <button 
                            onClick={() => setShowEditCapacity(true)}
                            className="text-xs font-bold text-blue-600 hover:underline"
                        >
                            Sửa sức chứa
                        </button>
                    </div>
                    {capacity && (
                        <div className="mt-4 space-y-4">
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-bold text-slate-900">{capacity.Current_Order_Count}</span>
                                <span className="text-slate-500">/ {capacity.Max_Capacity} đơn hàng</span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                                <div 
                                    className={`h-full transition-all ${capacity.usageRate > 0.9 ? 'bg-rose-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min(100, capacity.usageRate * 100)}%` }}
                                />
                            </div>
                            <p className="text-right text-sm font-medium text-slate-600">
                                Nhân lực hiện tại: {staffList.length} nhân viên
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Tab Content: Orders */}
            {activeTab === 'orders' && (
                <div className="rounded-2xl bg-white p-6 shadow-panel animate-in fade-in slide-in-from-bottom-4">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-slate-900">Toàn bộ đơn hàng tại HUB</h3>
                        <div className="flex flex-wrap gap-2">
                            <input
                                className="input w-64"
                                placeholder="Tìm mã đơn hàng..."
                                value={searchOrder}
                                onChange={(e) => setSearchOrder(e.target.value)}
                            />
                            <select 
                                className="input w-48" 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="arrival_desc">Giờ vào kho (Muộn hơn)</option>
                                <option value="arrival_asc">Giờ vào kho (Sớm hơn)</option>
                                <option value="departure_desc">Giờ xuất kho (Muộn hơn)</option>
                                <option value="departure_asc">Giờ xuất kho (Sớm hơn)</option>
                                <option value="status_asc">Theo trạng thái</option>
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-sm font-semibold text-slate-500">
                                    <th className="px-4 py-3">Mã đơn hàng</th>
                                    <th className="px-4 py-3">Giờ vào kho</th>
                                    <th className="px-4 py-3">Giờ xuất kho</th>
                                    <th className="px-4 py-3 text-right">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map((item) => (
                                    <tr key={item.Order_ID} className="border-b border-slate-50 transition hover:bg-slate-50/50">
                                        <td className="px-4 py-4 font-medium text-slate-900">{item.Order_ID}</td>
                                        <td className="px-4 py-4 text-slate-600 text-sm">{formatDateTime(item.Arrival)}</td>
                                        <td className="px-4 py-4 text-slate-600 text-sm">{formatDateTime(item.Departure)}</td>
                                        <td className="px-4 py-4 text-right">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                item.Display_Status === 'Đã giao hàng' ? 'bg-emerald-100 text-emerald-700' : 
                                                item.Display_Status === 'Đang giao hàng' ? 'bg-indigo-100 text-indigo-700' :
                                                item.Display_Status === 'Đã xuất kho' ? 'bg-amber-100 text-amber-700' :
                                                item.Display_Status === 'Đã nhập kho' ? 'bg-blue-100 text-blue-700' :
                                                item.Display_Status === 'Chờ lấy hàng' ? 'bg-purple-100 text-purple-700' :
                                                item.Display_Status === 'Chờ xác nhận' ? 'bg-slate-100 text-slate-500' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {item.Display_Status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab Content: Staff */}
            {activeTab === 'staff' && (
                <div className="rounded-2xl bg-white p-6 shadow-panel animate-in fade-in slide-in-from-bottom-4">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-slate-900">Danh sách nhân viên</h3>
                        <div className="flex gap-2">
                            <input
                                className="input w-64"
                                placeholder="Tìm tên, mã NV hoặc SĐT..."
                                value={searchStaff}
                                onChange={(e) => setSearchStaff(e.target.value)}
                            />
                            <button 
                                onClick={() => setShowAddStaff(true)}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                            >
                                + Thêm nhân viên
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-sm font-semibold text-slate-500">
                                    <th className="px-4 py-3">Mã NV</th>
                                    <th className="px-4 py-3">Họ Tên</th>
                                    <th className="px-4 py-3">Số điện thoại</th>
                                    <th className="px-4 py-3">Chức vụ</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStaff.map((s) => (
                                    <tr key={s.User_ID} className="border-b border-slate-50 transition hover:bg-slate-50/50">
                                        <td className="px-4 py-4 font-mono text-xs font-medium text-slate-900">{s.User_ID}</td>
                                        <td className="px-4 py-4 text-slate-900 font-semibold">{s.Last_Name} {s.First_Name}</td>
                                        <td className="px-4 py-4 text-slate-600">{s.Phone}</td>
                                        <td className="px-4 py-4">
                                            {editingStaff === s.User_ID ? (
                                                <select 
                                                    className="input py-1 px-2 text-xs w-32"
                                                    defaultValue={s.Role}
                                                    onChange={(e) => handleUpdateRole(s.User_ID, e.target.value)}
                                                    onBlur={() => setEditingStaff(null)}
                                                    autoFocus
                                                >
                                                    <option value="Nhân viên">Nhân viên</option>
                                                    <option value="Kế toán">Kế toán</option>
                                                    <option value="Điều phối">Điều phối</option>
                                                </select>
                                            ) : (
                                                <div className="flex items-center gap-2 group/role">
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                                        {s.Role}
                                                    </span>
                                                    <button 
                                                        onClick={() => setEditingStaff(s.User_ID)}
                                                        className="opacity-0 group-hover/role:opacity-100 text-[10px] font-bold text-blue-600"
                                                    >
                                                        Sửa
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <button 
                                                onClick={() => handleDeleteStaff(s.User_ID)}
                                                className="text-rose-500 hover:text-rose-700 font-bold text-sm"
                                            >
                                                Xóa
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab Content: Ranking */}
            {activeTab === 'ranking' && (
                <div className="rounded-2xl bg-white p-6 shadow-panel animate-in fade-in slide-in-from-bottom-4">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-slate-900">Bảng Xếp Hạng Bưu Cục</h3>
                        <form onSubmit={handleRankingFilter} className="flex gap-2">
                            <input
                                type="number"
                                min="1" max="12"
                                className="input w-24"
                                placeholder="Tháng"
                                value={rankingMonth}
                                onChange={e => setRankingMonth(e.target.value)}
                            />
                            <input
                                type="number"
                                min="2000" max="2100"
                                className="input w-24"
                                placeholder="Năm"
                                value={rankingYear}
                                onChange={e => setRankingYear(e.target.value)}
                            />
                            <button type="submit" className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-white transition hover:bg-amber-600">Lọc</button>
                        </form>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-sm font-semibold text-slate-500 bg-slate-50">
                                    <th className="px-4 py-3 w-16 text-center">Hạng</th>
                                    <th className="px-4 py-3">Mã Bưu cục</th>
                                    <th className="px-4 py-3">Tên Bưu cục</th>
                                    <th className="px-4 py-3 text-right">Đơn Giao Thành Công</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankingData.map((hub, index) => (
                                    <tr key={hub.Hub_ID} className={`border-b border-slate-50 transition hover:bg-slate-50/50 ${hub.Hub_ID === hubId ? 'bg-amber-50' : ''}`}>
                                        <td className="px-4 py-4 text-center font-bold">
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                        </td>
                                        <td className="px-4 py-4 font-mono font-medium text-slate-900">{hub.Hub_ID}</td>
                                        <td className="px-4 py-4 font-semibold text-slate-700">{hub.Hub_Name} {hub.Hub_ID === hubId && <span className="text-xs text-amber-600 ml-2">(Bạn)</span>}</td>
                                        <td className="px-4 py-4 text-right font-bold text-emerald-600">{hub.Total_Successful_Orders}</td>
                                    </tr>
                                ))}
                                {rankingData.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-8 text-center text-slate-500">Chưa có dữ liệu xếp hạng trong tháng này</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Staff Modal */}
            {showAddStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
                        <h3 className="mb-6 text-2xl font-bold text-slate-900">Thêm nhân viên</h3>
                        <form onSubmit={handleAddStaff} className="space-y-4">
                            <div className="flex gap-4 p-1 bg-slate-100 rounded-xl mb-4">
                                <button 
                                    type="button"
                                    onClick={() => setAddStaffForm({...addStaffForm, memberType: 'staff'})}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${addStaffForm.memberType === 'staff' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}
                                >
                                    Nhân viên
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setAddStaffForm({...addStaffForm, memberType: 'driver'})}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${addStaffForm.memberType === 'driver' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}
                                >
                                    Tài xế
                                </button>
                            </div>

                            <div>
                                <label className="label">Số điện thoại</label>
                                <input 
                                    className="input" 
                                    placeholder="Nhập số điện thoại..." 
                                    value={addStaffForm.phone}
                                    onChange={e => setAddStaffForm({...addStaffForm, phone: e.target.value})}
                                    required 
                                />
                            </div>
                            
                            {addStaffForm.memberType === 'staff' && (
                                <div>
                                    <label className="label">Chức vụ</label>
                                    <select 
                                        className="input"
                                        value={addStaffForm.role}
                                        onChange={e => setAddStaffForm({...addStaffForm, role: e.target.value})}
                                    >
                                        <option value="Nhân viên">Nhân viên</option>
                                        <option value="Kế toán">Kế toán</option>
                                        <option value="Điều phối">Điều phối</option>
                                    </select>
                                </div>
                            )}

                            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 italic">
                                * Nếu số điện thoại chưa có tài khoản, hệ thống sẽ tự động tạo một tài khoản chờ kích hoạt.
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowAddStaff(false)} className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 transition hover:bg-slate-200">Hủy</button>
                                <button type="submit" className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700">Xác nhận</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Capacity Modal */}
            {showEditCapacity && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
                        <h3 className="mb-6 text-2xl font-bold text-slate-900">Điều chỉnh sức chứa</h3>
                        <form onSubmit={handleUpdateCapacity} className="space-y-4">
                            <div>
                                <label className="label">Sức chứa tối đa (đơn hàng)</label>
                                <input 
                                    type="number"
                                    className="input" 
                                    value={newCapacity}
                                    onChange={e => setNewCapacity(e.target.value)}
                                    required 
                                />
                            </div>
                            
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowEditCapacity(false)} className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 transition hover:bg-slate-200">Hủy</button>
                                <button type="submit" className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700">Cập nhật</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
