import { supabaseService } from '../_lib/supabase.js';
import { sendUsernameHtmlEmail } from '../_lib/email.js';

export default async function handler(req: any, res: any) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: "Method Not Allowed" });
        }

        // 1. Validasi Environment Variables
        const requiredEnv = [
            "SMTP_HOST",
            "SMTP_USER",
            "SMTP_PASS"
        ];
        const missing = requiredEnv.filter(env => !process.env[env]);
        if (missing.length > 0) {
            return res.status(500).json({ error: "Environment variable belum lengkap", missing });
        }

        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email wajib diisi." });

        const emailClean = email.toLowerCase().trim();
        const { data: profiles, error } = await supabaseService.from("profiles").select("username").eq("email", emailClean);
        if (error || !profiles || profiles.length === 0) return res.status(400).json({ error: "Email tidak terdaftar." });
        if (profiles.length > 1) return res.status(400).json({ error: "Email terduplikasi." });

        await sendUsernameHtmlEmail(emailClean, profiles[0].username);
        return res.json({ success: true, message: "Username telah dikirim ke email Anda." });

    } catch (err: any) {
        console.error("API ERROR:", err);
        return res.status(500).json({
            error: "Terjadi kesalahan server",
            detail: err.message
        });
    }
}
