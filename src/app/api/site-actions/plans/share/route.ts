import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST - Share action plans via email
export async function POST(req: NextRequest) {
  const token = req.cookies.get("fb_session")?.value;
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ error: "Login required" }, { status: 401 });

  // Verify admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, full_name")
    .eq("email", payload.email.toLowerCase())
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { plans, emails } = await req.json();
  
  if (!plans || !Array.isArray(plans) || plans.length === 0) {
    return NextResponse.json({ error: "No plans to share" }, { status: 400 });
  }
  
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: "No recipients specified" }, { status: 400 });
  }

  // Build email content
  const plansList = plans.map((plan: any, i: number) => {
    let issues: string[] = [];
    let actions: string[] = [];
    try { issues = JSON.parse(plan.issues); } catch {}
    try { actions = JSON.parse(plan.action_items); } catch {}
    
    const siteLabel = plan.site.charAt(0).toUpperCase() + plan.site.slice(1);
    
    return `
${i + 1}. ${siteLabel} - ${plan.priority.toUpperCase()} priority
   Summary: ${plan.summary}
   Status: ${plan.status.replace("_", " ")}
   
   Issues (${issues.length}):
   ${issues.map((j: string) => "   - " + j).join("\n")}
   
   Action Items (${actions.length}):
   ${actions.map((a: string, j: number) => "   " + (j + 1) + ". " + a).join("\n")}
    `.trim();
  }).join("\n\n");

  const emailBody = `Action Plans Shared by ${profile.full_name || payload.email}

The following action plans have been shared with you for review:

${plansList}

---
Shared from Feedback Portal`;

  // Send email via AgentMail (same as login system)
  const agentMailKey = process.env.AGENTMAIL_API_KEY;
  if (!agentMailKey) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.agentmail.to/v0/inboxes/bensbot@agentmail.to/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${agentMailKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: emails,
        subject: `Action Plans: ${plans.length} plan${plans.length !== 1 ? "s" : ""} for review`,
        text: emailBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[share] Email error:", err);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, sent: emails.length });
  } catch (err) {
    console.error("[share] Error:", err);
    return NextResponse.json({ error: "Failed to share plans" }, { status: 500 });
  }
}
