// /api/waitlist.js
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email } = body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    // ✅ Check if email already exists
    const { data: existing, error: checkError } = await supabase
      .from('waitlist')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      console.log('Email already exists:', email);
      return res.status(200).json({ message: 'exists' });
    }

    // ✅ Add new email
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert([{ email }]);

    if (insertError) throw insertError;

    // ✅ Send welcome email
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

    console.log('Added new email:', email);
    return res.status(200).json({ message: 'added' });

  } catch (error) {
    console.error('Waitlist Error:', error);
    return res.status(500).json({ message: 'error', detail: error.message });
  }
};
