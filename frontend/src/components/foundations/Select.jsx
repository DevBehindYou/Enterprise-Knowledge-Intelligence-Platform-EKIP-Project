export default function Select({ label, options, className = '', ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-[12.5px] font-semibold mb-1.5">{label}</label>}
      <select className={`input ${className}`} {...props}>
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </div>
  );
}
