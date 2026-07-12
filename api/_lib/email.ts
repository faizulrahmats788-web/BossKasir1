import nodemailer from "nodemailer";

const getTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpHtmlEmail(email: string, otp: string, type: "login" | "forgot_password" | "register" | "signup") {
    const transporter = getTransporter();
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
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 30px; box-shadow: 0 10px 30px rgba(61, 43, 31, 0.05); border: 1px solid #e8dfd8; text-align: left;">
          <div style="text-align: center; margin-bottom: 30px;">
            <span style="font-size: 24px; font-weight: 900; color: #3d2b1f; letter-spacing: -1px; text-transform: uppercase; font-style: italic;">☕ BossKasir</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 800; color: #3d2b1f; margin-bottom: 10px; border-bottom: 2px solid #f2ece6; padding-bottom: 15px;">${title}</h2>
          <p style="font-size: 14px; color: #6b584c; line-height: 1.6; font-weight: 500;">Halo,</p>
          <p style="font-size: 14px; color: #6b584c; line-height: 1.6; font-weight: 500;">${subtitle}</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background-color: #3d2b1f; color: #ffffff; font-size: 32px; font-weight: 900; letter-spacing: 6px; padding: 15px 35px; border-radius: 20px; font-family: 'Courier New', monospace; box-shadow: 0 8px 20px rgba(61, 43, 31, 0.15); border: 2px solid #5a4130;">
              ${otp}
            </div>
          </div>
          
          <p style="font-size: 11px; color: #9c8473; background: #faf8f5; padding: 12px 16px; border-radius: 12px; border-left: 3px solid #ff9f43; line-height: 1.5; font-weight: bold;">
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

export async function sendUsernameHtmlEmail(email: string, username: string) {
    const transporter = getTransporter();

    const htmlBody = `
      <div style="font-family: 'Inter', sans-serif; background-color: #f7f3f0; padding: 40px 20px; text-align: center; border-radius: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 30px; box-shadow: 0 10px 30px rgba(61, 43, 31, 0.05); border: 1px solid #e8dfd8; text-align: left;">
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
