import { supabaseService } from '../_lib/supabase.js';
import { hashString } from '../_lib/utils.js';
import { sendOtpHtmlEmail } from '../_lib/email.js';

async function safeDeleteOtp(email: string) {
  try {
    await supabaseService.from("otps").delete().eq("email", email);
  } catch (e) {
    console.error("Error in safeDeleteOtp:", e);
  }
}

async function safeInsertOtp(email: string, otpHash: string, expiresAt: Date) {
  await safeDeleteOtp(email);

  try {
    const { error } = await supabaseService.from("otps").insert({
      email,
      otp: otpHash,
      expires_at: expiresAt.toISOString()
    });
    if (!error) {
      console.log(`DEBUG: Successfully inserted OTP into 'otps' table.`);
      return { success: true };
    }
    console.error(`DEBUG: Failed inserting into 'otps' table:`, error);
    return { success: false, error };
  } catch (err: any) {
    console.error(`DEBUG: Exception inserting into 'otps' table:`, err);
    return { success: false, error: err };
  }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email wajib diisi." });
    }

    const emailClean = email.toLowerCase().trim();

    console.log(`DEBUG: Resend Register OTP Request (Vercel) - Email: ${emailClean}`);

    // Cek apakah profil ada dan belum terverifikasi
    const { data: profile, error: profileError } = await supabaseService
      .from("profiles")
      .select("*")
      .eq("email", emailClean)
      .maybeSingle();

    if (profileError) {
      console.error("Profile query error during resend OTP:", profileError);
      return res.status(500).json({ error: "Gagal mengakses profil pengguna." });
    }

    if (!profile) {
      return res.status(400).json({ error: "Email tidak terdaftar." });
    }

    const { data: { users }, error: authUsersError } = await supabaseService.auth.admin.listUsers();
    const authUser = authUsersError ? null : (users as any[]).find(u => u.email === emailClean);
    const isVerified = authUser && (authUser.email_confirmed_at || authUser.confirmed_at);

    if (isVerified) {
      return res.status(400).json({ error: "Akun ini sudah terverifikasi. Silakan langsung login." });
    }

    // Generate secure OTP baru
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashString(generatedOtp);
    const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

    // Simpan OTP dengan aman
    const otpRes = await safeInsertOtp(emailClean, otpHash, expiredAt);

    if (!otpRes.success) {
      console.error("OTP save error during resend:", otpRes.error);
      return res.status(500).json({ error: "Gagal menyimpan kode OTP baru." });
    }

    // Kirim Email OTP
    let emailSent = true;
    try {
      await sendOtpHtmlEmail(emailClean, generatedOtp, "register");
    } catch (mailErr: any) {
      emailSent = false;
      console.warn("SMTP email dispatch failed during resend. Operating in Simulation/Graceful-Fallback mode.", mailErr);
    }

    return res.json({
      success: true,
      simulatedOtp: emailSent ? undefined : generatedOtp,
      message: emailSent
        ? "Kode OTP baru telah dikirimkan ke email Anda."
        : `Kode OTP baru berhasil dibuat! (Mode Simulasi: SMTP tidak aktif). Kode OTP baru Anda: ${generatedOtp}`
    });

  } catch (err: any) {
    console.error("Resend OTP Error:", err);
    return res.status(500).json({ error: "Gagal mengirimkan OTP baru: " + err.message });
  }
}
