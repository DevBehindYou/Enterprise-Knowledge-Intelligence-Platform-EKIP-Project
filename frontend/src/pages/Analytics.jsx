import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAnalyticsViewModel } from '../viewmodels/useAnalyticsViewModel.js';
import Skeleton from '../components/foundations/Skeleton.jsx';

export default function Analytics() {
  const { data, isLoading, error } = useAnalyticsViewModel();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Department analytics</h1>
        <p className="text-ink-muted text-[13.5px] mt-1.5">
          Aggregate trends only — individual conversations stay private.
        </p>
      </div>

      {error && <div className="text-danger text-sm mb-4">{error}</div>}

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-component" />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="stat-card card">
              <div className="text-xs uppercase text-ink-muted">Feedback rate</div>
              <div className="font-display text-2xl font-bold mt-1.5">{Math.round((data?.feedbackRate || 0) * 100)}%</div>
            </div>
            <div className="stat-card card">
              <div className="text-xs uppercase text-ink-muted">Avg. confidence</div>
              <div className="font-display text-2xl font-bold mt-1.5">{(data?.avgConfidence || 0).toFixed(2)}</div>
            </div>
            <div className="stat-card card">
              <div className="text-xs uppercase text-ink-muted">Scope</div>
              <div className="font-display text-2xl font-bold mt-1.5 capitalize">{data?.scopeDepartment || 'all'}</div>
            </div>
            <div className="stat-card card">
              <div className="text-xs uppercase text-ink-muted">Days tracked</div>
              <div className="font-display text-2xl font-bold mt-1.5">{data?.volumeOverTime?.length || 0}</div>
            </div>
          </div>

          <div className="card">
            <div className="text-sm font-semibold mb-4">Query volume over time</div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.volumeOverTime || []}>
                  <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3D46F5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
