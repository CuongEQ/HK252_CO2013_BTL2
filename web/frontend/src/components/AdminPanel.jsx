import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import SectionTitle from './SectionTitle';

export default function AdminPanel() {
    const toast = useToast();

    const [tables, setTables] = useState([]);
    const [procedures, setProcedures] = useState([]);
    const [functions, setFunctions] = useState([]);
    const [triggers, setTriggers] = useState([]);

    const [selectedTable, setSelectedTable] = useState('');
    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, limit: 30, offset: 0 });

    const selectedRowKeys = useMemo(() => {
        if (rows.length === 0) {
            return [];
        }

        return Object.keys(rows[0]);
    }, [rows]);

    const loadSchemaObjects = async () => {
        try {
            const [tableResponse, procedureResponse, functionResponse, triggerResponse] = await Promise.all([
                apiClient.get('/admin/schema/tables'),
                apiClient.get('/admin/schema/procedures'),
                apiClient.get('/admin/schema/functions'),
                apiClient.get('/admin/schema/triggers')
            ]);

            setTables(tableResponse.data);
            setProcedures(procedureResponse.data);
            setFunctions(functionResponse.data);
            setTriggers(triggerResponse.data);

            if (tableResponse.data.length > 0) {
                setSelectedTable((prev) => prev || tableResponse.data[0].TABLE_NAME);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const loadTableDetails = async (tableName, offset = 0) => {
        if (!tableName) {
            return;
        }

        try {
            const [columnResponse, rowResponse] = await Promise.all([
                apiClient.get(`/admin/schema/tables/${tableName}/columns`),
                apiClient.get(`/admin/schema/tables/${tableName}/rows?limit=${pagination.limit}&offset=${offset}`)
            ]);

            setColumns(columnResponse.data);
            setRows(rowResponse.data.rows);
            setPagination(rowResponse.data.pagination);
        } catch (error) {
            toast.error(error.message);
        }
    };

    useEffect(() => {
        loadSchemaObjects();
    }, []);

    useEffect(() => {
        if (selectedTable) {
            loadTableDetails(selectedTable, 0);
        }
    }, [selectedTable]);

    return (
        <section className="panel space-y-4">
            <SectionTitle
                title="Quản trị CSDL toàn hệ thống"
                subtitle="Giám sát bảng dữ liệu, thủ tục, hàm và trigger theo thời gian thực"
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl bg-slate-900 p-4 text-white">
                    <p className="text-xs uppercase tracking-wide text-slate-300">Bảng dữ liệu</p>
                    <p className="text-2xl font-bold">{tables.length}</p>
                </div>
                <div className="rounded-xl bg-teal-700 p-4 text-white">
                    <p className="text-xs uppercase tracking-wide text-teal-100">Thủ tục</p>
                    <p className="text-2xl font-bold">{procedures.length}</p>
                </div>
                <div className="rounded-xl bg-cyan-700 p-4 text-white">
                    <p className="text-xs uppercase tracking-wide text-cyan-100">Hàm</p>
                    <p className="text-2xl font-bold">{functions.length}</p>
                </div>
                <div className="rounded-xl bg-amber-600 p-4 text-white">
                    <p className="text-xs uppercase tracking-wide text-amber-100">Trigger</p>
                    <p className="text-2xl font-bold">{triggers.length}</p>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <div className="space-y-3 xl:col-span-1">
                    <div className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="font-semibold">Bang du lieu</p>
                            <button className="rounded bg-slate-900 px-3 py-1 text-sm text-white" onClick={loadSchemaObjects} type="button">
                                Làm mới
                            </button>
                        </div>
                        <div className="max-h-80 overflow-auto space-y-1">
                            {tables.map((table) => (
                                <button
                                    key={table.TABLE_NAME}
                                    className={`w-full rounded px-3 py-2 text-left text-sm ${selectedTable === table.TABLE_NAME ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-800'
                                        }`}
                                    onClick={() => setSelectedTable(table.TABLE_NAME)}
                                    type="button"
                                >
                                    {table.TABLE_NAME}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                        <p className="mb-2 font-semibold">Cột của bảng: {selectedTable || '-'}</p>
                        <div className="max-h-64 overflow-auto">
                            <table className="min-w-full text-xs">
                                <thead className="bg-slate-100 text-left">
                                    <tr>
                                        <th className="px-2 py-1">Tên cột</th>
                                        <th className="px-2 py-1">Kiểu dữ liệu</th>
                                        <th className="px-2 py-1">Khóa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {columns.map((column) => (
                                        <tr key={column.COLUMN_NAME} className="border-t border-slate-200">
                                            <td className="px-2 py-1">{column.COLUMN_NAME}</td>
                                            <td className="px-2 py-1">{column.DATA_TYPE}</td>
                                            <td className="px-2 py-1">{column.COLUMN_KEY || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 xl:col-span-2">
                    <div className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="font-semibold">Du lieu bang: {selectedTable || '-'}</p>
                            <div className="flex items-center gap-2 text-sm">
                                <button
                                    className="rounded bg-slate-200 px-2 py-1"
                                    onClick={() => loadTableDetails(selectedTable, Math.max(pagination.offset - pagination.limit, 0))}
                                    type="button"
                                    disabled={pagination.offset <= 0}
                                >
                                    Trang trước
                                </button>
                                <button
                                    className="rounded bg-slate-200 px-2 py-1"
                                    onClick={() => loadTableDetails(selectedTable, pagination.offset + pagination.limit)}
                                    type="button"
                                    disabled={pagination.offset + pagination.limit >= pagination.total}
                                >
                                    Trang sau
                                </button>
                                <span>{pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} / {pagination.total}</span>
                            </div>
                        </div>
                        <div className="max-h-96 overflow-auto rounded border border-slate-200">
                            <table className="min-w-full text-xs">
                                <thead className="bg-slate-100 text-left">
                                    <tr>
                                        {selectedRowKeys.map((key) => (
                                            <th key={key} className="px-2 py-1">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, index) => (
                                        <tr key={`${selectedTable}-${index}`} className="border-t border-slate-200 align-top">
                                            {selectedRowKeys.map((key) => (
                                                <td key={`${key}-${index}`} className="px-2 py-1">{String(row[key] ?? '')}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-3">
                        <div className="rounded-xl border border-teal-200 p-3">
                            <p className="mb-2 font-semibold text-teal-700">Procedures</p>
                            <div className="max-h-56 space-y-1 overflow-auto text-xs">
                                {procedures.map((item) => (
                                    <details key={item.ROUTINE_NAME} className="rounded bg-teal-50 p-2">
                                        <summary className="cursor-pointer font-semibold">{item.ROUTINE_NAME}</summary>
                                        <p className="mt-1 whitespace-pre-wrap">{item.ROUTINE_DEFINITION || '(Hidden by MySQL permissions)'}</p>
                                    </details>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-cyan-200 p-3">
                            <p className="mb-2 font-semibold text-cyan-700">Functions</p>
                            <div className="max-h-56 space-y-1 overflow-auto text-xs">
                                {functions.map((item) => (
                                    <details key={item.ROUTINE_NAME} className="rounded bg-cyan-50 p-2">
                                        <summary className="cursor-pointer font-semibold">
                                            {item.ROUTINE_NAME} ({item.RETURNS_TYPE})
                                        </summary>
                                        <p className="mt-1 whitespace-pre-wrap">{item.ROUTINE_DEFINITION || '(Hidden by MySQL permissions)'}</p>
                                    </details>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-amber-200 p-3">
                            <p className="mb-2 font-semibold text-amber-700">Triggers</p>
                            <div className="max-h-56 space-y-1 overflow-auto text-xs">
                                {triggers.map((item) => (
                                    <details key={item.TRIGGER_NAME} className="rounded bg-amber-50 p-2">
                                        <summary className="cursor-pointer font-semibold">
                                            {item.TRIGGER_NAME}
                                        </summary>
                                        <p className="mt-1 text-slate-700">
                                            {item.ACTION_TIMING} {item.EVENT_MANIPULATION} ON {item.EVENT_OBJECT_TABLE}
                                        </p>
                                        <p className="mt-1 whitespace-pre-wrap">{item.ACTION_STATEMENT}</p>
                                    </details>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
