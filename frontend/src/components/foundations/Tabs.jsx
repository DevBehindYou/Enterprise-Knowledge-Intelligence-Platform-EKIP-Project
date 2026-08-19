import { useState } from 'react';

/** @param {{tabs: {key:string,label:string}[], children: (activeKey:string)=>React.ReactNode}} props */
export default function Tabs({ tabs, defaultKey, children }) {
  const [active, setActive] = useState(defaultKey || tabs[0]?.key);
  return (
    <div>
      <div className="flex gap-5 border-b border-line mb-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`pb-2.5 text-[13.5px] font-semibold border-b-2 -mb-px ${
              active === t.key ? 'text-ink border-accent' : 'text-ink-muted border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {children(active)}
    </div>
  );
}
