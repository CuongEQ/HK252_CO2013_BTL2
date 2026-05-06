const STEP_LABELS = [
    '1. Khoi tao',
    '2. Lay hang',
    '3. Xu ly tai Hub',
    '4. Giao hang',
    '5. Hoan tat'
];

export default function LifecycleStepper({ currentStep, onSelectStep, selectedStep }) {
    return (
        <div className="panel h-full">
            <h3 className="mb-4 font-display text-xl font-bold">Visual Flow</h3>
            <div className="relative ml-3">
                <div className="absolute left-3 top-2 h-[90%] w-1 rounded-full bg-slate-200" />
                <div className="space-y-6">
                    {STEP_LABELS.map((label, index) => {
                        const step = index + 1;
                        const isCompleted = step <= currentStep;
                        const isSelected = selectedStep === step;

                        return (
                            <button
                                key={label}
                                className={`relative flex w-full items-start gap-4 rounded-xl p-3 text-left transition ${isSelected ? 'bg-sky-100' : 'hover:bg-slate-50'
                                    }`}
                                onClick={() => onSelectStep(step)}
                                type="button"
                            >
                                <span
                                    className={`z-10 mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isCompleted ? 'bg-teal-700 text-white' : 'bg-slate-300 text-slate-600'
                                        }`}
                                >
                                    {step}
                                </span>
                                <div>
                                    <p className="font-semibold text-slate-900">{label}</p>
                                    <p className="text-xs text-slate-500">
                                        {isCompleted ? 'Dang/da di qua giai doan nay' : 'Chua den giai doan nay'}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
