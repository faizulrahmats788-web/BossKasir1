import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Inisialisasi Supabase Client Server-Side
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/^["']|["']$/g, "");

const supabase = createClient(supabaseUrl, supabaseAnonKey);

let supabaseService = supabase;
if (supabaseServiceRoleKey) {
  supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
  });

  // Diagnostic check
  supabaseService.from("profiles").select("id", { count: "exact", head: true })
    .then(({ error }) => {
        if (error) {
            console.error("DIAGNOSTIC: Failed to access profiles as service role:", error);
        } else {
            console.log("DIAGNOSTIC: Successfully accessed profiles as service role.");
        }
    });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // === SISTEM KEAMANAN & PROTEKSI BRUTE FORCE ===
  const ipRateLimits = new Map<string, { count: number; resetAt: number }>();
  const otpAttempts = new Map<string, { attempts: number; blockUntil: number }>();

  function checkRateLimit(ip: string, limit = 15, windowMs = 60 * 1000): boolean {
    const now = Date.now();
    const data = ipRateLimits.get(ip);
    if (!data || now > data.resetAt) {
      ipRateLimits.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (data.count >= limit) return false;
    data.count++;
    return true;
  }

  function checkBruteForce(email: string, maxAttempts = 5, lockTimeMs = 5 * 60 * 1000) {
    const now = Date.now();
    const data = otpAttempts.get(email);
    if (data && now < data.blockUntil) {
      return { blocked: true, timeLeft: Math.ceil((data.blockUntil - now) / 1000) };
    }
    return { blocked: false, timeLeft: 0 };
  }

  function recordOtpAttempt(email: string, success: boolean, maxAttempts = 5, lockTimeMs = 5 * 60 * 1000) {
    const now = Date.now();
    const data = otpAttempts.get(email);
    if (success) {
      otpAttempts.delete(email);
      return;
    }
    if (!data) {
      otpAttempts.set(email, { attempts: 1, blockUntil: 0 });
      return;
    }
    data.attempts++;
    if (data.attempts >= maxAttempts) {
      data.blockUntil = now + lockTimeMs;
      data.attempts = 0; // reset
    }
  }

  // Helper Hashing SHA-256
  function hashString(str: string): string {
    return crypto.createHash("sha256").update(str).digest("hex");
  }

  // === NODEMAILER EMAIL HELPER WITH PREMIUM THEME ===
  async function sendOtpHtmlEmail(email: string, otp: string, type: "login" | "forgot_password" | "register" | "signup") {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const isReset = type === "forgot_password";
    const isRegister = type === "register" || type === "signup";
    const title = isRegister ? "Verifikasi Pendaftaran" : (isReset ? "Reset Password OTP" : "Login OTP Verifikasi");
    const subtitle = isRegister 
      ? "Selamat bergabung di BossKasir! Gunakan kode OTP di bawah ini untuk memverifikasi pendaftaran akun Anda."
      : (isReset 
        ? "Anda telah meminta pengaturan ulang password untuk akun BossKasir Anda." 
        : "Seseorang mencoba masuk ke akun Kasir Anda. Gunakan kode OTP di bawah ini untuk memverifikasi identitas Anda.");
    
    const htmlBody = `
      <div style="font-family: 'Inter', sans-serif; background-color: #f7f3f0; padding: 40px 20px; text-align: center; border-radius: 20px;">
        <div style="max-width: 500px; margin: 0 auto; bg-color: #ffffff; background: #ffffff; padding: 40px; border-radius: 30px; box-shadow: 0 10px 30px rgba(61, 43, 31, 0.05); border: 1px solid #e8dfd8; text-align: left;">
          <div style="text-align: center; margin-bottom: 30px;">
            <span style="font-size: 24px; font-weight: 900; color: #3d2b1f; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">☕ BossKasir</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 800; color: #3d2b1f; margin-bottom: 10px; border-bottom: 2px solid #f2ece6; pb: 15px; padding-bottom: 15px;">${title}</h2>
          <p style="font-size: 14px; color: #6b584c; line-height: 1.6; font-weight: 500;">Halo,</p>
          <p style="font-size: 14px; color: #6b584c; line-height: 1.6; font-weight: 500;">${subtitle}</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background-color: #3d2b1f; color: #ffffff; font-size: 32px; font-weight: 900; letter-spacing: 6px; padding: 15px 35px; border-radius: 20px; font-family: 'Courier New', monospace; box-shadow: 0 8px 20px rgba(61, 43, 31, 0.15); border: 2px solid #5a4130;">
              ${otp}
            </div>
          </div>
          
          <p style="font-size: 11px; color: #9c8473; bg-color: #faf6f2; background: #faf8f5; padding: 12px 16px; border-radius: 12px; border-left: 3px solid #ff9f43; line-height: 1.5; font-weight: bold;">
            ⚠️ <b>Penting:</b> Kode OTP ini berlaku selama <b>5 Menit</b> dan hanya dapat digunakan <b>1 Kali</b>. Jangan pernah membeberkan kode ini kepada siapa pun demi keamanan akun kasor Anda.
          </p>
          
          <div style="margin-top: 30px; border-top: 1px solid #f2ece6; padding-top: 20px; font-size: 11px; text-align: center; color: #bca08d; font-weight: bold;">
            Aplikasi BossKasir - Keamanan Berlapis & Handal<br/>
            Jika Anda tidak meminta email ini, silakan abaikan dengan aman.
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "BossKasir security"}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `[BossKasir] ${title} - ${otp}`,
      text: `${subtitle} Kode OTP Anda: ${otp}. Kode berlaku selama 5 menit.`,
      html: htmlBody,
    });
  }

  async function sendUsernameHtmlEmail(email: string, username: string) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const htmlBody = `
      <div style="font-family: 'Inter', sans-serif; background-color: #f7f3f0; padding: 40px 20px; text-align: center; border-radius: 20px;">
        <div style="max-width: 500px; margin: 0 auto; bg-color: #ffffff; background: #ffffff; padding: 40px; border-radius: 30px; box-shadow: 0 10px 30px rgba(61, 43, 31, 0.05); border: 1px solid #e8dfd8; text-align: left;">
          <div style="text-align: center; margin-bottom: 30px;">
            <span style="font-size: 24px; font-weight: 900; color: #3d2b1f; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">☕ BossKasir</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 800; color: #3d2b1f; margin-bottom: 10px;">Informasi Username</h2>
          <p style="font-size: 14px; color: #6b584c; line-height: 1.6; font-weight: 500;">Halo,</p>
          <p style="font-size: 14px; color: #6b584c; line-height: 1.6; font-weight: 500;">Anda telah meminta informasi username untuk akun BossKasir Anda.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background-color: #f2ece6; color: #3d2b1f; font-size: 20px; font-weight: 700; padding: 15px 35px; border-radius: 20px; font-family: 'Courier New', monospace; border: 1px solid #dcd1c9;">
              ${username}
            </div>
          </div>
          
          <div style="margin-top: 30px; border-top: 1px solid #f2ece6; padding-top: 20px; font-size: 11px; text-align: center; color: #bca08d; font-weight: bold;">
            Aplikasi BossKasir - Keamanan Berlapis & Handal
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "BossKasir security"}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `[BossKasir] Informasi Username Anda`,
      text: `Halo, username Anda adalah: ${username}`,
      html: htmlBody,
    });
  }

  // Resilient OTP Helper Functions
  async function safeDeleteOtp(email: string) {
    try {
      await supabaseService.from("otps").delete().eq("email", email);
    } catch (e) {
      console.error("Error in safeDeleteOtp:", e);
    }
  }

  async function safeInsertOtp(email: string, otpHash: string, type: string, expiresAt: Date, userId?: string) {
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

  // === API ENDPOINTS ===

  // 1. REGISTER INITIATE (Creates unverified auth user, seeds default data, and sends OTP)
  app.post("/api/auth/register-initiate", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nama, Email, dan Password wajib diisi." });
    }

    const emailClean = email.toLowerCase().trim();
    const nameClean = name.trim();

    try {
      console.log(`DEBUG: Register Initiate Request - Email: ${emailClean}, Name: ${nameClean}`);

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
        // Delete profile and user
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

      // Simpan OTP dengan aman menggunakan safeInsertOtp
      const otpRes = await safeInsertOtp(emailClean, otpHash, "register", expiredAt, newUserId);

      if (!otpRes.success) {
        console.error("OTP save error:", otpRes.error);
        return res.status(500).json({ error: "Gagal menyimpan OTP pendaftaran." });
      }

      // Step G: Kirim Email OTP
      let emailSent = true;
      let emailError = null;
      try {
        await sendOtpHtmlEmail(emailClean, generatedOtp, "register");
      } catch (mailErr: any) {
        emailSent = false;
        emailError = mailErr.message;
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
  });

  // 2. VERIFY REGISTER OTP (Validates OTP, marks profile as verified, and confirms email)
  app.post("/api/auth/verify-register-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email dan Kode OTP wajib diisi." });
    }

    const emailClean = email.toLowerCase().trim();
    const otpClean = otp.trim();
    const otpHash = hashString(otpClean);

    try {
      console.log(`DEBUG: Verify Register OTP Request - Email: ${emailClean}`);

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

      // Step C: Bersihkan OTP secara resilient
      await safeDeleteOtp(emailClean);

      return res.json({
        success: true,
        message: "Verifikasi berhasil! Akun Anda telah aktif. Silakan masuk menggunakan email dan password."
      });

    } catch (err: any) {
      console.error("Verify OTP Error:", err);
      return res.status(500).json({ error: "Gagal memproses verifikasi OTP: " + err.message });
    }
  });

  // 3. RESEND REGISTER OTP (Generates and sends a new registration OTP)
  app.post("/api/auth/resend-register-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email wajib diisi." });
    }

    const emailClean = email.toLowerCase().trim();

    try {
      console.log(`DEBUG: Resend Register OTP Request - Email: ${emailClean}`);

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

      // Simpan OTP dengan aman menggunakan safeInsertOtp
      const otpRes = await safeInsertOtp(emailClean, otpHash, "register", expiredAt, profile.id);

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
  });

  // 4. FORGOT USERNAME (Keeps backward compatibility if needed)
  app.post("/api/auth/forgot-username", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email wajib diisi." });
    }

    const emailClean = email.toLowerCase().trim();
    console.log("DEBUG: Forgot Username Request - Input Email:", email);

    try {
      let username = null;
      
      const { data: profiles, error: queryError } = await supabaseService
        .from("profiles")
        .select("username")
        .eq("email", emailClean);

      if (queryError) {
        console.error("DEBUG: Query Error:", queryError);
        return res.status(500).json({ error: "Terjadi kesalahan pada database." });
      }

      if (profiles && profiles.length > 0) {
        username = profiles[0].username;
      } else {
        // Fallback: check auth.users if they registered but haven't verified
        const { data: { users }, error: usersError } = await supabaseService.auth.admin.listUsers();
        
        if (!usersError && users) {
          const user = (users as any[]).find(u => u.email === emailClean);
          if (user) {
            username = user.user_metadata?.username || emailClean.split('@')[0];

            // Auto-heal profile
            try {
              await supabaseService.from("profiles").upsert({
                id: user.id,
                email: emailClean,
                username: username,
                name: username,
                role: 'admin'
              }, { onConflict: 'id' });
            } catch (ex) {
              console.warn("DEBUG: Auto-heal profile failed", ex);
            }
          }
        }
      }

      if (!username) {
        return res.status(400).json({ error: "Email tidak terdaftar." });
      }
      
      let emailSent = true;
      try {
        await sendUsernameHtmlEmail(emailClean, username);
      } catch (mailErr: any) {
        emailSent = false;
        console.warn("SMTP email dispatch failed during forgot-username. Operating in Simulation/Graceful-Fallback mode.", mailErr);
      }

      res.json({
        success: true,
        message: emailSent
          ? "Username telah dikirim ke email Anda."
          : `Informasi Akun (Mode Simulasi): Username Anda adalah: ${username}`
      });
    } catch (err: any) {
      console.error("Forgot username error:", err);
      res.status(500).json({ error: "Gagal memproses permintaan: " + err.message });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Explicit route for reset-password to guarantee 200 OK SPA fallback
    app.get('/reset-password', async (req, res, next) => {
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });

    app.use(vite.middlewares);
    
    // Explicit SPA fallback for development to handle direct navigation to /reset-password
    app.use('*', async (req, res, next) => {
      try {
        if (req.originalUrl.startsWith('/api')) return next();
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/reset-password', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
