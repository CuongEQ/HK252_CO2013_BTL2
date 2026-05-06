import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';

function formatDateTime(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('vi-VN');
}

function translateError(msg) {
    if (!msg) return 'Đã có lỗi xảy ra, vui lòng thử lại.';
    if (msg.includes('Đơn hàng không được gửi tại HUB này')) return 'Đơn hàng này không thuộc quyền quản lý của HUB hiện tại.';
    if (msg.includes('Đơn hàng không ở trạng thái hợp lệ')) return 'Trạng thái đơn hàng hiện tại không cho phép thực hiện thao tác này.';
    if (msg.includes('Hub capacity reached')) return 'Bưu cục đã đầy, không thể tiếp nhận thêm đơn hàng.';
    if (msg.includes('Duplicate entry')) return 'Dữ liệu đã tồn tại trong hệ thống.';
    if (msg.includes('foreign key constraint fails')) return 'Thông tin nhập vào không chính xác.';
    if (msg.includes('ER_SIGNAL_EXCEPTION')) {
        const match = msg.match(/MESSAGE_TEXT = '(.*?)'/);
        if (match) return match[1];
    }
    return msg;
}

function generateShipmentId() {
    return 'SHIP-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

export default function StaffPanel({ user }) {
    const toast = useToast();
    const [hubId] = useState(user?.hubId || '');
    const [hubOrders, setHubOrders] = useState([]);
    const [capacity, setCapacity] = useState(null);
    const [hubs, setHubs] = useState([]);
    const [monthlyBonus, setMonthlyBonus] = useState(0);

    // Filters and Sorting
    const [searchOrderId, setSearchOrderId] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    // Modals
    const [modal, setModal] = useState(null); // 'checkin', 'checkout', 'pickup', 'delivery'

    // Form states
    const [checkinForm, setCheckinForm] = useState({ type: 'order', id: '' });
    const [checkoutForm, setCheckoutForm] = useState({ orderIds: '', destinationHubId: '', driverId: '' });
    const [coordinateForm, setCoordinateForm] = useState({ orderIds: '', driverId: '' });

    useEffect(() => {
        if (hubId) {
            loadHubData();
            loadHubs();
        }
    }, [hubId]);

    const loadHubData = async () => {
        try {
            const [ordersResponse, capacityResponse, bonusResponse] = await Promise.all([
                apiClient.get(`/staff/hub-orders?hubId=${hubId}`),
                apiClient.get(`/staff/hub-capacity?hubId=${hubId}`),
                apiClient.get(`/staff/monthly-bonus?userId=${user.userId}`)
            ]);
            setHubOrders(ordersResponse.data);
            setCapacity(capacityResponse.data);
            if (bonusResponse.success) setMonthlyBonus(bonusResponse.bonus);
        } catch (error) {
            toast.error(translateError(error.message));
        }
    };

    const loadHubs = async () => {
        try {
            const res = await apiClient.get('/customer/hubs');
            setHubs(res.data);
        } catch (error) {
            toast.error('Không thể tải danh sách HUB');
        }
    };

    const handleCheckin = async (e) => {
        e.preventDefault();
        try {
            if (checkinForm.type === 'order') {
                await apiClient.post('/staff/checkin', { orderId: checkinForm.id, hubId });
            } else {
                await apiClient.post('/staff/checkin-shipment', { shipmentId: checkinForm.id, hubId });
            }
            toast.success('Nhập kho thành công');
            setModal(null);
            setCheckinForm({ type: 'order', id: '' });
            loadHubData();
        } catch (error) {
            toast.error(translateError(error.message));
        }
    };

    const handleCheckout = async (e) => {
        e.preventDefault();
        try {
            const orderIds = checkoutForm.orderIds.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
            if (orderIds.length === 0) throw new Error('Vui lòng nhập ít nhất một mã đơn hàng');

            await apiClient.post('/staff/checkout', {
                orderIds,
                hubId,
                destinationHubId: checkoutForm.destinationHubId,
                driverId: checkoutForm.driverId,
                shipmentId: generateShipmentId()
            });
            toast.success(`Đã xuất kho ${orderIds.length} đơn hàng`);
            setModal(null);
            setCheckoutForm({ orderIds: '', destinationHubId: '', driverId: '' });
            loadHubData();
        } catch (error) {
            toast.error(translateError(error.message));
        }
    };

    const handleCoordinate = async (e) => {
        e.preventDefault();
        try {
            const orderIds = coordinateForm.orderIds.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
            if (orderIds.length === 0) throw new Error('Vui lòng nhập ít nhất một mã đơn hàng');

            const endpoint = modal === 'pickup' ? '/staff/pickup-coordinate' : '/staff/delivery-coordinate';
            await apiClient.post(endpoint, {
                orderIds,
                driverId: coordinateForm.driverId
            });
            toast.success('Điều phối thành công');
            setModal(null);
            setCoordinateForm({ orderIds: '', driverId: '' });
            loadHubData();
        } catch (error) {
            toast.error(translateError(error.message));
        }
    };

    const displayedOrders = [...hubOrders]
        .filter((order) => {
            if (!searchOrderId.trim()) return true;
            return String(order.Order_ID || '').toLowerCase().includes(searchOrderId.trim().toLowerCase());
        })
        .sort((a, b) => {
            if (sortBy === 'newest') return (b.Order_ID || '').localeCompare(a.Order_ID || '');
            if (sortBy === 'oldest') return (a.Order_ID || '').localeCompare(b.Order_ID || '');
            if (sortBy === 'status') return String(a.Display_Status).localeCompare(String(b.Display_Status));
            return 0;
        });

    return (
        <section className="space-y-6">
            {/* Header and Capacity */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow-panel">
                    <h2 className="text-xl font-bold text-slate-900">Bưu cục: {capacity?.Hub_Name || hubId}</h2>
                    <p className="text-slate-500 text-sm">Mã định danh: {hubId}</p>
                    
                    <div className="mt-4 rounded-xl bg-indigo-50 p-4 border border-indigo-100">
                        <p className="text-xs font-semibold uppercase text-indigo-600 tracking-wider">Tiền thưởng đã nhận trong tháng</p>
                        <p className="text-2xl font-black text-indigo-700 mt-1">{monthlyBonus.toLocaleString('vi-VN')} đ</p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <button onClick={() => setModal('checkin')} className="rounded-xl bg-blue-600 p-3 text-sm font-bold text-white transition hover:bg-blue-700">
                            Nhập kho
                        </button>
                        <button onClick={() => setModal('checkout')} className="rounded-xl bg-emerald-600 p-3 text-sm font-bold text-white transition hover:bg-emerald-700">
                            Xuất kho
                        </button>
                        <button onClick={() => setModal('pickup')} className="rounded-xl bg-amber-500 p-3 text-sm font-bold text-white transition hover:bg-amber-600">
                            Điều phối Lấy
                        </button>
                        <button onClick={() => setModal('delivery')} className="rounded-xl bg-indigo-500 p-3 text-sm font-bold text-white transition hover:bg-indigo-600">
                            Điều phối Giao
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-panel">
                    <p className="font-semibold text-slate-700">Tình trạng bưu cục</p>
                    {capacity ? (
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
                                Hiệu suất sử dụng: {(capacity.usageRate * 100).toFixed(1)}%
                            </p>
                        </div>
                    ) : (
                        <p className="mt-4 text-slate-500 italic">Đang tải dữ liệu...</p>
                    )}
                </div>
            </div>

            {/* Orders Table */}
            <div className="rounded-2xl bg-white p-6 shadow-panel">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-slate-900">Danh sách quản lý đơn hàng</h3>
                    <div className="flex flex-wrap gap-2">
                        <input
                            className="input w-64"
                            placeholder="Tìm mã đơn hàng..."
                            value={searchOrderId}
                            onChange={(e) => setSearchOrderId(e.target.value)}
                        />
                        <select className="input w-48" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="newest">Mã giảm dần</option>
                            <option value="oldest">Mã tăng dần</option>
                            <option value="status">Theo trạng thái</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 text-sm font-semibold text-slate-500">
                                <th className="px-4 py-3">Mã đơn hàng</th>
                                <th className="px-4 py-3">Bưu cục đích</th>
                                <th className="px-4 py-3">Giờ vào kho</th>
                                <th className="px-4 py-3">Giờ xuất kho</th>
                                <th className="px-4 py-3 text-right">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedOrders.map((item) => (
                                <tr key={item.Order_ID} className="border-b border-slate-50 transition hover:bg-slate-50/50">
                                    <td className="px-4 py-4 font-medium text-slate-900">{item.Order_ID}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-700">{item.Destination_Hub_Name}</span>
                                            <span className="text-xs text-slate-400">{item.Destination_Hub_ID}</span>
                                        </div>
                                    </td>
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

            {/* Check-in Modal */}
            {modal === 'checkin' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 className="mb-4 text-xl font-bold text-slate-900">Xác nhận Nhập kho</h3>
                        <form onSubmit={handleCheckin} className="space-y-4">
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input type="radio" checked={checkinForm.type === 'order'} onChange={() => setCheckinForm({...checkinForm, type: 'order'})} />
                                    Theo Đơn hàng
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" checked={checkinForm.type === 'shipment'} onChange={() => setCheckinForm({...checkinForm, type: 'shipment'})} />
                                    Theo Chuyến (Shipment)
                                </label>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">
                                    {checkinForm.type === 'order' ? 'Mã đơn hàng' : 'Mã chuyến hàng'}
                                </label>
                                <input 
                                    className="input" 
                                    placeholder={checkinForm.type === 'order' ? 'ORD_...' : 'SHIP_...'} 
                                    value={checkinForm.id}
                                    onChange={(e) => setCheckinForm({ ...checkinForm, id: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setModal(null)} className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 transition hover:bg-slate-200">Hủy</button>
                                <button type="submit" className="flex-1 btn-primary py-3">Xác nhận Nhập</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            {modal === 'checkout' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 className="mb-4 text-xl font-bold text-slate-900">Xuất kho</h3>
                        <form onSubmit={handleCheckout} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Danh sách mã đơn hàng (mỗi mã một dòng hoặc cách nhau bởi dấu phẩy)</label>
                                <textarea 
                                    className="input h-32 resize-none" 
                                    placeholder="ORD_001&#10;ORD_002, ORD_003" 
                                    value={checkoutForm.orderIds}
                                    onChange={(e) => setCheckoutForm({ ...checkoutForm, orderIds: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">HUB Đích</label>
                                    <select className="input" value={checkoutForm.destinationHubId} onChange={(e) => setCheckoutForm({ ...checkoutForm, destinationHubId: e.target.value })} required>
                                        <option value="">Chọn HUB</option>
                                        {hubs.map(h => <option key={h.Hub_ID} value={h.Hub_ID}>{h.Hub_Name} ({h.Hub_ID})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold text-slate-700">Mã tài xế</label>
                                    <input className="input" placeholder="Mã tài xế" value={checkoutForm.driverId} onChange={(e) => setCheckoutForm({ ...checkoutForm, driverId: e.target.value })} required />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setModal(null)} className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 transition hover:bg-slate-200">Hủy</button>
                                <button type="submit" className="flex-1 rounded-xl bg-emerald-600 py-3 font-bold text-white transition hover:bg-emerald-700">Xác nhận Xuất kho</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Coordination Modal (Pickup / Delivery) */}
            {(modal === 'pickup' || modal === 'delivery') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <h3 className="mb-4 text-xl font-bold text-slate-900">
                            {modal === 'pickup' ? 'Điều phối Lấy hàng' : 'Điều phối Giao hàng'}
                        </h3>
                        <form onSubmit={handleCoordinate} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Danh sách mã đơn hàng (mỗi mã một dòng hoặc cách nhau bởi dấu phẩy)</label>
                                <textarea 
                                    className="input h-32 resize-none" 
                                    placeholder="ORD_001&#10;ORD_002" 
                                    value={coordinateForm.orderIds}
                                    onChange={(e) => setCoordinateForm({...coordinateForm, orderIds: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Mã tài xế phụ trách</label>
                                <input className="input" value={coordinateForm.driverId} onChange={(e) => setCoordinateForm({...coordinateForm, driverId: e.target.value})} required />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setModal(null)} className="flex-1 rounded-xl bg-slate-100 py-3 font-bold text-slate-600 transition hover:bg-slate-200">Hủy</button>
                                <button type="submit" className="flex-1 btn-primary py-3">Xác nhận Điều phối</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
