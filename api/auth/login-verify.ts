import { createClient } from "@supabase/supabase-js";
import { supabaseService } from '../_lib/supabase.js';
import { hashString } from '../_lib/utils.js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });
    const { email, otp, deviceId, password } = req.body;

    if (!email || !otp || !deviceId) return res.status(400).json({ error: "Data tidak lengkap." });

    const emailClean = email.toLowerCase().trim();
    const incomingHash = hashString(otp);

    try {
        const { data: dbOtps, error: fetchErr } = await supabaseService
          .from("otps")
          .select("*")
          .eq("email", emailClean)
          .order("created_at", { ascending: false });

        let isValidOtp = false;
        let targetUserId: string | null = null;

        if (!fetchErr && dbOtps && dbOtps.length > 0) {
          const matchingOtp = dbOtps.find(x => x.otp_code === incomingHash && new Date() < new Date(x.expires_at));
          if (matchingOtp) {
            isValidOtp = true;
            targetUserId = matchingOtp.user_id;
          }
        }

        if (!isValidOtp) return res.status(400).json({ error: "OTP salah atau expired." });

        const { data: profile } = await supabaseService.from("profiles").select("*").eq("email", emailClean).maybeSingle();
        const userIdFinal = targetUserId || profile?.id;

        const supabaseAnon = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
        const { data: authData } = await supabaseAnon.auth.signInWithPassword({
          email: emailClean,
          password: password || "default123",
        });

        // Simplified session handling for Vercel
        res.json({
          success: true,
          user: profile || { id: userIdFinal, email: emailClean },
          session: authData.session,
          message: "Login berhasil."
        });

    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
}
