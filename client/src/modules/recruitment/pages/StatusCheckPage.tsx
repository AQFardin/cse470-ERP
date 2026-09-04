import { useState } from 'react';
import { checkStatusByEmail } from '../api';
import type { Application } from '../types';

const STATUS_LABELS: Record<string, string> = {
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Under Review',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  HIRED: 'Hired',
};

export default function StatusCheckPage() {
  const [email, setEmail] = useState('');
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setApplications(null);
    try {
      const result = await checkStatusByEmail(email);
      setApplications(result.applications);
    } catch (err: any) {
      setError(err.message || 'No applications found for that email.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-xl font-semibold mb-6">Check your application status</h1>

      <form onSubmit={handleCheck} className="flex gap-2 mb-6">
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          {isLoading ? '...' : 'Check'}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {applications && (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="border border-gray-200 rounded-lg p-4">
              <p className="font-medium">{app.jobPosting.title}</p>
              <p className="text-sm text-gray-500">
                Status: <span className="font-medium text-gray-800">{STATUS_LABELS[app.status]}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}