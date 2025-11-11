'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Star, Send, X, Image as ImageIcon } from 'lucide-react';
import wooCommerceService from '@/services/woocommerce-optimized';

interface ReviewFormProps {
  productId: number;
  onReviewSubmitted?: () => void;
}

interface UploadedImage {
  id: number;
  url: string;
  thumbnail: string;
  file?: File;
  preview?: string;
}

export default function ReviewForm({ productId, onReviewSubmitted }: ReviewFormProps) {
  const [formData, setFormData] = useState({
    reviewer: '',
    reviewer_email: '',
    review: '',
    rating: 0
  });
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate total images count (max 5)
    if (images.length + files.length > 5) {
      setErrorMessage('Możesz dodać maksymalnie 5 zdjęć');
      setSubmitStatus('error');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`Plik ${file.name} nie jest obrazem`);
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`Plik ${file.name} jest za duży (max 5MB)`);
        }

        // Create preview
        const preview = URL.createObjectURL(file);

        // Upload to server
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/reviews/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Błąd uploadu: ${file.name}`);
        }

        const result = await response.json();
        
        // Clean up preview URL
        URL.revokeObjectURL(preview);

        return {
          id: result.attachment_id,
          url: result.url,
          thumbnail: result.thumbnail || result.url,
        };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...uploadedImages]);
    } catch (error) {
      console.error('Error uploading images:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Błąd podczas uploadu zdjęć');
      setSubmitStatus('error');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
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
      // Prepare image IDs for submission
      const imageIds = images.map(img => img.id);

      const result = await wooCommerceService.createProductReview({
        product_id: productId,
        review: formData.review,
        reviewer: formData.reviewer,
        reviewer_email: formData.reviewer_email,
        rating: formData.rating,
        images: imageIds.length > 0 ? imageIds : undefined
      });

      if (!result.success) {
        throw new Error(result.error || 'Nie udało się dodać opinii');
      }

      setSubmitStatus('success');
      setFormData({
        reviewer: '',
        reviewer_email: '',
        review: '',
        rating: 0
      });
      setImages([]);

      // Call onReviewSubmitted callback to refresh reviews list
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Wystąpił błąd podczas dodawania opinii. Spróbuj ponownie.');
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
          Twoja opinia została dodana i jest już widoczna!
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

        {/* Image Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zdjęcia (opcjonalnie, max 5)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            disabled={isUploading || images.length >= 5}
            className="hidden"
            id="review-images"
          />
          <label
            htmlFor="review-images"
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer transition-colors ${
              isUploading || images.length >= 5
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploadowanie...' : images.length >= 5 ? 'Osiągnięto limit (5)' : 'Dodaj zdjęcia'}
          </label>
          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <Image
                    src={image.thumbnail || image.url}
                    alt={`Preview ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-full h-20 object-cover rounded-lg border border-gray-300"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Usuń zdjęcie"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Możesz dodać maksymalnie 5 zdjęć (JPEG, PNG, GIF, WebP, max 5MB każdy)
          </p>
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
