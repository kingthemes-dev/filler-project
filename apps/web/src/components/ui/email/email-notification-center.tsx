'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Eye, RefreshCw, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import emailService, { EmailTemplate, EmailResponse } from '@/services/email-service';

interface EmailNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailNotificationCenter({ isOpen, onClose }: EmailNotificationCenterProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailResponse[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = () => {
    setTemplates(emailService.getTemplates());
    setSentEmails(emailService.getSentEmails());
  };

  const handleSendTestEmail = async (templateId: string) => {
    setIsSending(true);
    
    try {
      const testData = {
        to: 'test@example.com',
        toName: 'Test User',
        template: templateId,
        variables: {
          orderNumber: 'TEST-123',
          customerName: 'Jan Kowalski',
          customerEmail: 'jan@example.com',
          orderDate: new Date().toLocaleDateString('pl-PL'),
          total: '299.00 zł',
          items: '<div class="item"><strong>Test Product</strong> x 1 = 299.00 zł</div>',
          billingAddress: 'ul. Testowa 123, Warszawa 00-001, PL',
          shippingAddress: 'ul. Testowa 123, Warszawa 00-001, PL',
          paymentMethod: 'Karta kredytowa',
          trackingNumber: 'TRK123456789',
          resetLink: 'https://example.com/reset-password'
        }
      };

      const response = await emailService.sendEmail(testData);
      
      if (response.success) {
        console.log('📧 Test email wysłany:', response.messageId);
        // Refresh data
        loadData();
      } else {
        console.error('❌ Błąd wysyłania test email:', response.message);
      }
    } catch (error) {
      console.error('❌ Błąd test email:', error);
    } finally {
      setIsSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Send className="w-4 h-4 text-blue-600" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-blue-600 bg-blue-50';
      case 'delivered':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl mx-auto max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
            <div className="flex items-center space-x-3">
              <Mail className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Email Notification Center
              </h2>
            </div>
                      <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Email Templates */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Szablony Email
                  </h3>
                  <button
                    onClick={loadData}
                    className="flex items-center space-x-2 text-sm text-gray-600 hover:text-black transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Odśwież</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <button
                          onClick={() => setSelectedTemplate(template)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{template.subject}</p>
                      <button
                        onClick={() => handleSendTestEmail(template.id)}
                        disabled={isSending}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {isSending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Wysyłanie...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Wyślij test
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sent Emails History */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Historia wysłanych emaili
                </h3>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sentEmails.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Mail className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Brak wysłanych emaili</p>
                    </div>
                  ) : (
                    sentEmails.map((email) => (
                      <div
                        key={email.messageId}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(email.status)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                              {email.status}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {email.sentAt.toLocaleString('pl-PL')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{email.message}</p>
                        <p className="text-xs text-gray-500 font-mono">{email.messageId}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Template Preview Modal */}
            {selectedTemplate && (
              <motion.div
                className="fixed inset-0 z-60 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="absolute inset-0 bg-black bg-opacity-75" onClick={() => setSelectedTemplate(null)} />
                <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Podgląd szablonu: {selectedTemplate.name}
                    </h3>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Temat:</h4>
                      <p className="text-gray-600">{selectedTemplate.subject}</p>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">HTML:</h4>
                      <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap">{selectedTemplate.html}</pre>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Text:</h4>
                      <div className="bg-gray-100 p-4 rounded-lg">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap">{selectedTemplate.text}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Export function to open notification center
export const openEmailNotificationCenter = () => {
  // This will be called from outside to open the modal
  // The component will listen for this event
};
