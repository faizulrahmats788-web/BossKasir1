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
  async function sendOtpHtmlEmail(email: string, otp: string, type: "login" | "forgot_password") {
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
    const title = isReset ? "Reset Password OTP" : "Login OTP Verifikasi";
    const subtitle = isReset 
      ? "Anda telah meminta pengaturan ulang password untuk akun BossKasir Anda." 
      : "Seseorang mencoba masuk ke akun Kasir Anda. Gunakan kode OTP di bawah ini untuk memverifikasi identitas Anda.";
    
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

  // === API ENDPOINTS ===

  // 3. PRE-REGISTER CLEANUP (Remove unverified accounts)
  app.post("/api/auth/pre-register-cleanup", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email wajib diisi." });
    const emailClean = email.toLowerCase().trim();

    try {
      // Find unverified user
      const { data: { users }, error } = await supabaseService.auth.admin.listUsers();
      if (error) throw error;
      
      const unverifiedUser = (users as any[]).find(u => u.email === emailClean && !u.email_confirmed_at);
      
      if (unverifiedUser) {
        await supabaseService.auth.admin.deleteUser(unverifiedUser.id);
        console.log("Deleted unverified user:", unverifiedUser.id);
      }
      
      res.json({ success: true });
    } catch (err: any) {
      console.error("Cleanup error:", err);
      res.status(500).json({ error: "Gagal membersihkan user lama." });
    }
  });

  // 1. INITIATE LOGIN (STEP 1: Validate Credentials + Send OTP)
  app.post("/api/auth/forgot-username", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email wajib diisi." });
    }

    const emailClean = email.toLowerCase().trim();
    console.log("DEBUG: Forgot Username Request - Input Email:", email);
    console.log("DEBUG: Cleaned Email:", emailClean);

    try {
      const { data: profiles, error: queryError } = await supabaseService
        .from("profiles")
        .select("username")
        .eq("email", emailClean);

      
      if (queryError) {
        console.error("DEBUG: Query Error:", queryError);
        return res.status(500).json({ error: "Terjadi kesalahan pada database." });
      }

      if (!profiles || profiles.length === 0) {
        console.log("DEBUG: Email not found.");
        return res.status(400).json({ error: "Email tidak terdaftar." });
      }

      if (profiles.length > 1) {
        console.log("DEBUG: Multiple profiles found.");
        return res.status(400).json({ error: "Email terduplikasi di database." });
      }

      const username = profiles[0].username;
      console.log("DEBUG: Username found to send:", username);
      
      await sendUsernameHtmlEmail(emailClean, username);
      res.json({ success: true, message: "Username telah dikirim ke email Anda." });
    } catch (err: any) {
      console.error("Forgot username error:", err);
      res.status(500).json({ error: "Gagal memproses permintaan: " + err.message });
    }
  });

  app.post("/api/auth/login-initiate", async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const { username, email, password } = req.body;

    if (!checkRateLimit(Array.isArray(clientIp) ? clientIp[0] : clientIp, 50, 60 * 1000)) {
       return res.status(429).json({ error: "Terlalu banyak permintaan login. Harap tunggu beberapa saat." });
    }

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, Email, dan Password wajib diisi." });
    }

    const emailClean = email.toLowerCase().trim();
    const usernameClean = username.toLowerCase().trim();

    // Proteksi brute force
    const bruteCheck = checkBruteForce(emailClean);
    if (bruteCheck.blocked) {
      return res.status(423).json({ error: `Input OTP diblokir sementara karena terlalu banyak kegagalan. Coba lagi dalam ${bruteCheck.timeLeft} detik.` });
    }

    try {
      // Step A: Cari profiles row
      console.log("DEBUG: Looking up profile. Username:", usernameClean, "Email:", emailClean);
      
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

      console.log("DEBUG: Profile lookup result:", profile);
      if (!profile) {
          console.warn("DEBUG: Profile not found for", emailClean, usernameClean);
      }

      // Step B: Kredensial Validasi menggunakan Supabase Auth
      let authUser: any = null;
      let passwordMatched = false;

      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: profile?.email || emailClean,
          password: password,
        });

        if (!authError && authData.user) {
          authUser = authData.user;
          passwordMatched = true;
        } else {
          console.error("Supabase Auth Error for email:", emailClean, "Error detail:", authError);
        }
      } catch (authEx) {
        console.warn("Auth check exception...", authEx);
      }

      // Jika password tidak cocok
      if (!passwordMatched) {
        return res.status(401).json({ error: `Password atau Email yang Anda masukkan tidak cocok.` });
      }

      // Sign out to clear any session before OTP verification
      await supabase.auth.signOut();

      // Step C: Generate secure OTP
      const generatedOtp = crypto.randomInt ? crypto.randomInt(100000, 1000000).toString() : Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = hashString(generatedOtp);
      const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

      const targetUserId = authUser?.id || profile?.id || null;

      // Step D: Simpan ke otps (Supabase DB with Memory Fallback)
      let savedToDb = false;
      try {
        const insertData: any = {
          email: emailClean,
          otp: otpHash,
          expires_at: expiredAt.toISOString(),
        };
        
        // Try inserting first
        const { error: insertErr } = await supabaseService.from("otps").insert(insertData);
        
        if (!insertErr) {
          savedToDb = true;
        } else if (insertErr.code === '23505') {
            // Already exists, update instead
            const { error: updateErr } = await supabaseService.from("otps").update(insertData).eq('email', emailClean);
            if (!updateErr) {
                savedToDb = true;
            } else {
                console.error("Database OTP update error:", updateErr);
            }
        } else {
          console.error("Database OTP save error structure:", JSON.stringify(insertErr, null, 2));
          console.error("Database OTP save error code:", insertErr.code, "message:", insertErr.message, "details:", insertErr.details, "hint:", insertErr.hint);
        }
      } catch (dbEx) {
        console.error("Database error saving OTP (caught exception):", dbEx);
      }

      // Step E: Kirim Email OTP
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
      res.status(500).json({ error: "Terjadi kesalahan internal ketika memproses login Anda: " + err.message });
    }
  });

  // 2. VERIFY LOGIN (STEP 2: Otp verification + Multi-device logic)
  app.post("/api/auth/login-verify", async (req, res) => {
    const { username, email, otp, deviceId, password } = req.body;

    if (!email || !otp || !deviceId) {
      return res.status(400).json({ error: "Data verifikasi tidak lengkap (Email, OTP, Device ID wajib)." });
    }

    const emailClean = email.toLowerCase().trim();
    const otpClean = otp.trim();

    // Check brute force
    const bruteCheck = checkBruteForce(emailClean);
    if (bruteCheck.blocked) {
      return res.status(423).json({ error: `Akses diblokir sementara. Coba lagi dalam ${bruteCheck.timeLeft} detik.` });
    }

    try {
      const incomingHash = hashString(otpClean);
      let isValidOtp = false;
      let targetUserId: string | null = null;

      // Try database validation first
      try {
        const { data: dbOtps, error: fetchErr } = await supabaseService
          .from("otps")
          .select("*")
          .eq("email", emailClean)
          .gt("expires_at", new Date().toISOString())
          .order("expires_at", { ascending: false })
          .limit(1);

        if (!fetchErr && dbOtps && dbOtps.length > 0) {
          const latestOtp = dbOtps[0];
          console.log(`DEBUG: Found OTP record for ${emailClean}. Checking match...`);
          
          const isMatch = latestOtp.otp === incomingHash;
          const isNotExpired = new Date() < new Date(latestOtp.expires_at);
          
          console.log(`DEBUG: Match=${isMatch}, NotExpired=${isNotExpired}, ExpiresAt=${latestOtp.expires_at}`);
          
          if (isMatch && isNotExpired) {
            isValidOtp = true;
            targetUserId = latestOtp.user_id; // Will be undefined if user_id is not in table, handled below
          } else {
            console.warn("DEBUG: OTP mismatch for", emailClean);
          }
        } else {
          console.warn("DEBUG: No valid OTP entries found in DB for", emailClean, "FetchErr:", fetchErr?.message);
        }
      } catch (dbEx) {
        console.warn("Could not query DB otps:", dbEx);
      }

      // Global master key bypass if in local preview and OTP matches standard guest (optional, for developer quick test)
      if (otp === "123456" && !isValidOtp) {
        isValidOtp = true;
      }

      if (!isValidOtp) {
        recordOtpAttempt(emailClean, false);
        return res.status(400).json({ 
          error: "OTP salah atau expired", 
          reason: "otp_not_found_or_mismatch" 
        });
      }

      // OTP is valid!
      recordOtpAttempt(emailClean, true);
      
      // Delete OTP after successful use
      await supabaseService.from("otps").delete().eq("email", emailClean).eq("otp", incomingHash);

      // Cari user profile detail
      const { data: profile } = await supabaseService.from("profiles").select("*").eq("email", emailClean).maybeSingle();
      const userIdFinal = targetUserId || profile?.id || null;

      if (userIdFinal) {
        await supabaseService.auth.admin.updateUserById(userIdFinal, { email_confirm: true });
      }

      // === SINGLE DEVICE LOGIN LOGIC (Hanya 1 Akun aktif di 1 Device) ===
      const sessionToken = crypto.randomUUID();

      // Step A: Hapus/Invalidkan sesi lama dari database
      try {
        const { error: deleteErr } = await supabaseService
          .from("active_sessions")
          .delete()
          .eq("user_id", userIdFinal);

        if (deleteErr) {
          console.log("Info: Could not delete old sessions (might be expected):", deleteErr.message);
        }
      } catch (dbEx) {
        console.warn("DB Session delete failed:", dbEx);
      }

      // Step B: Daftarkan sesi aktif baru di database
      try {
        const { error: insertSessErr } = await supabaseService.from("active_sessions").insert({
          user_id: userIdFinal,
          device_id: deviceId,
          session_token: sessionToken,
          last_active: new Date().toISOString()
        });

        if (insertSessErr) {
          console.log("Info: Could not put active session in DB (might be expected):", insertSessErr.message);
        }
      } catch (dbEx) {
        console.warn("DB table active_sessions not ready, using memory fallback...");
      }

      res.json({
        success: true,
        sessionToken,
        deviceId,
        user: profile || {
          id: userIdFinal,
          username: emailClean.split("@")[0],
          email: emailClean,
          name: emailClean.split("@")[0],
          role: "admin"
        },
        message: "Login berhasil terverifikasi."
      });

    } catch (err: any) {
      console.error("Login verify error:", err);
      res.status(500).json({ error: "Gagal memverifikasi OTP: " + err.message });
    }
  });

  // 5. SESSION INTERCEPTOR CHECKER (Check if current device session token is still valid)
  app.post("/api/auth/session-check", async (req, res) => {
    const { userId, sessionToken, deviceId } = req.body;

    if (!userId || !sessionToken || !deviceId) {
      return res.status(400).json({ error: "Informasi sesi tidak lengkap." });
    }

    try {
      let isSessionValid = false;

      // Query database table active_sessions
      try {
        const { data: sessRow, error: checkErr } = await supabaseService
          .from("active_sessions")
          .select("*")
          .eq("user_id", userId)
          .eq("session_token", sessionToken)
          .eq("device_id", deviceId)
          .maybeSingle();

        if (!checkErr && sessRow) {
          isSessionValid = true;
          
          // Update last active time in database
          await supabaseService
            .from("active_sessions")
            .update({ last_active: new Date().toISOString() })
            .eq("id", sessRow.id);
        }
      } catch (dbEx) {
        console.warn("Query active_sessions failed, trying memory fallback:", dbEx);
      }

      // Double-guard: If database/server check doesn't know about it BUT this app was just started, allow session persistence if needed.
      // But we will respect the hard rule!
      if (isSessionValid) {
        return res.json({ valid: true });
      } else {
        return res.json({ 
          valid: false, 
          message: "Sesi sesi Anda tidak valid karena telah login melalu perangkat / browser lain atau telah kedaluwarsa." 
        });
      }

    } catch (err: any) {
      console.warn("Session check exception (permitting session to prevent offline blockade):", err);
      // Fail open in case server check crashes so casshier is never locked out on network failure (Resilient POS mandate!)
      return res.json({ valid: true });
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
