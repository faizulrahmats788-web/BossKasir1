import { createClient } from "@supabase/supabase-js";
import { supabaseService } from '../_lib/supabase.js';
import { hashString } from '../_lib/utils.js';

export default async function handler(req: any, res: any) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: "Method Not Allowed" });
        }

        // 1. Validasi Environment Variables
        const requiredEnv = [
            "VITE_SUPABASE_URL", 
            "VITE_SUPABASE_ANON_KEY"
        ];
        const missing = requiredEnv.filter(env => !process.env[env]);
        if (missing.length > 0) {
            return res.status(500).json({ error: "Environment variable belum lengkap", missing });
        }

        const { email, otp, deviceId, password } = req.body;

        if (!email || !otp || !deviceId) {
            return res.status(400).json({ error: "Data tidak lengkap." });
        }

        const emailClean = email.toLowerCase().trim();
        const incomingHash = hashString(otp);

        const { data: dbOtps, error: fetchErr } = await supabaseService
            .from("otps")
            .select("*")
            .eq("email", emailClean)
            .order("created_at", { ascending: false });

        let isValidOtp = false;
        let targetUserId: string | null = null;

        if (!fetchErr && dbOtps && dbOtps.length > 0) {
            const matchingOtp = dbOtps.find(x => x.otp === incomingHash && new Date() < new Date(x.expires_at));
            if (matchingOtp) {
                isValidOtp = true;
                targetUserId = matchingOtp.user_id;
            }
        }

        if (!isValidOtp) {
            return res.status(400).json({ error: "OTP salah atau expired." });
        }

        const { data: profile } = await supabaseService.from("profiles").select("*").eq("email", emailClean).maybeSingle();
        const userIdFinal = targetUserId || profile?.id;

        const supabaseAnon = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
        const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
            email: emailClean,
            password: password || "default123",
        });

        if (authError) {
             return res.status(401).json({ error: "Gagal memverifikasi session." });
        }

        return res.json({
            success: true,
            user: profile || { id: userIdFinal, email: emailClean },
            session: authData.session,
            message: "Login berhasil."
        });

    } catch (err: any) {
        console.error("API ERROR:", err);
        return res.status(500).json({
            error: "Terjadi kesalahan server",
            detail: err.message
        });
    }
}
