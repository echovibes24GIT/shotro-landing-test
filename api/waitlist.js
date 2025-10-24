// /api/waitlist.js
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email } = body || {};

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    // Optional pre-check (nice UX, but not sufficient alone)
    const { data: existing, error: checkError } = await supabase
      .from('waitlist')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('Pre-check error:', checkError);
    } else if (existing) {
      console.log('Already exists (pre-check):', email);
      return res.status(200).json({ message: 'exists' });
    }

    // Insert (authoritative) – will throw on duplicates
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert([{ email }]);

    if (insertError) {
      // If it's a unique violation, treat as "exists"
      if (insertError.code === '23505' || /duplicate key value/i.test(insertError.message)) {
        console.log('Already exists (unique constraint):', email);
        return res.status(200).json({ message: 'exists' });
      }
      console.error('Insert error:', insertError);
      return res.status(500).json({ message: 'error', detail: insertError.message });
    }

    // Send welcome email only for fresh signups
    try {
      await resend.emails.send({
        from: 'Shotro Team <team@shotro.ai>',
        to: email,
        subject: 'Welcome to the Shotro Waitlist 🎬',
        html: `
          <p>Hey there,</p>
          <p>You’re officially on the Shotro waitlist.</p>
          <p>Stay tuned — cinematic AI is coming soon.</p>
          <p>– The Shotro Team</p>
        `,
      });
    } catch (mailErr) {
      // Log but don't fail the signup if email send hiccups
      console.error('Resend error (mail send):', mailErr);
    }

    console.log('Added new email:', email);
    return res.status(200).json({ message: 'added' });

  } catch (error) {
    console.error('Waitlist Error (handler):', error);
    return res.status(500).json({ message: 'error', detail: error.message });
  }
};
