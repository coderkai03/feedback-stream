'use client';

import { FeedbackItem } from '@/lib/cosmos';
import { MessageCircle, User, Mail, Clock } from 'lucide-react';

interface FeedbackCardProps {
  feedback: FeedbackItem;
  isNew?: boolean;
}

export default function FeedbackCard({ feedback, isNew = false }: FeedbackCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border-l-4 p-6 transition-all duration-500 ${
      isNew 
        ? 'border-l-green-500 shadow-lg scale-105 animate-pulse' 
        : 'border-l-blue-500 hover:shadow-lg'
    }`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {feedback.userName}
            </span>
            {isNew && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                New
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2 mb-3">
            <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {feedback.userEmail}
            </span>
          </div>
          
          <p className="text-gray-800 dark:text-gray-200 mb-4 leading-relaxed">
            {feedback.feedbackText}
          </p>
          
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{formatDate(feedback.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
