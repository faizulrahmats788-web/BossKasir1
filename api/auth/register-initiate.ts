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

    // 1. Validasi Environment Variables
    const requiredEnv = [
      "VITE_SUPABASE_URL", 
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY"
    ];
    const missing = requiredEnv.filter(env => !process.env[env]);
    if (missing.length > 0) {
      return res.status(500).json({ error: "Environment variable belum lengkap", missing });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nama, Email, dan Password wajib diisi." });
    }

    const emailClean = email.toLowerCase().trim();
    const nameClean = name.trim();

    console.log(`DEBUG: Register Initiate Request (Vercel) - Email: ${emailClean}, Name: ${nameClean}`);

    // Step A: Cek apakah email sudah terdaftar dan terverifikasi
    const { data: existingProfile, error: queryError } = await supabaseService
      .from("profiles")
      .select("*")
      .eq("email", emailClean)
      .maybeSingle();

    const { data: { users }, error: listError } = await supabaseService.auth.admin.listUsers();
    if (listError) throw listError;

    const existingAuthUser = (users as any[]).find(u => u.email === emailClean);
    const isVerified = existingAuthUser && (existingAuthUser.email_confirmed_at || existingAuthUser.confirmed_at);

    if (existingProfile && isVerified) {
      return res.status(400).json({ error: "Email ini sudah terdaftar dan terverifikasi. Silakan login." });
    }

    // Step B: Jika terdaftar tetapi belum terverifikasi, bersihkan data lama agar bisa daftar ulang
    if (existingAuthUser) {
      console.log(`DEBUG: Found unverified existing auth user: ${existingAuthUser.id}. Cleaning up before fresh register.`);
      await supabaseService.from("profiles").delete().eq("id", existingAuthUser.id);
      await supabaseService.auth.admin.deleteUser(existingAuthUser.id);
    }

    // Step C: Buat user baru di Supabase Auth
    const { data: newAuthData, error: createUserError } = await supabaseService.auth.admin.createUser({
      email: emailClean,
      password: password,
      email_confirm: false
    });

    if (createUserError || !newAuthData.user) {
      console.error("Supabase Admin createUser error:", createUserError);
      return res.status(400).json({ error: createUserError?.message || "Gagal membuat pengguna baru." });
    }

    const newUserId = newAuthData.user.id;

    // Step D: Buat profil unverified di database
    const usernameVal = emailClean.split('@')[0] + "_" + Math.floor(1000 + Math.random() * 9000);
    
    const insertPayload = {
      id: newUserId,
      username: usernameVal,
      email: emailClean,
      name: nameClean,
      role: 'admin'
    };
    
    const { error: profileError } = await supabaseService.from("profiles").upsert(insertPayload, { onConflict: 'id' });

    if (profileError) {
      console.error("Create profile error:", profileError);
      // Rollback auth user
      await supabaseService.auth.admin.deleteUser(newUserId);
      return res.status(500).json({ error: "Gagal membuat profil kasir: " + profileError.message });
    }

    // Step E: Seed default data (Cafe Settings & Payment Methods)
    const { error: settingsError } = await supabaseService.from("cafe_settings").upsert({
      user_id: newUserId,
      name: "My Cafe",
      address: "",
      phone: "",
      logo_url: null,
      tax_rate: 0,
      currency: "Rp"
    }, { onConflict: 'user_id' });

    if (settingsError) {
      console.warn("Seeding default cafe settings warning:", settingsError.message);
    }

    const pmData = [
      { id: `${newUserId}-cash`, user_id: newUserId, name: "Tunai", type: "cash", is_active: true },
      { id: `${newUserId}-qris`, user_id: newUserId, name: "QRIS", type: "non-cash", is_active: true },
      { id: `${newUserId}-card`, user_id: newUserId, name: "Kartu Debit/Kredit", type: "non-cash", is_active: true }
    ];
    const { error: pmError } = await supabaseService.from("payment_methods").upsert(pmData, { onConflict: 'id' });
    if (pmError) {
      console.warn("Seeding default payment methods warning:", pmError.message);
    }

    // Step F: Generate secure OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashString(generatedOtp);
    const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

    // Simpan OTP dengan aman
    const otpRes = await safeInsertOtp(emailClean, otpHash, expiredAt);

    if (!otpRes.success) {
      console.error("OTP save error:", otpRes.error);
      return res.status(500).json({ error: "Gagal menyimpan OTP pendaftaran." });
    }

    // Step G: Kirim Email OTP
    let emailSent = true;
    try {
      await sendOtpHtmlEmail(emailClean, generatedOtp, "register");
    } catch (mailErr: any) {
      emailSent = false;
      console.warn("SMTP email dispatch failed. Operating in Simulation/Graceful-Fallback mode.", mailErr);
    }

    return res.json({
      success: true,
      email: emailClean,
      simulatedOtp: emailSent ? undefined : generatedOtp,
      message: emailSent
        ? "Registrasi berhasil didaftarkan. Silakan periksa email Anda untuk kode verifikasi."
        : `Registrasi berhasil! (Mode Simulasi: Pengiriman email gagal / SMTP belum terkonfigurasi). Kode OTP Anda adalah: ${generatedOtp}`
    });

  } catch (err: any) {
    console.error("Register Initiate Error:", err);
    return res.status(500).json({ error: "Gagal mendaftarkan akun baru: " + err.message });
  }
}
