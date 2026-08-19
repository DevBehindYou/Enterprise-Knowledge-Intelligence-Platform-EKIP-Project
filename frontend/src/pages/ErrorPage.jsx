import { Link } from 'react-router-dom';
import AuthShell from '../components/layout/AuthShell.jsx';

const CONTENT = {
  403: {
    headline: "You don't have access to this page",
    body: "This section is restricted to certain roles. If you think this is a mistake, ask your workspace admin to check your permissions.",
  },
  404: {
    headline: "We couldn't find that page",
    body: 'The page you are looking for may have moved, or the link might be out of date.',
  },
  500: {
    headline: 'Something went wrong on our end',
    body: "This wasn't caused by anything you did. Try again in a moment — if it keeps happening, let your admin know.",
  },
};

export default function ErrorPage({ code = 404 }) {
  const { headline, body } = CONTENT[code];
  return (
    <AuthShell>
      <div className="font-mono text-[13px] text-accent font-semibold">ERROR {code}</div>
      <h2 className="text-xl font-semibold mt-2 mb-2.5">{headline}</h2>
      <p className="text-ink-muted text-[13.5px] leading-relaxed mb-6">{body}</p>
      <Link to="/" className="btn-primary inline-flex">
        Back to dashboard
      </Link>
    </AuthShell>
  );
}
