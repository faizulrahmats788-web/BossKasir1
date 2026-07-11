import { createClient } from "@supabase/supabase-js";
import { supabaseService } from '../_lib/supabase.js';
import { hashString } from '../_lib/utils.js';
import { sendOtpHtmlEmail } from '../_lib/email.js';
import crypto from "crypto";

export default async function handler(req: any, res: any) {
    try {
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
        const emailToUse = profile?.email || emailClean;
        
        const supabaseAnon = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

        const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
            email: emailToUse,
            password: password,
        });

        if (authError || !authData.user) {
            return res.status(401).json({ error: `Password atau Email yang Anda masukkan tidak cocok.` });
        }
        
        // Sign out to clear any session before OTP verification
        await supabaseAnon.auth.signOut();

        const generatedOtp = crypto.randomInt ? crypto.randomInt(100000, 1000000).toString() : Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = hashString(generatedOtp);
        const expiredAt = new Date(Date.now() + 5 * 60 * 1000); 

        const insertData = {
            email: emailClean,
            otp: otpHash,
            expires_at: expiredAt.toISOString(),
        };

        const { data: insertedOtp, error: insertErr } = await supabaseService.from("otps").insert(insertData).select().single();
        
        if (!insertErr) {
            console.log(`DEBUG: OTP Successfully saved for ${emailClean}. OTP ID: ${insertedOtp?.id}, Expires: ${insertedOtp?.expires_at}`);
        } else if (insertErr.code === '23505') {
            const { data: updatedOtp, error: updateErr } = await supabaseService.from("otps").update(insertData).eq('email', emailClean).select().single();
            if (!updateErr) {
                console.log(`DEBUG: OTP Successfully updated for ${emailClean}. OTP ID: ${updatedOtp?.id}, Expires: ${updatedOtp?.expires_at}`);
            } else {
                console.error("Database OTP update error:", updateErr);
                return res.status(500).json({ error: "Gagal menyimpan kode OTP.", details: updateErr.message });
            }
        } else {
            console.error("Database OTP save error:", insertErr);
            return res.status(500).json({ error: "Gagal menyimpan kode OTP. Pastikan tabel otps tersedia.", details: insertErr.message });
        }

        await sendOtpHtmlEmail(emailClean, generatedOtp, "login");

        return res.json({
            success: true,
            otpSent: true,
            email: emailClean,
            username: usernameClean,
            message: "Kode OTP 6-Digit telah dikirimkan ke email Anda."
        });

    } catch (err: any) {
        console.error("API ERROR:", err);
        return res.status(500).json({
            error: "Terjadi kesalahan server",
            detail: err.message
        });
    }
}
