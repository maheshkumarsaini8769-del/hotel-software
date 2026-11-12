import { Request, Response } from 'express';
import mongoose from 'mongoose';

const isConfigured = (value: string | undefined): boolean => {
  const normalized = value?.trim() || '';
  return normalized.length > 0 && !/(placeholder|your_.*_key|example)/i.test(normalized);
};

export const getPlatformIntegrationReport = (_req: Request, res: Response): void => {
  const emailConfigured = isConfigured(process.env.RESEND_API_KEY);
  const otaSecretConfigured = isConfigured(process.env.OTA_WEBHOOK_SECRET);

  res.status(200).json({
    success: true,
    data: {
      checkedAt: new Date().toISOString(),
      integrations: [
        {
          id: 'database',
          name: 'Platform database',
          category: 'Platform',
          status: mongoose.connection.readyState === 1 ? 'READY' : 'UNAVAILABLE',
          detail: mongoose.connection.readyState === 1
            ? 'The application database connection is open.'
            : 'The application database connection is not ready.',
        },
        {
          id: 'resend-email',
          name: 'Resend email delivery',
          category: 'Email',
          status: emailConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
          detail: emailConfigured
            ? 'A provider key is configured. Delivery was not tested.'
            : 'No live provider key is configured; the current OTP service uses its development fallback.',
        },
        {
          id: 'razorpay',
          name: 'Razorpay payments',
          category: 'Payments',
          status: 'MOCK_ONLY',
          detail: 'The current order creator returns local mock orders. A live Razorpay API client is not wired.',
        },
        {
          id: 'whatsapp',
          name: 'WhatsApp notifications',
          category: 'Messaging',
          status: 'MOCK_ONLY',
          detail: 'The notification service generates mock delivery responses; no Meta API client is wired.',
        },
        {
          id: 'ota-webhook',
          name: 'OTA inbound webhook',
          category: 'Bookings',
          status: otaSecretConfigured ? 'CONFIGURED' : 'DEVELOPMENT_DEFAULT',
          detail: otaSecretConfigured
            ? 'Inbound OTA booking ingestion is enabled with a configured secret. Provider connectivity was not tested.'
            : 'Inbound ingestion uses a development fallback secret. Outbound channel-manager sync is not connected.',
        },
        {
          id: 'ai-provider',
          name: 'AI provider API',
          category: 'AI & automation',
          status: 'NOT_IMPLEMENTED',
          detail: 'No AI provider client or AI API integration is currently wired into the backend.',
        },
      ],
      automations: [
        {
          id: 'waiter-routing',
          name: 'Waiter request routing',
          status: 'IMPLEMENTED',
          detail: 'Service requests are assigned using table, section, and on-duty staff rules.',
        },
        {
          id: 'room-pricing',
          name: 'Dynamic room pricing',
          status: 'IMPLEMENTED',
          detail: 'The pricing engine applies occupancy and weekend rules; this is rule-based, not AI.',
        },
      ],
    },
  });
};
