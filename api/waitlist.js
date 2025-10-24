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

    const { data: existing } = await supabase
      .from('waitlist')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existing) return res.status(200).json({ message: 'exists' });

    await supabase.from('waitlist').insert([{ email }]);

    await resend.emails.send({
      from: 'Shotro Team <team@shotro.ai>',
      to: email,
      subject: 'Welcome to the Shotro Waitlist 🎬',
      html: '<p>Welcome! You’re officially on the Shotro waitlist.</p>'
    });

    return res.status(200).json({ message: 'added' });
  } catch (error) {
    console.error('Waitlist Error:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
