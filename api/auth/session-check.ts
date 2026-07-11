import { supabaseService } from '../_lib/supabase.js';

export default async function handler(req: any, res: any) {
    try {
        if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });

        const { userId, sessionToken, deviceId } = req.body;
        if (!userId || !sessionToken || !deviceId) return res.status(400).json({ error: "Data tidak lengkap." });
        
        const { data, error } = await supabaseService.from("active_sessions")
            .select("*")
            .eq("user_id", userId)
            .eq("session_token", sessionToken)
            .eq("device_id", deviceId);
        
        return res.json({ valid: !error && data && data.length > 0 });
    } catch (err: any) {
        console.error("API ERROR:", err);
        return res.status(500).json({
            error: "Terjadi kesalahan server",
            detail: err.message
        });
    }
}
