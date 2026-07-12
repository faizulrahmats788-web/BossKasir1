import { supabaseService } from '../_lib/supabase.js';
import { hashString } from '../_lib/utils.js';

async function safeDeleteOtp(email: string) {
  try {
    await supabaseService.from("otps").delete().eq("email", email);
  } catch (e) {
    console.error("Error in safeDeleteOtp:", e);
  }
}

async function safeVerifyOtp(email: string, otpHash: string) {
  try {
    const { data, error } = await supabaseService
      .from("otps")
      .select("*")
      .eq("email", email);
      
    if (!error && data && data.length > 0) {
      for (const row of data) {
        if (row.otp === otpHash) {
          const isNotExpired = new Date() < new Date(row.expires_at);
          if (isNotExpired) {
            console.log(`DEBUG: Successfully verified OTP on table 'otps'`);
            return { success: true, row };
          } else {
            console.warn(`DEBUG: Found matching OTP on table 'otps' but it has expired`);
            return { success: false, expired: true };
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`Exception reading OTP from table 'otps':`, err.message);
  }
  return { success: false, expired: false };
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email dan Kode OTP wajib diisi." });
    }

    const emailClean = email.toLowerCase().trim();
    const otpClean = otp.trim();
    const otpHash = hashString(otpClean);

    console.log(`DEBUG: Verify Register OTP Request (Vercel) - Email: ${emailClean}`);

    // Query database untuk mencocokkan OTP secara resilient
    const verifyRes = await safeVerifyOtp(emailClean, otpHash);

    if (!verifyRes.success) {
      if (verifyRes.expired) {
        return res.status(400).json({ error: "Kode OTP telah kedaluwarsa. Silakan minta kirim ulang OTP." });
      }
      return res.status(400).json({ error: "Kode OTP salah atau tidak cocok." });
    }

    // OTP Benar dan Valid!
    // Step A: Confirm the email in Supabase Auth
    const { data: { users }, error: usersError } = await supabaseService.auth.admin.listUsers();
    if (!usersError && users) {
      const matchingUser = (users as any[]).find(u => u.email === emailClean);
      if (matchingUser) {
        await supabaseService.auth.admin.updateUserById(matchingUser.id, { email_confirm: true });
        console.log(`DEBUG: Confirmed email in Supabase Auth for: ${matchingUser.id}`);
      }
    }

    // Step B: Bersihkan OTP secara resilient
    await safeDeleteOtp(emailClean);

    return res.json({
      success: true,
      message: "Verifikasi berhasil! Akun Anda telah aktif. Silakan masuk menggunakan email dan password."
    });

  } catch (err: any) {
    console.error("Verify OTP Error:", err);
    return res.status(500).json({ error: "Gagal memproses verifikasi OTP: " + err.message });
  }
}
