import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_EMAIL = "contact@menulove.com.au";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { business_name, abn, contact_email, reason, verified_business_name } = await req.json();

    // If Resend API key is available, send email
    if (RESEND_API_KEY) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MenuLove <noreply@menulove.com.au>",
          to: [NOTIFY_EMAIL],
          subject: `🔴 Removal Request: ${business_name}`,
          html: `
            <h2>New Listing Removal Request</h2>
            <table style="border-collapse:collapse;width:100%;max-width:500px;">
              <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Business Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${business_name}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Verified Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${verified_business_name || 'N/A'}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">ABN</td><td style="padding:8px;border-bottom:1px solid #eee;">${abn}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Contact Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${contact_email}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Reason</td><td style="padding:8px;border-bottom:1px solid #eee;">${reason || 'Not provided'}</td></tr>
            </table>
            <br/>
            <p>Review this request in the <a href="https://www.menulove.com.au/admin">Admin Dashboard</a>.</p>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error("Resend error:", await emailResponse.text());
      } else {
        console.log("Email notification sent to", NOTIFY_EMAIL);
      }
    } else {
      // Fallback: just log it
      console.log("REMOVAL REQUEST (no email configured):", { business_name, abn, contact_email, reason });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notify removal error:", error);
    return new Response(JSON.stringify({ error: "Failed to send notification" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
