/**
 * WhatsApp Business Notification Service (Mock for Enterprise PMS/POS)
 * Production-ready interface structured to swap with Meta Cloud API or Gupshup/Twilio.
 */

export interface WhatsAppPayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components: Array<{
      type: 'header' | 'body' | 'button';
      parameters: Array<{
        type: 'text' | 'currency' | 'date_time';
        text?: string;
        currency?: { fallback_value: string; code: string; amount_1000: number };
        date_time?: { fallback_value: string };
      }>;
    }>;
  };
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED';
  phone: string;
  templateName: string;
  variables: Record<string, any>;
  sentAt: Date;
  mockApiResponse: {
    messaging_product: 'whatsapp';
    contacts: Array<{ input: string; wa_id: string }>;
    messages: Array<{ id: string; message_status: string }>;
  };
}

/**
 * Send WhatsApp template notification (Mock implementation matching Meta Cloud API)
 */
export async function sendWhatsApp(
  phone: string,
  templateName: 'booking_confirmed' | 'bill_receipt' | 'check_in_welcome' | string,
  variables: Record<string, any>
): Promise<WhatsAppSendResult> {
  // Normalize Indian mobile number format (+91 or 10 digits)
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const normalizedPhone = cleanPhone.startsWith('+')
    ? cleanPhone
    : cleanPhone.length === 10
    ? `+91${cleanPhone}`
    : `+${cleanPhone}`;

  const messageId = `wamid.HBgL${Date.now()}A${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  const result: WhatsAppSendResult = {
    success: true,
    messageId,
    status: 'DELIVERED',
    phone: normalizedPhone,
    templateName,
    variables,
    sentAt: new Date(),
    mockApiResponse: {
      messaging_product: 'whatsapp',
      contacts: [{ input: normalizedPhone, wa_id: normalizedPhone.replace('+', '') }],
      messages: [{ id: messageId, message_status: 'accepted' }],
    },
  };

  console.log(`\n📱 [WhatsApp Mock Service] >>> Sent to ${normalizedPhone}`);
  console.log(`   Template : ${templateName}`);
  console.log(`   MessageId: ${messageId}`);
  console.log(`   Variables:`, JSON.stringify(variables, null, 2));

  return result;
}

export const notificationService = {
  sendWhatsApp,
};

export default notificationService;
