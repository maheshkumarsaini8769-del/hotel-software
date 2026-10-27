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
  error?: string;
  otpPreview?: string;
}

export async function sendPinVerificationOtpEmail(params: SendOtpEmailParams): Promise<SendOtpResult> {
  const { to, name = 'Staff Member', otp, hotelName = 'SpiceHub Hospitality', expiresInMinutes = 10 } = params;
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'SpiceHub Security <onboarding@resend.dev>';

  console.log(`[ResendEmailService] 📧 Preparing PIN verification OTP for ${to} (${name})`);
  console.log(`[ResendEmailService] 🔑 Generated OTP: ${otp} (Expires in ${expiresInMinutes} mins)`);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .logo { font-size: 22px; font-weight: 800; color: #d97706; margin-bottom: 20px; }
        .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .otp-box { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #b45309; background: #fef3c7; border: 2px dashed #f59e0b; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
        .info { font-size: 13.5px; line-height: 1.5; color: #475569; margin-bottom: 16px; }
        .footer { font-size: 11.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">🏨 SpiceHub Hospitality</div>
        <div class="title">Staff Workstation PIN Verification</div>
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
    console.warn('[ResendEmailService] ⚠️ RESEND_API_KEY is not configured in backend/.env. Logging OTP locally for development testing.');
    return {
      success: true,
      otpPreview: otp,
      messageId: `dev-mock-${Date.now()}`,
    };
  }

  try {
    const response = await axios.post(
      'https://api.resend.com/emails',
      {
        from: fromEmail,
        to: [to],
        subject: `[${hotelName}] Your Staff PIN Verification OTP: ${otp}`,
        html: htmlContent,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('[ResendEmailService] ✅ Email delivered via Resend API! Message ID:', response.data?.id);
    return {
      success: true,
      messageId: response.data?.id,
      otpPreview: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  } catch (err: any) {
    const errorDetails = err.response?.data?.message || err.message;
    console.error('[ResendEmailService] ❌ Failed to send email via Resend API:', errorDetails);
    return {
      success: process.env.NODE_ENV !== 'production',
      error: errorDetails,
      otpPreview: otp,
    };
  }
}
