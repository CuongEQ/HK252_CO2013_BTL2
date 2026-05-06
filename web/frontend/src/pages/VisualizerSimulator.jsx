import React, { useState, useEffect, useRef } from 'react';

const STAGES = [
    { id: 0, title: 'Bắt đầu', action: 'Bắt đầu mô phỏng' },
    { id: 1, title: 'Tạo đơn hàng', action: 'Tạo đơn hàng' },
    { id: 2, title: 'Lấy hàng', action: 'Tài xế lấy hàng' },
    { id: 3, title: 'Nhập kho Nguồn', action: 'Check-in HUB Nguồn' },
    { id: 4, title: 'Trung chuyển', action: 'Trung chuyển đơn hàng' },
    { id: 5, title: 'Nhập kho Đích', action: 'Check-in HUB Đích' },
    { id: 6, title: 'Giao hàng', action: 'Tài xế giao hàng' }
];

const INITIAL_DB = {
    ORDER: [],
    PICKUP_ORDER: [],
    DELIVERY_ORDER: [],
    HUB: [
        { ID: 'HUB_SRC', Name: 'HUB Nguồn', Count: 0 },
        { ID: 'HUB_TRANS', Name: 'HUB Trung chuyển', Count: 0 },
        { ID: 'HUB_DEST', Name: 'HUB Đích', Count: 0 }
    ],
    ORDER_TRACKING: [],
    SHIPMENT: [],
    SHIPMENT_ORDER: [],
    PAYMENT: []
};

export default function VisualizerSimulator() {
    const [stage, setStage] = useState(0);
    const [db, setDb] = useState(INITIAL_DB);
    const [logs, setLogs] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    
    const logsEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const logsQueueRef = useRef([]);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, []);

    const processLogsQueue = () => {
        if (logsQueueRef.current.length === 0) {
            setIsTyping(false);
            return;
        }
        
        setIsTyping(true);
        const nextLine = logsQueueRef.current.shift();
        
        if (nextLine) {
            setLogs(prev => [...prev, nextLine]);
        }
        
        typingTimeoutRef.current = setTimeout(processLogsQueue, 400);
    };

    const addLog = (lines) => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        logsQueueRef.current = [...lines];
        processLogsQueue();
    };

    // Use effect to handle state logic securely based on the current stage
    useEffect(() => {
        if (stage === 0) return;

        setDb(prevDb => {
            let newDb = JSON.parse(JSON.stringify(prevDb));
            
            try {
                switch (stage) {
                    case 1:
                        newDb.ORDER.push({ ID: 'ORD001', Sender: 'SND_01', Receiver: 'RCV_01', Status: 'Chờ lấy hàng' });
                        addLog([
                            '[API] POST /api/orders/create',
                            '[DB] START TRANSACTION',
                            '[DB] CALL Create_New_Order(\'ORD001\', ..., \'PAY_ORDER_001\')',
                            '[DB] INSERT INTO ORDER (Order_ID, Status) VALUES (\'ORD001\', \'Chờ lấy hàng\')',
                            '[DB] CALL Create_New_Payment_Customer_Order(\'PAY_ORDER_001\', ...)',
                            '[DB] COMMIT'
                        ]);
                        break;
                    case 2:
                        if (newDb.ORDER.length > 0) newDb.ORDER[0].Status = 'Đang xử lí';
                        newDb.PICKUP_ORDER.push({ ID: 'ORD001', Driver: 'DRV001', Status: 'Đã lấy hàng' });
                        addLog([
                            '[API] POST /api/driver/pickup/complete',
                            '[DB] START TRANSACTION',
                            '[DB] CALL Create_Pickup_Order(\'DRV001\', \'ORD001\')',
                            '[DB] CALL Pickup_Complete(\'DRV001\', \'ORD001\')',
                            '[TRIGGER] Order_Status_Update: Đổi trạng thái ORDER thành \'Đang xử lí\'',
                            '[DB] COMMIT'
                        ]);
                        break;
                    case 3:
                        const hubSrc = newDb.HUB.find(h => h.ID === 'HUB_SRC');
                        if (hubSrc) hubSrc.Count += 1;
                        newDb.ORDER_TRACKING.push({ OrderID: 'ORD001', HubID: 'HUB_SRC', Arrival: new Date().toLocaleTimeString(), Departure: null });
                        addLog([
                            '[API] POST /api/staff/checkin',
                            '[DB] START TRANSACTION',
                            '[DB] CALL Order_Checkin(\'HUB_SRC\', \'ORD001\')',
                            '[DB] UPDATE HUB SET Current_Order_Count = Current_Order_Count + 1 WHERE Hub_ID = \'HUB_SRC\'',
                            '[DB] INSERT INTO ORDER_TRACKING (Arrival...) VALUES (...)',
                            '[DB] COMMIT'
                        ]);
                        break;
                    case 4:
                        const hSrc = newDb.HUB.find(h => h.ID === 'HUB_SRC');
                        if (hSrc) hSrc.Count = Math.max(0, hSrc.Count - 1);
                        
                        const hTrans = newDb.HUB.find(h => h.ID === 'HUB_TRANS');
                        if (hTrans) hTrans.Count += 1;
                        
                        const trackingSrc = newDb.ORDER_TRACKING.find(t => t.HubID === 'HUB_SRC');
                        if (trackingSrc) trackingSrc.Departure = new Date().toLocaleTimeString();
                        
                        newDb.ORDER_TRACKING.push({ OrderID: 'ORD001', HubID: 'HUB_TRANS', Arrival: new Date().toLocaleTimeString(), Departure: null });
                        newDb.SHIPMENT.push({ ID: 'SHP_001', DestHub: 'HUB_TRANS', Status: 'Đang vận chuyển' });
                        newDb.SHIPMENT_ORDER.push({ ShipmentID: 'SHP_001', OrderID: 'ORD001' });
                        
                        addLog([
                            '[API] POST /api/staff/checkout',
                            '[DB] START TRANSACTION',
                            '[DB] CALL Order_Checkout(\'HUB_SRC\', \'HUB_TRANS\', \'SHP_001\', \'ORD001\')',
                            '[DB] UPDATE ORDER_TRACKING SET Departure = NOW() WHERE Hub_ID = \'HUB_SRC\'',
                            '[DB] INSERT INTO SHIPMENT, SHIPMENT_ORDER...',
                            '-- Xe đến HUB Trung chuyển --',
                            '[DB] CALL Order_Checkin(\'HUB_TRANS\', \'ORD001\')',
                            '[DB] UPDATE HUB SET Count = Count + 1 WHERE Hub_ID = \'HUB_TRANS\'',
                            '[DB] COMMIT'
                        ]);
                        break;
                    case 5:
                        const hTrans2 = newDb.HUB.find(h => h.ID === 'HUB_TRANS');
                        if (hTrans2) hTrans2.Count = Math.max(0, hTrans2.Count - 1);
                        
                        const hDest = newDb.HUB.find(h => h.ID === 'HUB_DEST');
                        if (hDest) hDest.Count += 1;
                        
                        const trackingTrans = newDb.ORDER_TRACKING.find(t => t.HubID === 'HUB_TRANS');
                        if (trackingTrans) trackingTrans.Departure = new Date().toLocaleTimeString();
                        
                        newDb.ORDER_TRACKING.push({ OrderID: 'ORD001', HubID: 'HUB_DEST', Arrival: new Date().toLocaleTimeString(), Departure: null });
                        if (newDb.SHIPMENT.length > 0) newDb.SHIPMENT[0].DestHub = 'HUB_DEST';
                        
                        addLog([
                            '[API] POST /api/staff/checkin (HUB_DEST)',
                            '[DB] START TRANSACTION',
                            '[DB] CALL Order_Checkout(\'HUB_TRANS\', \'HUB_DEST\', ...)',
                            '[DB] CALL Order_Checkin(\'HUB_DEST\', \'ORD001\')',
                            '[DB] UPDATE HUB SET Count = Count + 1 WHERE Hub_ID = \'HUB_DEST\'',
                            '[DB] COMMIT'
                        ]);
                        break;
                    case 6:
                        const hDest2 = newDb.HUB.find(h => h.ID === 'HUB_DEST');
                        if (hDest2) hDest2.Count = Math.max(0, hDest2.Count - 1);
                        
                        const trackingDest = newDb.ORDER_TRACKING.find(t => t.HubID === 'HUB_DEST');
                        if (trackingDest) trackingDest.Departure = new Date().toLocaleTimeString();
                        
                        if (newDb.ORDER.length > 0) newDb.ORDER[0].Status = 'Giao thành công';
                        newDb.DELIVERY_ORDER.push({ ID: 'ORD001', Driver: 'DRV001', Status: 'Đã giao hàng' });
                        newDb.PAYMENT.push({ PaymentID: 'PAY_ORD001', COD: 50000, Status: 'Chưa thanh toán' });
                        
                        addLog([
                            '[API] POST /api/driver/delivery/complete',
                            '[DB] START TRANSACTION',
                            '[DB] CALL Create_Delivery_Order(\'DRV001\', \'ORD001\')',
                            '[DB] CALL Delivery_Complete(\'DRV001\', \'ORD001\', \'PAY_COD_001\')',
                            '[DB] CALL Create_New_Payment_Customer_Order(\'PAY_COD_001\', ...)',
                            '[DB] INSERT INTO PAYMENT...',
                            '[DB] UPDATE ORDER SET Status = \'Giao thành công\'',
                            '[DB] COMMIT',
                            '<span class="text-emerald-500 font-bold">HOÀN TẤT QUY TRÌNH!</span>'
                        ]);
                        break;
                    default:
                        break;
                }
            } catch (err) {
                console.error("Simulation error:", err);
            }
            
            return newDb;
        });
    }, [stage]);

    const nextStep = () => {
        if (isTyping || stage >= 6) return;
        setStage(prev => Math.min(6, prev + 1));
    };

    const resetSimulation = () => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        logsQueueRef.current = [];
        setIsTyping(false);
        setStage(0);
        setDb(INITIAL_DB);
        setLogs(['[SYSTEM] Hệ thống đã được làm sạch. Sẵn sàng mô phỏng mới.']);
    };

    // Calculate item position for illustration
    const getOrderPositionClass = () => {
        switch (stage) {
            case 0: return 'left-[5%] top-[80%]'; // Sender
            case 1: return 'left-[5%] top-[80%]'; // Created
            case 2: return 'left-[20%] top-[60%]'; // Picked up (moving to SRC)
            case 3: return 'left-[30%] top-[40%]'; // At SRC
            case 4: return 'left-[50%] top-[40%]'; // At TRANS
            case 5: return 'left-[70%] top-[40%]'; // At DEST
            case 6: return 'left-[90%] top-[80%]'; // Delivered
            default: return 'left-[5%] top-[80%]';
        }
    };

    return (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* 1. Header / Timeline Stepper */}
                <header className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Trình Mô Phỏng Vòng Đời Đơn Hàng</h1>
                    <div className="flex items-center justify-between relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10 rounded-full"></div>
                        <div 
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 -z-10 rounded-full transition-all duration-700 ease-in-out"
                            style={{ width: `${(stage / 6) * 100}%` }}
                        ></div>
                        
                        {STAGES.map((s, index) => (
                            <div key={s.id} className="flex flex-col items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-500
                                    ${stage >= s.id ? (stage === s.id && index !== 6 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-emerald-500 text-white') : 'bg-white text-slate-400 border-2 border-slate-200'}`}
                                >
                                    {s.id === 0 ? 'S' : (stage > s.id ? '✓' : s.id)}
                                </div>
                                <span className={`text-xs font-semibold ${stage >= s.id ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {s.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[600px]">
                    
                    {/* 2. Main Stage (Trái) */}
                    <main className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden flex flex-col">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Minh họa trực quan</h2>
                        
                        <div className="flex-1 relative bg-slate-50/50 rounded-xl border border-slate-100 p-8">
                            {/* Hubs */}
                            <div className="absolute top-[30%] left-[30%] -translate-x-1/2 w-24 h-24 bg-white border-2 border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center z-10">
                                <span className="text-2xl">🏢</span>
                                <span className="text-xs font-bold mt-1 text-slate-600">HUB Nguồn</span>
                            </div>
                            <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-24 h-24 bg-white border-2 border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center z-10">
                                <span className="text-2xl">🔄</span>
                                <span className="text-xs font-bold mt-1 text-slate-600 text-center">HUB<br/>Trung chuyển</span>
                            </div>
                            <div className="absolute top-[30%] left-[70%] -translate-x-1/2 w-24 h-24 bg-white border-2 border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center z-10">
                                <span className="text-2xl">🏢</span>
                                <span className="text-xs font-bold mt-1 text-slate-600">HUB Đích</span>
                            </div>

                            {/* Users */}
                            <div className="absolute top-[75%] left-[5%] -translate-x-1/2 w-16 h-16 flex flex-col items-center justify-center z-10">
                                <span className="text-2xl">👤</span>
                                <span className="text-xs font-bold text-slate-500">Người gửi</span>
                            </div>
                            <div className="absolute top-[75%] left-[95%] -translate-x-1/2 w-16 h-16 flex flex-col items-center justify-center z-10">
                                <span className="text-2xl">👤</span>
                                <span className="text-xs font-bold text-slate-500">Người nhận</span>
                            </div>

                            {/* Moving Order Box */}
                            {stage > 0 && (
                                <div className={`absolute w-12 h-12 bg-blue-100 border-2 border-blue-500 rounded-lg shadow-md flex items-center justify-center z-20 transition-all duration-1000 ease-in-out ${getOrderPositionClass()} -translate-x-1/2 -translate-y-1/2`}>
                                    <span className="text-xl">📦</span>
                                </div>
                            )}

                            {/* Path lines */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                                <line x1="5%" y1="75%" x2="30%" y2="35%" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="5,5" />
                                <line x1="30%" y1="35%" x2="50%" y2="35%" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="5,5" />
                                <line x1="50%" y1="35%" x2="70%" y2="35%" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="5,5" />
                                <line x1="70%" y1="35%" x2="95%" y2="75%" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="5,5" />
                            </svg>
                        </div>

                        {/* Driver Info below map */}
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-xl">🚚</div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Tài xế phụ trách: DRV001</p>
                                <p className="text-xs text-slate-500">Thực hiện lấy hàng và giao hàng</p>
                            </div>
                        </div>
                    </main>

                    {/* 3. Control & Data Panel (Phải) */}
                    <aside className="lg:col-span-5 flex flex-col gap-6">
                        
                        {/* Control actions */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-bold text-slate-800">Điều khiển</h2>
                                <button onClick={resetSimulation} className="text-xs text-rose-500 font-bold hover:underline">Reset</button>
                            </div>
                            <p className="text-sm text-slate-500 mb-4">Giai đoạn hiện tại: <strong className="text-blue-600">{STAGES[stage].title}</strong></p>
                            
                            <button 
                                onClick={nextStep}
                                disabled={isTyping || stage >= 6}
                                className={`w-full py-3 rounded-xl font-bold text-white shadow-sm transition-all
                                    ${stage >= 6 ? 'bg-emerald-500' : isTyping ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'}`}
                            >
                                {stage >= 6 ? 'Đã hoàn thành' : STAGES[stage + 1]?.action}
                            </button>
                        </div>

                        {/* Tables Viewer */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex-1 overflow-auto">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Dữ liệu thời gian thực (DB)</h2>
                            
                            <div className="space-y-6">
                                {/* ORDER Table */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bảng ORDER</h3>
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead><tr className="border-b"><th className="pb-1">ID</th><th className="pb-1">Status</th></tr></thead>
                                        <tbody>
                                            {db.ORDER.length === 0 ? <tr><td colSpan="2" className="text-slate-400 py-1 italic text-xs">No data</td></tr> : 
                                                db.ORDER.map((o, i) => (
                                                    <tr key={i} className="border-b border-slate-50"><td className="py-1 font-mono">{o.ID}</td><td><span className={`px-2 py-0.5 rounded text-xs ${o.Status === 'Giao thành công' ? 'bg-emerald-100 text-emerald-700' : o.Status === 'Chờ lấy hàng' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{o.Status}</span></td></tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>

                                {/* HUB Table */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bảng HUB (Số lượng đơn)</h3>
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead><tr className="border-b"><th className="pb-1">HUB</th><th className="pb-1">Count</th></tr></thead>
                                        <tbody>
                                            {db.HUB.map((h, i) => (
                                                <tr key={i} className="border-b border-slate-50"><td className="py-1">{h.Name}</td><td className="font-bold text-blue-600">{h.Count}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* ORDER TRACKING */}
                                <div>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bảng ORDER_TRACKING</h3>
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead><tr className="border-b"><th className="pb-1">HUB</th><th className="pb-1">Arrival</th><th className="pb-1">Departure</th></tr></thead>
                                        <tbody>
                                            {db.ORDER_TRACKING.length === 0 ? <tr><td colSpan="3" className="text-slate-400 py-1 italic">No tracking data</td></tr> : 
                                                db.ORDER_TRACKING.map((t, i) => (
                                                    <tr key={i} className="border-b border-slate-50"><td className="py-1">{t.HubID}</td><td>{t.Arrival}</td><td>{t.Departure || '-'}</td></tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                                
                                {/* PAYMENT */}
                                {db.PAYMENT.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bảng PAYMENT</h3>
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead><tr className="border-b"><th className="pb-1">Payment ID</th><th className="pb-1">COD</th><th className="pb-1">Status</th></tr></thead>
                                            <tbody>
                                                {db.PAYMENT.map((p, i) => (
                                                    <tr key={i} className="border-b border-slate-50"><td className="py-1 font-mono text-xs">{p.PaymentID}</td><td>{p.COD}đ</td><td><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs">{p.Status}</span></td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Console Log */}
                        <div className="bg-slate-900 rounded-2xl shadow-sm p-4 h-64 flex flex-col font-mono text-sm overflow-hidden">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                                <span className="text-slate-400 text-xs uppercase tracking-widest font-bold">Execution Log</span>
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-1.5 text-slate-300">
                                {logs.map((log, index) => (
                                    <div key={index} className="flex gap-3">
                                        <span className="text-slate-600 select-none">❯</span>
                                        <span dangerouslySetInnerHTML={{ __html: log.replace(/\[API\]/g, '<span class="text-blue-400 font-bold">[API]</span>').replace(/\[DB\]/g, '<span class="text-amber-400 font-bold">[DB]</span>').replace(/\[TRIGGER\]|\[PROCEDURE\]/g, '<span class="text-purple-400 font-bold">$&</span>') }} />
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>
                        </div>

                    </aside>
                </div>
            </div>
        </section>
    );
}
