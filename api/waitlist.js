// /api/waitlist.js
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { email } = JSON.parse(req.body || "{}");
  if (!email || !email.includes("@"))
    return res.status(400).json({ message: "Invalid email" });

  // Check duplicates
  const { data: existing } = await supabase
    .from("waitlist")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return res.status(200).json({ message: "exists" });
  }

  // Add new email
  await supabase.from("waitlist").insert([{ email }]);

  // Send welcome email
  await resend.emails.send({
    from: "Shotro <team@shotro.ai>",
    to: email,
    subject: "Welcome to the Shotro Waitlist.",
    html: `<p>Hey there,</p><p>You're officially on the Shotro waitlist.</p><p>Stay tuned.</p><p>– The Shotro Team</p>`,
  });

  return res.status(200).json({ message: "added" });
}
