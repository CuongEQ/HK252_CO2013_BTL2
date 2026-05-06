import { useState } from 'react';
import { Link } from 'react-router-dom';
import AccountManager from '../components/AccountManager';
import AdminPanel from '../components/AdminPanel';
import CustomerPanel from '../components/CustomerPanel';
import DriverPanel from '../components/DriverPanel';
import StaffPanel from '../components/StaffPanel';
import ManagerPanel from '../components/ManagerPanel';

export default function HomePage({ user }) {
    const role = user?.primaryRole;
    const [viewMode, setViewMode] = useState(role); // Defaults to primary role

    const isOperationalRole = role && role !== 'customer' && role !== 'admin';

    return (
        <div className="space-y-6">
            <AccountManager user={user} />

            {/* Role Switcher for Staff/Drivers/Managers */}
            {isOperationalRole && (
                <div className="flex gap-2 p-1 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-fit">
                    <button 
                        onClick={() => setViewMode(role)}
                        className={`px-4 py-2 text-sm font-bold rounded-xl transition ${viewMode === role ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Chế độ {role === 'manager' ? 'Quản lý' : role === 'staff' ? 'Nhân viên' : 'Tài xế'}
                    </button>
                    <button 
                        onClick={() => setViewMode('customer')}
                        className={`px-4 py-2 text-sm font-bold rounded-xl transition ${viewMode === 'customer' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Chế độ Khách hàng
                    </button>
                </div>
            )}

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {viewMode === 'admin' && <AdminPanel />}
                {viewMode === 'customer' && <CustomerPanel user={user} />}
                {viewMode === 'driver' && <DriverPanel user={user} />}
                {viewMode === 'staff' && <StaffPanel user={user} />}
                {viewMode === 'manager' && <ManagerPanel user={user} />}
            </div>
        </div>
    );
}
