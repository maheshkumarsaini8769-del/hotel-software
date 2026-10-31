import crypto from 'crypto';

export class RazorpayService {
  /**
   * Verifies Razorpay signature using SHA256 HMAC
   * @param orderId Razorpay order ID or invoice ID
   * @param paymentId Razorpay payment ID (e.g. pay_29QQoUBi66xm2f)
   * @param signature Razorpay signature submitted by client/webhook
   * @param secret Razorpay Key Secret
   */
  public static verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
    secret: string = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_key_spicehub_2026'
  ): boolean {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const actualBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  }

  /**
   * Generates mock/real payment link or order
   */
  public static createOrder(amountINR: number, receipt: string) {
    const safeAmount = Math.max(1, Math.round(amountINR * 100)); // amount in paise
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      id: orderId,
      entity: 'order',
      amount: safeAmount,
      amount_paid: 0,
      amount_due: safeAmount,
      currency: 'INR',
      receipt,
      status: 'created',
      attempts: 0,
    };
  }
}
