import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nie znaleziono - FILLER',
  description: 'Strona nie została znaleziona',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Strona nie została znaleziona
        </h2>
        <p className="text-gray-600 mb-8">
          Przepraszamy, ale strona której szukasz nie istnieje.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
        >
          Wróć do strony głównej
        </Link>
      </div>
    </div>
  );
}
