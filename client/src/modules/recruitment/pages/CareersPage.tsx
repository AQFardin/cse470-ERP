import { useRecruitment } from '../context/RecruitmentContext';

interface CareersPageProps {
  onNavigate: (path: string) => void;
}

export default function CareersPage({ onNavigate }: CareersPageProps) {
  const { activeJobPostings, isLoading } = useRecruitment();

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-1">Open Positions</h1>
      <p className="text-gray-500 mb-6">Find your next role with us.</p>

      {isLoading && <p className="text-gray-400 text-sm">Loading positions...</p>}

      {!isLoading && activeJobPostings.length === 0 && (
        <p className="text-gray-400 text-sm">No open positions right now. Check back soon.</p>
      )}

      <div className="space-y-3">
        {activeJobPostings.map((job) => (
          <div key={job.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h2 className="font-medium">{job.title}</h2>
              <p className="text-sm text-gray-500">
                {job.department} · {job.location}
              </p>
            </div>
            <button
              onClick={() => onNavigate(`/careers/apply?job=${job.id}`)}
              className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-700"
            >
              Apply
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 text-sm text-gray-400">
        Already applied?{' '}
        <button onClick={() => onNavigate('/status')} className="text-gray-700 underline">
          Check your application status
        </button>
      </div>
    </div>
  );
}