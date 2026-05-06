import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
}

const getDefaultOrderForm = (senderId = '') => ({
    weight: '',
    cod: '',
    senderId,
    receiverId: '',
    senderAddress: '',
    receiverAddress: '',
    receiverFirstName: '',
    receiverLastName: '',
    receiverPhone: '',
    senderL1: '',
    senderL2: '',
    receiverL1: '',
    receiverL2: '',
    voucherId: ''
});

export default function CustomerPanel({ user }) {
    const toast = useToast();
    const [senderId, setSenderId] = useState(user?.userId || '');
    const [status, setStatus] = useState('ALL');
    const [orderFilterType, setOrderFilterType] = useState('sent');
    const [searchOrderId, setSearchOrderId] = useState('');
    const [phoneFilter, setPhoneFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [orders, setOrders] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [l1Addresses, setL1Addresses] = useState([]);
    const [senderL2Addresses, setSenderL2Addresses] = useState([]);
    const [receiverL2Addresses, setReceiverL2Addresses] = useState([]);
    const [senderProfile, setSenderProfile] = useState({
        firstName: '',
        lastName: '',
        fullName: '',
        phoneNumber: '',
        balance: 0,
        customerTier: '',
        createDate: ''
    });
    const [form, setForm] = useState(getDefaultOrderForm(user?.userId || ''));
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [manualVoucherId, setManualVoucherId] = useState('');
    const [newVoucherId, setNewVoucherId] = useState('');

    const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

    const [editOrderData, setEditOrderData] = useState({ orderId: '', cod: '', receiverL2: '', receiverL1: '' });
    const [editL2Addresses, setEditL2Addresses] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        const currentUserId = user?.userId || '';
        setSenderId(currentUserId);
        setForm(getDefaultOrderForm(currentUserId));
    }, [user]);

    useEffect(() => {
        if (!senderId) {
            return;
        }

        loadOrders();
        loadVouchers();
        loadL1Addresses();
        loadSenderProfile();
    }, [senderId, status, orderFilterType, phoneFilter, user]);

    useEffect(() => {
        if (form.senderL1) {
            loadL2Addresses(form.senderL1, setSenderL2Addresses);
        } else {
            setSenderL2Addresses([]);
        }
    }, [form.senderL1]);

    useEffect(() => {
        if (form.receiverL1) {
            loadL2Addresses(form.receiverL1, setReceiverL2Addresses);
        } else {
            setReceiverL2Addresses([]);
        }
    }, [form.receiverL1]);

    const loadOrders = async () => {
        try {
            const data = await apiClient.get(
                `/customer/orders?userId=${senderId}&type=${orderFilterType}&status=${status}&phoneFilter=${encodeURIComponent(phoneFilter || 'ALL')}`
            );
            setOrders(data.data);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const loadVouchers = async () => {
        try {
            const data = await apiClient.get('/customer/vouchers');
            setVouchers(data.data);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const loadL1Addresses = async () => {
        try {
            const data = await apiClient.get('/customer/l1-addresses');
            setL1Addresses(data.data);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const loadL2Addresses = async (l1Id, setL2State) => {
        try {
            const data = await apiClient.get(`/customer/l2-addresses?l1Id=${l1Id}`);
            setL2State(data.data);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const loadSenderProfile = async () => {
        try {
            const data = await apiClient.get(`/customer/profile-context?customerId=${senderId}`);
            setSenderProfile(data.data);
            // setForm((prev) => ({
            //     ...prev,
            //     senderAddress: data.data.shippingAddress || prev.senderAddress
            // }));
        } catch (error) {
            toast.error(error.message);
        }
    };

    const codValue = Number(form.cod) || 0;

    const selectedSenderL2 = senderL2Addresses.find(l2 => l2.ID === form.senderL2);
    const sourceHubDisplay = selectedSenderL2 ? selectedSenderL2.Local_Hub_ID : '';

    const selectedReceiverL2 = receiverL2Addresses.find(l2 => l2.ID === form.receiverL2);
    const destinationHubDisplay = selectedReceiverL2 ? selectedReceiverL2.Local_Hub_ID : '';

    const createOrder = async (event) => {
        event.preventDefault();
        try {
            await apiClient.post('/customer/orders', {
                ...form,
                weight: Number(form.weight),
                cod: Number(form.cod),
                voucherId: form.voucherId || null
            });
            toast.success('Tạo đơn hàng thành công');
            setForm(getDefaultOrderForm(senderId));
            loadOrders();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const deleteOrder = async (orderId, status) => {
        if (status !== 'Chờ lấy hàng') {
            toast.error('Không thể huỷ đơn hàng ở trạng thái này');
            return;
        }

        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) {
            return;
        }

        try {
            await apiClient.delete(`/customer/orders/${orderId}`);
            toast.success('Hủy đơn hàng thành công');
            loadOrders();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const viewOrderDetails = async (orderId) => {
        try {
            const res = await apiClient.get(`/customer/orders/${orderId}`);
            setSelectedOrderDetails(res.data);
            setIsOrderModalOpen(true);
        } catch (error) {
            toast.error('Không thể tải thông tin đơn hàng');
        }
    };

    const openEditOrder = async (order) => {
        if (order.Status !== 'Chờ lấy hàng') {
            toast.error(`Không thể chỉnh sửa đơn hàng ở trạng thái "${order.Status}"`);
            return;
        }

        try {
            const res = await apiClient.get(`/customer/orders/${order.Order_ID}`);
            const details = res.data;

            if (details.Status !== 'Chờ lấy hàng') {
                toast.error(`Đơn hàng đã chuyển sang trạng thái "${details.Status}" và không thể chỉnh sửa`);
                return;
            }

            const currentL1 = details.Receiver_L1_Address_ID || '';
            const currentL2 = details.Receiver_L2_Address_ID || '';
            const currentL1Name = details.Receiver_L1_Name || '';

            let l2List = [];
            if (currentL1) {
                const l2Data = await apiClient.get(`/customer/l2-addresses?l1Id=${currentL1}`);
                l2List = l2Data.data;
            }

            setEditOrderData({
                orderId: order.Order_ID,
                status: details.Status || '',
                cod: details.COD || '',
                receiverL1: currentL1,
                receiverL1Name: currentL1Name,
                receiverL2: currentL2
            });
            setEditL2Addresses(l2List);
            setIsEditModalOpen(true);
        } catch (error) {
            toast.error('Không thể tải thông tin đơn hàng');
        }
    };

    const submitEditOrder = async (event) => {
        event.preventDefault();

        // Frontend validation
        if (editOrderData.status !== 'Chờ lấy hàng') {
            toast.error('Đơn hàng ở trạng thái "' + editOrderData.status + '" không thể chỉnh sửa');
            return;
        }
        if (Number(editOrderData.cod) < 0) {
            toast.error('Giá trị COD không thể âm');
            return;
        }

        try {
            await apiClient.put(`/customer/orders/${editOrderData.orderId}`, {
                cod: editOrderData.cod,
                receiverL2: editOrderData.receiverL2 || editOrderData.receiverL2Original
            });
            toast.success('Cập nhật đơn hàng thành công');
            setIsEditModalOpen(false);
            loadOrders();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const applyManualVoucher = () => {
        if (!manualVoucherId.trim()) {
            toast.error('Vui lòng nhập ID voucher');
            return;
        }

        const validVoucher = vouchers.find(v => v.Voucher_ID === manualVoucherId.trim());
        if (!validVoucher) {
            toast.error('Mã voucher không hợp lệ hoặc không có trong kho');
            return;
        }

        setForm((prev) => ({ ...prev, voucherId: manualVoucherId.trim() }));
        setIsVoucherModalOpen(false);
        toast.success('Đã áp mã voucher');
    };

    const displayedOrders = [...orders]
        .filter((order) => {
            if (!searchOrderId.trim()) {
                return true;
            }

            return String(order.Order_ID || '').toLowerCase().includes(searchOrderId.trim().toLowerCase());
        })
        .sort((a, b) => {
            if (sortBy === 'status-asc') {
                return String(a.Status || '').localeCompare(String(b.Status || ''));
            }

            if (sortBy === 'status-desc') {
                return String(b.Status || '').localeCompare(String(a.Status || ''));
            }

            if (sortBy === 'cod-asc') {
                return Number(a.COD || 0) - Number(b.COD || 0);
            }

            if (sortBy === 'cod-desc') {
                return Number(b.COD || 0) - Number(a.COD || 0);
            }

            return String(b.Order_ID || '').localeCompare(String(a.Order_ID || ''));
        });

    return (
        <section className="panel space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
                <form className="space-y-2 rounded-xl border border-slate-200 p-3" onSubmit={createOrder}>
                    <p className="font-semibold">Tạo đơn hàng</p>

                    <div className="rounded-xl border border-slate-200 p-3">
                        <p className="mb-2 text-sm font-semibold text-slate-700">1) Thông tin người gửi</p>

                        <div className="grid gap-2 md:grid-cols-3">
                            <div className="grid gap-2 grid-cols-2 md:col-span-2">
                                <input className="input" value={senderProfile.lastName || ''} placeholder="Họ người gửi" readOnly />
                                <input className="input" value={senderProfile.firstName || ''} placeholder="Tên người gửi" readOnly />
                            </div>
                            <input className="input md:col-span-1" value={senderProfile.phoneNumber || ''} placeholder="SĐT người gửi" readOnly />
                        </div>

                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <select
                                className="input"
                                value={form.senderL1}
                                onChange={(e) => setForm((prev) => ({ ...prev, senderL1: e.target.value, senderL2: '' }))}
                                required
                            >
                                <option value="">Chọn Tỉnh gửi</option>
                                {l1Addresses.map((l1) => (
                                    <option key={l1.ID} value={l1.ID}>
                                        {l1.Name}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="input"
                                value={form.senderL2}
                                onChange={(e) => setForm((prev) => ({ ...prev, senderL2: e.target.value }))}
                                required
                                disabled={!form.senderL1}
                            >
                                <option value="">Chọn Quận/Huyện gửi</option>
                                {senderL2Addresses.map((l2) => (
                                    <option key={l2.ID} value={l2.ID}>
                                        {l2.Name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Removed sender stats per request */}

                        <input
                            className="input mt-2"
                            value={form.senderAddress}
                            placeholder="Địa chỉ người gửi"
                            onChange={(e) => setForm((prev) => ({ ...prev, senderAddress: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                        <p className="mb-2 text-sm font-semibold text-slate-700">2) Thông tin người nhận</p>

                        <div className="grid gap-2 grid-cols-2">
                            <input
                                className="input"
                                placeholder="Họ người nhận"
                                value={form.receiverLastName}
                                onChange={(e) => setForm((prev) => ({ ...prev, receiverLastName: e.target.value }))}
                            />
                            <input
                                className="input"
                                placeholder="Tên người nhận *"
                                value={form.receiverFirstName}
                                onChange={(e) => setForm((prev) => ({ ...prev, receiverFirstName: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <input
                                className="input"
                                placeholder="SĐT người nhận"
                                value={form.receiverPhone}
                                onChange={(e) => setForm((prev) => ({ ...prev, receiverPhone: e.target.value }))}
                                required
                            />
                            <input
                                className="input"
                                placeholder="Địa chỉ người nhận"
                                value={form.receiverAddress}
                                onChange={(e) => setForm((prev) => ({ ...prev, receiverAddress: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <select
                                className="input"
                                value={form.receiverL1}
                                onChange={(e) => setForm((prev) => ({ ...prev, receiverL1: e.target.value, receiverL2: '' }))}
                                required
                            >
                                <option value="">Chọn Tỉnh nhận</option>
                                {l1Addresses.map((l1) => (
                                    <option key={l1.ID} value={l1.ID}>
                                        {l1.Name}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="input"
                                value={form.receiverL2}
                                onChange={(e) => setForm((prev) => ({ ...prev, receiverL2: e.target.value }))}
                                required
                                disabled={!form.receiverL1}
                            >
                                <option value="">Chọn Quận/Huyện nhận</option>
                                {receiverL2Addresses.map((l2) => (
                                    <option key={l2.ID} value={l2.ID}>
                                        {l2.Name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                        <p className="mb-2 text-sm font-semibold text-slate-700">3) Thông tin bưu kiện</p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <input
                                    className="input"
                                    placeholder="Khối lượng (kg)"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.weight}
                                    onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
                                    required
                                />
                                <input
                                    className="input"
                                    placeholder="Tiền thu hộ (COD)"
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={form.cod}
                                    onChange={(e) => setForm((prev) => ({ ...prev, cod: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <input
                                    className="input bg-slate-50"
                                    placeholder="HUB nguồn sẽ hiển thị khi chọn địa chỉ gửi"
                                    value={sourceHubDisplay ? `HUB nguồn: ${sourceHubDisplay}` : ''}
                                    readOnly
                                />
                                <input
                                    className="input bg-slate-50"
                                    placeholder="HUB đích sẽ hiển thị khi chọn địa chỉ nhận"
                                    value={destinationHubDisplay ? `HUB đích: ${destinationHubDisplay}` : ''}
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                        <p className="mb-2 text-sm font-semibold text-slate-700">4) Khuyến mãi</p>

                        <div className="grid gap-2 md:grid-cols-2">
                            <input
                                className="input"
                                placeholder="Mã giảm giá đang áp dụng"
                                value={form.voucherId}
                                onChange={(e) => setForm((prev) => ({ ...prev, voucherId: e.target.value }))}
                            />
                            <button
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                                type="button"
                                onClick={() => setIsVoucherModalOpen(true)}
                            >
                                Mở kho voucher
                            </button>
                        </div>


                    </div>

                    <button className="btn-primary" type="submit">
                        Xác nhận tạo đơn
                    </button>
                </form>

                <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                    <p className="font-semibold">Quản lý đơn hàng</p>

                    <div className="flex gap-2 border-b border-slate-200 pb-2">
                        <button
                            className={`flex-1 rounded-lg py-2 font-semibold transition ${orderFilterType === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            onClick={() => setOrderFilterType('sent')}
                            type="button"
                        >
                            Đơn giao
                        </button>
                        <button
                            className={`flex-1 rounded-lg py-2 font-semibold transition ${orderFilterType === 'received' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            onClick={() => setOrderFilterType('received')}
                            type="button"
                        >
                            Đơn nhận
                        </button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-4">
                        <input
                            className="input"
                            placeholder="Tìm kiếm theo ID đơn hàng"
                            value={searchOrderId}
                            onChange={(e) => setSearchOrderId(e.target.value)}
                        />
                        <input
                            className="input"
                            placeholder="Lọc theo SĐT"
                            value={phoneFilter}
                            onChange={(e) => setPhoneFilter(e.target.value)}
                        />
                        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="Chờ lấy hàng">Chờ lấy hàng</option>
                            <option value="Đang xử lí">Đang xử lí</option>
                            <option value="Đang giao">Đang giao</option>
                            <option value="Giao thành công">Giao thành công</option>
                            <option value="Đã huỷ">Đã huỷ</option>
                            <option value="Đang hoàn hàng">Đang hoàn hàng</option>
                        </select>
                        <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="newest">Sắp xếp: Mới nhất</option>
                            <option value="status-asc">Trạng thái A-Z</option>
                            <option value="status-desc">Trạng thái Z-A</option>
                            <option value="cod-asc">COD tăng dần</option>
                            <option value="cod-desc">COD giảm dần</option>
                        </select>
                    </div>

                    <div className="overflow-auto rounded-xl border border-slate-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-100 text-left">
                                <tr>
                                    <th className="px-3 py-2">Order ID</th>
                                    <th className="px-3 py-2">Đối tác</th>
                                    <th className="px-3 py-2">SĐT</th>
                                    <th className="px-3 py-2">Trạng thái</th>
                                    <th className="px-3 py-2">COD</th>
                                    <th className="px-3 py-2">Phí ship</th>
                                    <th className="px-3 py-2 text-center">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedOrders.map((order) => (
                                    <tr key={order.Order_ID} className="border-t border-slate-200">
                                        <td className="px-3 py-2">{order.Order_ID}</td>
                                        <td className="px-3 py-2">
                                            {orderFilterType === 'sent' ? (order.Receiver_First_Name || '-') : (order.Sender_First_Name || '-')}
                                        </td>
                                        <td className="px-3 py-2">
                                            {orderFilterType === 'sent' ? (order.Receiver_Phone || '-') : (order.Sender_Phone || '-')}
                                        </td>
                                        <td className="px-3 py-2">{order.Status}</td>
                                        <td className="px-3 py-2">{formatCurrency(order.COD)}</td>
                                        <td className="px-3 py-2">{formatCurrency(order.Shipping_Fee)}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 font-bold text-white transition hover:bg-blue-700"
                                                    onClick={() => viewOrderDetails(order.Order_ID)}
                                                    type="button"
                                                    title="Xem chi tiết đơn hàng"
                                                >
                                                    i
                                                </button>
                                                {orderFilterType === 'sent' && (
                                                    <>
                                                        <button
                                                            className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
                                                            onClick={() => openEditOrder(order)}
                                                            type="button"
                                                            title="Sửa đơn hàng"
                                                        >
                                                            <span style={{ display: 'inline-block', transform: 'rotate(135deg)', fontSize: '14px', lineHeight: 1 }}>✏</span>
                                                        </button>
                                                        <button
                                                            className="flex h-8 w-8 items-center justify-center rounded bg-rose-600 font-bold text-white transition hover:bg-rose-700"
                                                            onClick={() => deleteOrder(order.Order_ID, order.Status)}
                                                            type="button"
                                                            title="Hủy đơn hàng"
                                                        >
                                                            X
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {displayedOrders.length === 0 ? (
                                    <tr>
                                        <td className="px-3 py-2 text-slate-500" colSpan={7}>
                                            Không tìm thấy đơn hàng phù hợp
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isVoucherModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-lg font-semibold">Kho voucher của bạn</p>
                            <button
                                className="rounded border border-slate-300 px-3 py-1 text-sm"
                                onClick={() => setIsVoucherModalOpen(false)}
                                type="button"
                            >
                                Đóng
                            </button>
                        </div>

                        <div className="max-h-60 overflow-auto rounded border border-slate-200 p-2">
                            {vouchers.length === 0 ? (
                                <p className="text-sm text-slate-500">Chưa có voucher khả dụng.</p>
                            ) : (
                                <div className="space-y-2">
                                    {vouchers.map((voucher) => (
                                        <button
                                            key={voucher.Voucher_ID}
                                            className="flex w-full items-center justify-between rounded bg-slate-100 px-3 py-3 text-left hover:bg-slate-200 transition"
                                            type="button"
                                            onClick={() => setManualVoucherId(voucher.Voucher_ID)}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">{voucher.Voucher_ID}</span>
                                                <span className="text-emerald-600 font-medium text-sm">{formatCurrency(voucher.Value)}</span>
                                            </div>
                                            <div className="flex flex-col text-right text-xs text-slate-500">
                                                <span>HSD: {new Date(voucher.Expire).toLocaleDateString('vi-VN')}</span>
                                                <span>Còn lại: {voucher.Remain_Uses} lượt</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                            <input
                                className="input flex-1"
                                placeholder="Nhập ID voucher..."
                                value={manualVoucherId}
                                onChange={(e) => setManualVoucherId(e.target.value)}
                            />
                            <button className="btn-primary" type="button" onClick={applyManualVoucher}>
                                Áp dụng
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {isOrderModalOpen && selectedOrderDetails ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Chi tiết đơn hàng {selectedOrderDetails.Order_ID}</h3>
                            <button
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                                onClick={() => setIsOrderModalOpen(false)}
                                type="button"
                            >
                                X
                            </button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 border-b border-slate-100 pb-2">
                                <span className="font-medium text-slate-500">Trạng thái:</span>
                                <span className="font-semibold text-slate-800">{selectedOrderDetails.Status}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-100 pb-2">
                                <span className="font-medium text-slate-500">Người nhận:</span>
                                <span>{selectedOrderDetails.Last_Name || ''} {selectedOrderDetails.First_Name || ''}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-100 pb-2">
                                <span className="font-medium text-slate-500">SĐT nhận:</span>
                                <span>{selectedOrderDetails.Receiver_Phone || ''}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-100 pb-2">
                                <span className="font-medium text-slate-500">Địa chỉ chi tiết:</span>
                                <span>{selectedOrderDetails.Receiver_Address}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-100 pb-2">
                                <span className="font-medium text-slate-500">Tỉnh/Thành phố:</span>
                                <span>{selectedOrderDetails.Receiver_L1_Name || ''}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-100 pb-2">
                                <span className="font-medium text-slate-500">Quận/Huyện:</span>
                                <span>{selectedOrderDetails.Receiver_L2_Name || ''}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-100 pb-2">
                                <span className="font-medium text-slate-500">Khối lượng:</span>
                                <span>{selectedOrderDetails.Weight} kg</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-100 pb-2">
                                <span className="font-medium text-slate-500">HUB nguồn:</span>
                                <span>{selectedOrderDetails.Source_Hub_ID} - {selectedOrderDetails.Source_Hub_Name}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-100 pb-2">
                                <span className="font-medium text-slate-500">HUB đích:</span>
                                <span>{selectedOrderDetails.Destination_Hub_ID} - {selectedOrderDetails.Destination_Hub_Name}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-100 pb-2">
                                <span className="font-medium text-slate-500">Phí vận chuyển:</span>
                                <span className="text-emerald-600">{formatCurrency(selectedOrderDetails.Shipping_Fee)}</span>
                            </div>
                            <div className="grid grid-cols-2 border-b border-slate-100 pb-2">
                                <span className="font-medium text-slate-500">COD:</span>
                                <span className="font-bold text-rose-600">{formatCurrency(selectedOrderDetails.COD)}</span>
                            </div>
                        </div>

                        {selectedOrderDetails.tracking && selectedOrderDetails.tracking.length > 0 && (
                            <div className="mt-5 border-t border-slate-200 pt-4">
                                <h4 className="font-semibold mb-4 text-slate-800">Tình trạng vận chuyển</h4>
                                <div className="relative border-l-2 border-blue-400 ml-3 space-y-4">
                                    {selectedOrderDetails.tracking.map((track, idx) => (
                                        <div key={idx} className="relative pl-6">
                                            <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                                            <p className="font-semibold text-sm text-slate-800">{track.Hub_Name} ({track.Hub_ID})</p>
                                            <p className="text-xs text-slate-600 mt-1">Đến: {new Date(track.Arrival).toLocaleString('vi-VN')}</p>
                                            {track.Departure && (
                                                <p className="text-xs text-slate-600">Đi: {new Date(track.Departure).toLocaleString('vi-VN')}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-700"
                                onClick={() => setIsOrderModalOpen(false)}
                                type="button"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Sửa đơn hàng</h3>
                            <button
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                                onClick={() => setIsEditModalOpen(false)}
                                type="button"
                            >
                                ✕
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={submitEditOrder}>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Mã đơn hàng</label>
                                <input
                                    className="input bg-slate-50 text-slate-500"
                                    value={editOrderData.orderId}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Trạng thái</label>
                                <input
                                    className={`input bg-slate-50 font-medium ${editOrderData.status === 'Chờ lấy hàng' ? 'text-amber-600' : 'text-red-500'}`}
                                    value={editOrderData.status}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">COD (đồng)</label>
                                <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    value={editOrderData.cod}
                                    onChange={(e) => setEditOrderData((prev) => ({ ...prev, cod: e.target.value }))}
                                    placeholder="Nhập giá trị COD"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Tỉnh/Thành phố nhận (cấp 1)</label>
                                <input
                                    className="input bg-slate-50 text-slate-500"
                                    value={editOrderData.receiverL1Name || editOrderData.receiverL1 || ''}
                                    readOnly
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Quận/Huyện nhận (cấp 2)</label>
                                <select
                                    className="input"
                                    value={editOrderData.receiverL2}
                                    onChange={(e) => setEditOrderData((prev) => ({ ...prev, receiverL2: e.target.value }))}
                                >
                                    <option value="">-- Giữ nguyên --</option>
                                    {editL2Addresses.map((l2) => (
                                        <option key={l2.ID} value={l2.ID}>{l2.Name}</option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-slate-400">Chỉ có thể thay đổi Quận/Huyện trong cùng Tỉnh/Thành phố</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                    onClick={() => setIsEditModalOpen(false)}
                                    type="button"
                                >
                                    Huỷ
                                </button>
                                <button
                                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                                    type="submit"
                                >
                                    Lưu thay đổi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </section>
    );
}
