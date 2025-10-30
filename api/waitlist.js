// /api/waitlist.js
const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { email, name, occupation, portfolio } = body || {};

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    // ✅ Step 1: Check for duplicates first
    const { data: existing, error: checkError } = await supabase
      .from('waitlist')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('Supabase pre-check error:', checkError);
      return res.status(500).json({ message: 'error', detail: checkError.message });
    }

    if (existing) {
      console.log('Duplicate signup prevented:', email);
      return res.status(200).json({ message: 'exists' });
    }

    // ✅ Step 2: Insert new record (with all optional fields)
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert([{ 
        email, 
        name: name || null, 
        occupation: occupation || null, 
        portfolio: portfolio || null 
      }]);

    if (insertError) {
      if (insertError.code === '23505' || /duplicate key/i.test(insertError.message)) {
        console.log('Duplicate signup (race condition):', email);
        return res.status(200).json({ message: 'exists' });
      }
      console.error('Insert error:', insertError);
      return res.status(500).json({ message: 'error', detail: insertError.message });
    }

    // ✅ Step 3: Build optional info block for email
    const optionalLines = [];
    if (name) optionalLines.push(`<p><strong>Name:</strong> ${name}</p>`);
    if (occupation) optionalLines.push(`<p><strong>Occupation:</strong> ${occupation}</p>`);
    if (portfolio)
      optionalLines.push(`<p><strong>Portfolio:</strong> <a href="${portfolio}" target="_blank">${portfolio}</a></p>`);

    // ✅ Step 4: Send welcome email
    try {
      await resend.emails.send({
        from: 'Shotro Team <team@shotro.ai>',
        to: email,
        subject: 'Welcome to the Shotro Waitlist!',
        html: `
          <p>Hey${name ? ' ' + name.split(' ')[0] : ''},</p>
          <p>You’re officially on the Shotro waitlist.</p>
          <p>Stay tuned — cinematic AI is coming soon.</p>
          ${optionalLines.length ? optionalLines.join('') : ''}
          <p>– The Shotro Team</p>
        `,
      });

      console.log('Welcome email sent:', email);
    } catch (mailErr) {
      console.error('Resend mail send error:', mailErr);
    }

    return res.status(200).json({ message: 'added' });

  } catch (error) {
    console.error('Waitlist handler error:', error);
    return res.status(500).json({ message: 'error', detail: error.message });
  }
};
