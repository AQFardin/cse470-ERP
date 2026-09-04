import { useState } from 'react';
import { submitApplication } from '../api';

interface ApplyPageProps {
  jobId: string;
  onNavigate: (path: string) => void;
}

export default function ApplyPage({ jobId, onNavigate }: ApplyPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resumeFile) {
      setError('Please attach your CV/resume.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await submitApplication({ name, email, phone, jobPostingId: jobId, coverLetter, resumeFile });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <h1 className="text-xl font-semibold mb-2">Application submitted</h1>
        <p className="text-gray-500 mb-6">
          Thanks for applying! We've sent a confirmation to your email. You can check your status anytime.
        </p>
        <button
          onClick={() => onNavigate('/status')}
          className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium"
        >
          Check my status
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-xl font-semibold mb-6">Apply for this role</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Cover letter (optional)"
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <div>
          <label className="block text-sm text-gray-600 mb-1">CV / Resume (PDF or DOC)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            required
            className="w-full text-sm"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 bg-gray-900 text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit application'}
        </button>
      </form>
    </div>
  );
}