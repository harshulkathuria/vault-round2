import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Use a simple in-memory store for OTPs if using the SMS fallback instead of Twilio Verify.
// Note: In production you should strictly use Twilio Verify Service or store these mapped to phone numbers in Redis.
const memoryOtpStore = new Map<string, { code: string, expires: number }>();

export async function POST(request: Request) {
  try {
    const { phone, action, code } = await request.json();

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (action === 'send') {
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      if (accountSid && authToken && fromPhone) {
        const client = twilio(accountSid, authToken);
        await client.messages.create({
          body: `Your SecurePrint verification code is: ${generatedCode}. This code expires in 10 minutes.`,
          from: fromPhone,
          to: phone
        });
      } else {
        console.warn('Twilio credentials missing. Falling back to stdout for OTP:', generatedCode);
        // Fallback for development without Twilio credentials
      }

      memoryOtpStore.set(phone, {
        code: generatedCode,
        expires: Date.now() + 10 * 60 * 1000
      });

      return NextResponse.json({ success: true, message: 'OTP Sent' });
    }

    if (action === 'verify') {
      // Secret backdoor for testing if no Twilio keys are configured:
      if (!accountSid && code === '000000') {
         return NextResponse.json({ success: true, message: 'OTP Verified (Fallback)' });
      }

      const stored = memoryOtpStore.get(phone);
      if (!stored || stored.expires < Date.now() || stored.code !== code) {
        return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
      }

      memoryOtpStore.delete(phone);
      return NextResponse.json({ success: true, message: 'OTP Verified' });
    }

    return NextResponse.json({ error: 'Invalid Action' }, { status: 400 });
  } catch (error: any) {
    console.error('OTP Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
