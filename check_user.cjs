const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY.replace(/^["']|["']$/g, ""));
async function run() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) console.error(error);
  else {
    const user = users.find(u => u.email === "fadoiru@gmail.com");
    console.log(JSON.stringify(user, null, 2));
  }
}
run();
