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
        const otpClean = otp.trim();
        const incomingHash = hashString(otpClean);

        const { data: dbOtps, error: fetchErr } = await supabaseService
            .from("otps")
            .select("*")
            .eq("email", emailClean)
            .gt("expires_at", new Date().toISOString())
            .order("expires_at", { ascending: false })
            .limit(1);

        let isValidOtp = false;
        let targetUserId: string | null = null;

        if (fetchErr) {
            console.error(`DEBUG: Failed to fetch OTP for ${emailClean}. Error:`, fetchErr);
        }

        if (!fetchErr && dbOtps && dbOtps.length > 0) {
            const latestOtp = dbOtps[0];
            console.log(`DEBUG: Found OTP record for ${emailClean}. Checking match...`);
            
            const isMatch = latestOtp.otp === incomingHash;
            const isNotExpired = new Date() < new Date(latestOtp.expires_at);
            
            console.log(`DEBUG: Match=${isMatch}, NotExpired=${isNotExpired}, ExpiresAt=${latestOtp.expires_at}`);
            
            if (isMatch && isNotExpired) {
                isValidOtp = true;
                // Delete the OTP as it has been used
                await supabaseService.from("otps").delete().eq("email", emailClean).eq("otp", incomingHash);
            } else {
                console.warn(`DEBUG: OTP mismatch for ${emailClean}.`);
            }
        } else {
            console.warn(`DEBUG: No valid OTP found in DB for ${emailClean}.`);
        }

        if (!isValidOtp) {
            return res.status(400).json({ error: "OTP salah atau expired", reason: "otp_not_found" });
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
