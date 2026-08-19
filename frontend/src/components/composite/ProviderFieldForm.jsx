import { ExternalLink } from 'lucide-react';
import Input from '../foundations/Input.jsx';

/**
 * Renders the credential form for one provider from its `fields` spec
 * (see backend services/storage/storageProviders.js and services/ai/aiProviders.js).
 * Keeping the field list server-side means adding a provider is a backend-only
 * change — this component never needs to know which providers exist.
 */
export default function ProviderFieldForm({ spec, values, onChange, disabledKeys = [] }) {
  if (!spec) return null;

  return (
    <div>
      {spec.help && (
        <div className="text-[12.5px] text-ink-muted bg-surface rounded-component p-3 mb-4 leading-relaxed">
          {spec.help}
          {(spec.keyUrl || spec.docsUrl) && (
            <a
              href={spec.keyUrl || spec.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent font-semibold inline-flex items-center gap-1 ml-1.5 whitespace-nowrap"
            >
              {spec.keyUrl ? 'Get a key' : 'Docs'}
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}

      {spec.fields.map((field) => (
        <Input
          key={field.key}
          label={`${field.label}${field.required ? '' : ' (optional)'}`}
          type={field.secret ? 'password' : 'text'}
          placeholder={field.placeholder}
          hint={field.help}
          autoComplete={field.secret ? 'new-password' : 'off'}
          value={values[field.key] ?? ''}
          disabled={disabledKeys.includes(field.key)}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      ))}
    </div>
  );
}
