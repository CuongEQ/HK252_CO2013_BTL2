export default function DatabaseMappingTable({ selectedMapping }) {
    if (!selectedMapping) {
        return null;
    }

    return (
        <div className="panel h-full overflow-auto">
            <h3 className="mb-4 font-display text-xl font-bold">Database Mapping Table</h3>
            <p className="mb-3 text-sm text-slate-600">Step {selectedMapping.step}: {selectedMapping.title}</p>

            <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left">
                    <tr>
                        <th className="px-3 py-2">Loai</th>
                        <th className="px-3 py-2">Ten thao tac CSDL</th>
                    </tr>
                </thead>
                <tbody>
                    {selectedMapping.procedures.map((item) => (
                        <tr key={`proc-${item}`} className="border-t border-slate-200">
                            <td className="px-3 py-2 font-semibold text-cyan-700">Procedure</td>
                            <td className="px-3 py-2">{item}</td>
                        </tr>
                    ))}
                    {selectedMapping.triggers.map((item) => (
                        <tr key={`trigger-${item}`} className="border-t border-slate-200">
                            <td className="px-3 py-2 font-semibold text-amber-700">Trigger</td>
                            <td className="px-3 py-2">{item}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
