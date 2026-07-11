import { supabaseService } from '../_lib/supabase.js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email wajib diisi." });
    try {
      const { data: { users }, error } = await supabaseService.auth.admin.listUsers();
      if (error) throw error;
      const unverifiedUser = (users as any[]).find(u => u.email === email.toLowerCase().trim() && !u.email_confirmed_at);
      if (unverifiedUser) await supabaseService.auth.admin.deleteUser(unverifiedUser.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
}
