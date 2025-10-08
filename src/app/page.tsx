import FeedbackStream from '@/components/FeedbackStream';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Home() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <FeedbackStream />
        </div>
      </div>
    </ProtectedRoute>
  );
}
