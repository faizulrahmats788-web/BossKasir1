import { supabaseService } from '../_lib/supabase';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method Not Allowed" });
    const { userId, sessionToken, deviceId } = req.body;
    if (!userId || !sessionToken || !deviceId) return res.status(400).json({ error: "Data tidak lengkap." });
    
    try {
        const { data, error } = await supabaseService.from("active_sessions")
            .select("*")
            .eq("user_id", userId)
            .eq("session_token", sessionToken)
            .eq("device_id", deviceId);
        
        res.json({ valid: !error && data && data.length > 0 });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
}
