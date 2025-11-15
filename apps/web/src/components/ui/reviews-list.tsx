'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, X, ZoomIn } from 'lucide-react';

interface ReviewImage {
  id?: number;
  url: string;
  thumbnail?: string;
  medium?: string;
  large?: string;
}

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
  images?: ReviewImage[];
  videos?: string[];
}

interface ReviewsListProps {
  productId: number;
}

export default function ReviewsList({ productId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/reviews?product_id=${productId}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Ensure data is an array
        if (Array.isArray(data)) {
          setReviews(data);
        } else {
          console.warn('Reviews API returned non-array data:', data);
          setReviews([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd ładowania opinii');
        console.error('Error fetching reviews:', err);
        setReviews([]); // Set empty array on error
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
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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
    <>
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            aria-label="Zamknij"
          >
            <X className="w-8 h-8" />
          </button>
          <div
            className="relative w-full h-full max-w-full max-h-full"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={lightboxImage}
              alt="Powiększone zdjęcie"
              fill
              className="object-contain"
              sizes="(min-width: 1024px) 800px, 100vw"
              unoptimized
            />
          </div>
        </div>
      )}

      <div className="space-y-6">
        {reviews.map(review => (
          <div
            key={review.id}
            className="border-b border-gray-200 pb-6 last:border-b-0"
          >
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
                  <h5 className="font-medium text-gray-900">
                    {review.reviewer}
                  </h5>
                  <div className="flex items-center space-x-1">
                    {renderStars(review.rating)}
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(review.date_created)}
                  </span>
                </div>

                <p className="text-gray-700 leading-relaxed">{review.review}</p>

                {/* Review Images */}
                {review.images && review.images.length > 0 && (
                  <div className="mt-4">
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                      {review.images.map((image, imgIndex) => (
                        <button
                          key={imgIndex}
                          type="button"
                          onClick={() => setLightboxImage(image.url)}
                          className="relative group aspect-square overflow-hidden rounded-lg border border-gray-200 hover:border-gray-400 transition-colors"
                        >
                          <div className="relative w-full h-full">
                            <Image
                              src={image.thumbnail || image.medium || image.url}
                              alt={`Zdjęcie ${imgIndex + 1} od ${review.reviewer}`}
                              fill
                              className="object-cover"
                              loading="lazy"
                              sizes="150px"
                              unoptimized
                            />
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Videos (future support) */}
                {review.videos && review.videos.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {review.videos.map((videoUrl, vidIndex) => {
                      // Simple YouTube/Vimeo embed detection
                      const isYouTube =
                        videoUrl.includes('youtube.com') ||
                        videoUrl.includes('youtu.be');
                      const isVimeo = videoUrl.includes('vimeo.com');

                      if (isYouTube) {
                        const videoId = videoUrl.match(
                          /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
                        )?.[1];
                        if (videoId) {
                          return (
                            <div
                              key={vidIndex}
                              className="aspect-video rounded-lg overflow-hidden"
                            >
                              <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                title={`Film ${vidIndex + 1} od ${review.reviewer}`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          );
                        }
                      }

                      if (isVimeo) {
                        const videoId =
                          videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
                        if (videoId) {
                          return (
                            <div
                              key={vidIndex}
                              className="aspect-video rounded-lg overflow-hidden"
                            >
                              <iframe
                                src={`https://player.vimeo.com/video/${videoId}`}
                                title={`Film ${vidIndex + 1} od ${review.reviewer}`}
                                className="w-full h-full"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          );
                        }
                      }

                      return (
                        <a
                          key={vidIndex}
                          href={videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:underline"
                        >
                          Zobacz film {vidIndex + 1}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
