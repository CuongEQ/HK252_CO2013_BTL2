import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function DriverPanel({ user }) {
    const toast = useToast();
    const [assignedOrders, setAssignedOrders] = useState([]);
    const [activeShipment, setActiveShipment] = useState(null);
    const [estimatedBonus, setEstimatedBonus] = useState(0);
    const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'shipment'

    useEffect(() => {
        if (user?.userId) {
            loadDriverData();
        }
    }, [user]);

    const loadDriverData = async () => {
        try {
            const [ordersRes, shipmentRes] = await Promise.all([
                apiClient.get(`/driver/assigned-orders?driverId=${user.userId}`),
                apiClient.get(`/driver/active-shipment?driverId=${user.userId}`)
            ]);
            
            if (ordersRes.success) {
                setAssignedOrders(ordersRes.data?.assignedOrders || []);
                setEstimatedBonus(ordersRes.data?.estimatedBonus || 0);
            }
            
            if (shipmentRes.success) {
                setActiveShipment(shipmentRes.data);
            }
        } catch (error) {
            console.error('Driver Data Load Error:', error);
            toast.error('Lỗi tải dữ liệu tài xế: ' + (error.message || 'Lỗi không xác định'));
        }
    };

    const handleTaskAction = async (orderId, type, action) => {
        try {
            const endpoint = `/driver/${type.toLowerCase()}/${action}`;
            await apiClient.post(endpoint, { driverId: user.userId, orderId });
            toast.success('Xác nhận thành công');
            loadDriverData();
        } catch (error) {
            toast.error(error.message || 'Thao tác thất bại');
        }
    };

    return (
        <section className="space-y-6">
            {/* Header / Stats */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-6 shadow-panel">
                    <h2 className="text-xl font-bold text-slate-900">Chào tài xế, {user?.firstName}</h2>
                    <p className="text-slate-500 text-sm">Mã tài xế: {user?.userId}</p>
                    <div className="mt-6 flex gap-4">
                        <button 
                            onClick={() => setActiveTab('tasks')}
                            className={`flex-1 rounded-xl p-3 text-sm font-bold transition ${activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Đơn hàng lẻ ({assignedOrders.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('shipment')}
                            className={`flex-1 rounded-xl p-3 text-sm font-bold transition ${activeTab === 'shipment' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Chuyến hàng {activeShipment ? '●' : ''}
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-panel">
                    <p className="font-semibold text-slate-700">Tiền thưởng đã nhận</p>
                    <div className="mt-4 flex items-end justify-between">
                        <span className="text-3xl font-bold text-emerald-600">{estimatedBonus.toLocaleString('vi-VN')} đ</span>
                        <span className="text-slate-500 text-sm">Thưởng trong tháng</span>
                    </div>
                    <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
                        * Tổng số tiền thưởng bạn đã được cộng vào ví trong tháng này từ các chuyến hoàn thành.
                    </div>
                </div>
            </div>

            {/* Tab: Tasks (Pickup/Delivery) */}
            {activeTab === 'tasks' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Đơn hàng cần xử lý</h3>
                    {assignedOrders.length === 0 ? (
                        <div className="rounded-2xl bg-white p-12 text-center shadow-panel">
                            <p className="text-slate-500">Hiện tại bạn không có đơn hàng nào được phân phối.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {assignedOrders.map((task) => (
                                <div key={task.Order_ID} className="rounded-2xl bg-white p-5 shadow-panel transition hover:shadow-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${task.taskType === 'PICKUP' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {task.taskType === 'PICKUP' ? 'LẤY HÀNG' : 'GIAO HÀNG'}
                                        </span>
                                        <span className="text-xs font-mono text-slate-400">{task.Order_ID}</span>
                                    </div>
                                    
                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 h-2 w-2 rounded-full bg-slate-300" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{task.Last_Name} {task.First_Name}</p>
                                                <p className="text-xs text-slate-500">{task.phone}</p>
                                                <p className="mt-1 text-sm font-semibold text-slate-700">{task.l2Address}, {task.l1Address}</p>
                                                <p className="text-sm text-slate-600 line-clamp-2">{task.address}</p>
                                            </div>
                                        </div>
                                        {task.COD > 0 && (
                                            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-amber-700 font-bold text-sm">
                                                <span>COD:</span>
                                                <span>{task.COD.toLocaleString('vi-VN')} đ</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => handleTaskAction(task.Order_ID, task.taskType, 'complete')}
                                            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700"
                                        >
                                            Thành công
                                        </button>
                                        <button 
                                            onClick={() => handleTaskAction(task.Order_ID, task.taskType, 'failed')}
                                            className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
                                        >
                                            Thất bại
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Shipment */}
            {activeTab === 'shipment' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Chuyến hàng vận chuyển</h3>
                    {!activeShipment ? (
                        <div className="rounded-2xl bg-white p-12 text-center shadow-panel">
                            <p className="text-slate-500">Bạn hiện không phụ trách chuyến hàng liên bưu cục nào.</p>
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-white p-6 shadow-panel">
                            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-6">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Shipment ID</p>
                                    <h4 className="text-2xl font-black text-slate-900">{activeShipment.Shipment_ID}</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Đích đến</p>
                                    <h4 className="text-xl font-bold text-indigo-600">{activeShipment.Hub_Name} ({activeShipment.Destination_Hub_ID})</h4>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm font-bold text-slate-700">Danh sách đơn hàng ({activeShipment.orders.length})</p>
                                <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
                                    {activeShipment.orders.map(order => (
                                        <div key={order.Order_ID} className="rounded-lg bg-slate-50 p-3 text-center border border-slate-100">
                                            <p className="text-xs font-mono font-medium text-slate-600">{order.Order_ID}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-8 rounded-xl bg-slate-50 p-4 border border-slate-100 italic text-sm text-slate-500">
                                * Lưu ý: Trạng thái chuyến hàng sẽ được xác nhận bởi nhân viên tại bưu cục đích ({activeShipment.Hub_Name} - {activeShipment.Destination_Hub_ID}) khi xe đến nơi và thực hiện nhập kho.
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
