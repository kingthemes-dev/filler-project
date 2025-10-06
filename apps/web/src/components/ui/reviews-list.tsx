'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

interface Review {
  id: number;
  reviewer: string;
  reviewer_email: string;
  review: string;
  rating: number;
  date_created: string;
  date_created_gmt: string;
  status: string;
  reviewer_avatar_urls: {
    [key: string]: string;
  };
}

interface ReviewsListProps {
  productId: number;
}

export default function ReviewsList({ productId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/reviews?product_id=${productId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setReviews(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd ładowania opinii');
        console.error('Error fetching reviews:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [productId]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="space-y-1">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Błąd ładowania opinii: {error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 text-blue-600 hover:underline"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Brak szczegółowych opinii.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
          <div className="flex items-start space-x-4">
            {/* Avatar */}
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-medium text-sm">
                {review.reviewer.charAt(0).toUpperCase()}
              </span>
            </div>
            
            {/* Review Content */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h5 className="font-medium text-gray-900">{review.reviewer}</h5>
                <div className="flex items-center space-x-1">
                  {renderStars(review.rating)}
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(review.date_created)}
                </span>
              </div>
              
              <p className="text-gray-700 leading-relaxed">
                {review.review}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

