import { createClient } from "@supabase/supabase-js";
import { supabaseService } from '../_lib/supabase.js';
import { hashString } from '../_lib/utils.js';
import { sendOtpHtmlEmail } from '../_lib/email.js';
import crypto from "crypto";

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    // 1. Validasi Environment Variables
    const requiredEnv = [
      "VITE_SUPABASE_URL", 
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SMTP_HOST",
      "SMTP_USER",
      "SMTP_PASS"
    ];
    const missing = requiredEnv.filter(env => !process.env[env]);
    if (missing.length > 0) {
      return res.status(500).json({ error: "Environment variable belum lengkap", missing });
    }

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, Email, dan Password wajib diisi." });
    }

    const emailClean = email.toLowerCase().trim();
    const usernameClean = username.toLowerCase().trim();

    try {
      const { data: profileByEmail } = await supabaseService
        .from("profiles")
        .select("*")
        .eq("email", emailClean)
        .maybeSingle();

      const { data: profileByUsername } = await supabaseService
        .from("profiles")
        .select("*")
        .eq("username", usernameClean)
        .maybeSingle();

      const profile = profileByEmail || profileByUsername;
      
      const supabaseAnon = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

      const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
        email: emailClean,
        password: password,
      });

      if (authError || !authData.user) {
        return res.status(401).json({ error: `Password atau Email yang Anda masukkan tidak cocok.` });
      }

      const generatedOtp = crypto.randomInt ? crypto.randomInt(100000, 1000000).toString() : Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = hashString(generatedOtp);
      const expiredAt = new Date(Date.now() + 5 * 60 * 1000); 

      const targetUserId = authData.user.id;

      const { error: insertErr } = await supabaseService.from("otps").insert({
          email: emailClean,
          otp_code: otpHash,
          expires_at: expiredAt.toISOString(),
          user_id: targetUserId,
      });
        
      if (insertErr && insertErr.code === '23505') {
          await supabaseService.from("otps").update({
              otp_code: otpHash,
              expires_at: expiredAt.toISOString(),
          }).eq('email', emailClean);
      }

      await sendOtpHtmlEmail(emailClean, generatedOtp, "login");

      res.json({
        success: true,
        otpSent: true,
        email: emailClean,
        username: usernameClean,
        message: "Kode OTP 6-Digit telah dikirimkan ke email Anda."
      });

    } catch (err: any) {
      console.error("Initiate Login Error:", err);
      res.status(500).json({ error: "Terjadi kesalahan internal: " + err.message });
    }
}
