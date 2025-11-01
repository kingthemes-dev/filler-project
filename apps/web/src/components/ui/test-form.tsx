'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestFormUnderNewsletter() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, source: 'newsletter-test-form' })
      });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-6 rounded-xl bg-white/10 text-white p-4 border border-white/20 text-sm">
        Dziękujemy! Formularz testowy został wysłany.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Imię"
        className="h-11 rounded-lg px-3 bg-white/10 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="h-11 rounded-lg px-3 bg-white/10 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
      />
      <Button type="submit" disabled={loading} className="h-11 bg-white text-black hover:bg-white/90 rounded-lg font-semibold">
        {loading ? 'Wysyłanie...' : 'Wyślij test'}
      </Button>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Wiadomość (opcjonalnie)"
        className="sm:col-span-3 h-24 rounded-lg px-3 py-2 bg-white/10 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
      />
    </form>
  );
}


