import { supabaseService } from '../_lib/supabase';
import { sendUsernameHtmlEmail } from '../_lib/email';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email wajib diisi." });

    const emailClean = email.toLowerCase().trim();
    try {
      const { data: profiles, error } = await supabaseService.from("profiles").select("username").eq("email", emailClean);
      if (error || !profiles || profiles.length === 0) return res.status(400).json({ error: "Email tidak terdaftar." });
      if (profiles.length > 1) return res.status(400).json({ error: "Email terduplikasi." });

      await sendUsernameHtmlEmail(emailClean, profiles[0].username);
      res.json({ success: true, message: "Username telah dikirim ke email Anda." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
}
