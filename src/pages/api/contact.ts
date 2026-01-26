import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

// Use process.env for Vercel runtime, import.meta.env for local dev
const resend = new Resend(process.env.RESEND_API_KEY || import.meta.env.RESEND_API_KEY);

// ─────────────────────────────────────────────────────────────
// Rate Limiting (stricter for contact form to prevent spam)
// ─────────────────────────────────────────────────────────────
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 3; // contact submissions per hour
const RATE_WINDOW = 3600000; // 1 hour in ms
let requestCounter = 0; // For periodic cleanup

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  // Periodic cleanup of expired entries to prevent Map growth
  // Use 10 due to 1-hour window (entries persist longer)
  if (++requestCounter % 10 === 0) {
    try {
      for (const [key, rec] of requestCounts) {
        if (now > rec.resetTime) requestCounts.delete(key);
      }
    } catch (cleanupError) {
      console.error('[RateLimit] Cleanup failed:', cleanupError);
    }
  }

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Rate limiting
  const ip = clientAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Too many submissions. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const data = await request.json();
    const { name, email, message } = data;

    // Validation
    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY && !import.meta.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send email using Resend
    const { data: emailData, error } = await resend.emails.send({
      from: 'Minoan Mystery <onboarding@resend.dev>',
      to: 'contact@tomdimino.com',
      replyTo: email,
      subject: `Contact Form: ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #966a85;">New Contact Form Submission</h2>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;">
              <strong style="color: #585858;">From:</strong> ${name}
            </p>
            <p style="margin: 0 0 10px 0;">
              <strong style="color: #585858;">Email:</strong> ${email}
            </p>
          </div>

          <div style="background-color: #faf5f8; padding: 20px; border-radius: 8px; border-left: 4px solid #966a85;">
            <p style="margin: 0 0 10px 0;">
              <strong style="color: #585858;">Message:</strong>
            </p>
            <p style="color: #585858; line-height: 1.6; margin: 0;">
              ${message.replace(/\n/g, '<br>')}
            </p>
          </div>

          <p style="color: #9c9c9c; font-size: 12px; margin-top: 30px;">
            Sent from Minoan Mystery Contact Form
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent successfully:', emailData);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Email send error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
