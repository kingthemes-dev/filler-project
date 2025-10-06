'use client';

import { useState } from 'react';
import { Star, Send } from 'lucide-react';
import wooCommerceService from '@/services/woocommerce-optimized';

interface ReviewFormProps {
  productId: number;
  onReviewSubmitted?: () => void;
}

export default function ReviewForm({ productId, onReviewSubmitted }: ReviewFormProps) {
  const [formData, setFormData] = useState({
    reviewer: '',
    reviewer_email: '',
    review: '',
    rating: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reviewer || !formData.reviewer_email || !formData.review || formData.rating === 0) {
      setErrorMessage('Wszystkie pola są wymagane');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      await wooCommerceService.createProductReview({
        product_id: productId,
        review: formData.review,
        reviewer: formData.reviewer,
        reviewer_email: formData.reviewer_email,
        rating: formData.rating
      });

      setSubmitStatus('success');
      setFormData({
        reviewer: '',
        reviewer_email: '',
        review: '',
        rating: 0
      });

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      setSubmitStatus('error');
      setErrorMessage('Wystąpił błąd podczas dodawania opinii. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-green-600 text-lg font-semibold mb-2">
          Dziękujemy za opinię!
        </div>
        <p className="text-green-700">
          Twoja opinia została dodana i będzie widoczna po zatwierdzeniu.
        </p>
        <button
          onClick={() => setSubmitStatus('idle')}
          className="mt-4 text-green-600 hover:text-green-800 underline"
        >
          Dodaj kolejną opinię
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Dodaj swoją opinię
        </h3>
        
        {/* Rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ocena *
          </label>
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleRatingClick(rating)}
                className={`p-1 transition-colors ${
                  rating <= formData.rating
                    ? 'text-yellow-400'
                    : 'text-gray-300 hover:text-yellow-300'
                }`}
              >
                <Star className={`w-6 h-6 ${
                  rating <= formData.rating ? 'fill-current' : ''
                }`} />
              </button>
            ))}
          </div>
          {formData.rating > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {formData.rating === 1 && 'Bardzo słaba'}
              {formData.rating === 2 && 'Słaba'}
              {formData.rating === 3 && 'Średnia'}
              {formData.rating === 4 && 'Dobra'}
              {formData.rating === 5 && 'Bardzo dobra'}
            </p>
          )}
        </div>

        {/* Name */}
        <div className="mb-4">
          <label htmlFor="reviewer" className="block text-sm font-medium text-gray-700 mb-2">
            Imię i nazwisko *
          </label>
          <input
            type="text"
            id="reviewer"
            name="reviewer"
            value={formData.reviewer}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Twoje imię i nazwisko"
            required
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label htmlFor="reviewer_email" className="block text-sm font-medium text-gray-700 mb-2">
            Adres e-mail *
          </label>
          <input
            type="email"
            id="reviewer_email"
            name="reviewer_email"
            value={formData.reviewer_email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="twoj@email.com"
            required
          />
        </div>

        {/* Review */}
        <div className="mb-4">
          <label htmlFor="review" className="block text-sm font-medium text-gray-700 mb-2">
            Twoja opinia *
          </label>
          <textarea
            id="review"
            name="review"
            value={formData.review}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Podziel się swoją opinią o tym produkcie..."
            required
          />
        </div>

        {/* Error Message */}
        {submitStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || formData.rating === 0}
          className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Dodawanie opinii...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Dodaj opinię</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
