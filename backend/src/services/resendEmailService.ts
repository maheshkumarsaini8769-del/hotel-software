import axios from 'axios';

export interface SendOtpEmailParams {
  to: string;
  name?: string;
  otp: string;
  hotelName?: string;
  expiresInMinutes?: number;
}

export interface SendOtpResult {
  success: boolean;
  messageId?: string;
  deliveredTo?: string;
  forwarded?: boolean;
  error?: string;
}

export async function sendPinVerificationOtpEmail(params: SendOtpEmailParams): Promise<SendOtpResult> {
  const { to, name = 'Staff Member', otp, hotelName = 'SpiceHub Hospitality', expiresInMinutes = 10 } = params;
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'SpiceHub Security <onboarding@resend.dev>';
  const fallbackEmail = (process.env.RESEND_FALLBACK_EMAIL || 'maheshkumarsaini8769@gmail.com').toLowerCase().trim();
  const targetRecipient = to.toLowerCase().trim();

  console.log(`[ResendEmailService] 📧 Preparing PIN verification OTP for ${targetRecipient} (${name})`);
  console.log(`[ResendEmailService] 🔑 Generated OTP: ${otp} (Expires in ${expiresInMinutes} mins)`);

  const generateHtml = (isForwardedNotice = false) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .logo { font-size: 22px; font-weight: 800; color: #d97706; margin-bottom: 20px; }
        .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .notice-banner { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #1e40af; line-height: 1.4; }
        .otp-box { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #b45309; background: #fef3c7; border: 2px dashed #f59e0b; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
        .info { font-size: 13.5px; line-height: 1.5; color: #475569; margin-bottom: 16px; }
        .footer { font-size: 11.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">🏨 SpiceHub Hospitality</div>
        <div class="title">Staff Workstation PIN Verification</div>
        ${
          isForwardedNotice
            ? `<div class="notice-banner">
                 <strong>📬 Resend Sandbox Routing Notice:</strong><br/>
                 This OTP was requested for staff member <strong>${name}</strong> (<code>${targetRecipient}</code>). Because the Resend sandbox account is active, test emails are delivered to the verified owner inbox (<code>${fallbackEmail}</code>).
               </div>`
            : ''
        }
        <p class="info">Hello <strong>${name}</strong>,</p>
        <p class="info">You requested to set or reset your 4-digit workstation PIN for <strong>${hotelName}</strong>. Please use the one-time verification code below:</p>
        <div class="otp-box">${otp}</div>
        <p class="info">This code is valid for <strong>${expiresInMinutes} minutes</strong>. If you did not request this, please notify your Hotel Admin immediately.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} SpiceHub Multi-Tenant Hospitality Cloud. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!apiKey || apiKey === 'YOUR_RESEND_API_KEY' || apiKey.startsWith('placeholder')) {
    console.warn('[ResendEmailService] ⚠️ RESEND_API_KEY is not configured in backend/.env.');
    return {
      success: true,
      messageId: `dev-mock-${Date.now()}`,
      deliveredTo: targetRecipient,
      forwarded: false,
    };
  }

  // Attempt 1: Send directly to requested recipient
  try {
    const response = await axios.post(
      'https://api.resend.com/emails',
      {
        from: fromEmail,
        to: [targetRecipient],
        subject: `[${hotelName}] Your Staff PIN Verification OTP: ${otp}`,
        html: generateHtml(false),
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('[ResendEmailService] ✅ Email delivered directly via Resend API! Message ID:', response.data?.id);
    return {
      success: true,
      messageId: response.data?.id,
      deliveredTo: targetRecipient,
      forwarded: false,
    };
  } catch (err: any) {
    const errorDetails = err.response?.data?.message || err.message;
    console.warn('[ResendEmailService] ⚠️ Primary dispatch to', targetRecipient, 'failed:', errorDetails);

    // If recipient is already fallbackEmail, or error is not sandbox related, do not retry
    const isSandboxRestriction =
      err.response?.status === 403 ||
      (typeof errorDetails === 'string' &&
        (errorDetails.includes('testing emails to your own email address') ||
          errorDetails.includes('validation_error') ||
          errorDetails.includes('verify a domain')));

    if (isSandboxRestriction && targetRecipient !== fallbackEmail) {
      console.log(`[ResendEmailService] 🔄 Routing to verified owner inbox (${fallbackEmail}) due to Resend sandbox restrictions...`);
      try {
        const fallbackResponse = await axios.post(
          'https://api.resend.com/emails',
          {
            from: fromEmail,
            to: [fallbackEmail],
            subject: `[${hotelName}] Staff PIN OTP for ${name} (${targetRecipient}): ${otp}`,
            html: generateHtml(true),
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        console.log('[ResendEmailService] ✅ Email successfully routed to verified inbox! Message ID:', fallbackResponse.data?.id);
        return {
          success: true,
          messageId: fallbackResponse.data?.id,
          deliveredTo: fallbackEmail,
          forwarded: true,
        };
      } catch (fallbackErr: any) {
        const fallbackErrorDetails = fallbackErr.response?.data?.message || fallbackErr.message;
        console.error('[ResendEmailService] ❌ Fallback routing also failed:', fallbackErrorDetails);
        return {
          success: false,
          error: fallbackErrorDetails,
        };
      }
    }

    return {
      success: false,
      error: errorDetails,
    };
  }
}
