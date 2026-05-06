export default function SectionTitle({ title, subtitle }) {
    return (
        <div className="mb-3">
            <h2 className="font-display text-xl font-bold text-slate-900">{title}</h2>
            {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
        </div>
    );
}
