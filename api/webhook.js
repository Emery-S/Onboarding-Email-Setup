import Stripe from "stripe";

export const config = {
  api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── HANDLER ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const rawBody = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email;

    if (!email) {
      console.error("No email found on session:", session.id);
      return res.status(200).json({ received: true });
    }

    let productName = "";
    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ["data.price.product"],
      });
      const product = lineItems.data[0]?.price?.product;
      productName =
        (typeof product === "object" ? product?.name : "") ||
        lineItems.data[0]?.description ||
        "";
    } catch (err) {
      console.error("Failed to fetch line items:", err.message);
      return res.status(500).send("Failed to fetch line items");
    }

    console.log(`Purchase: "${productName}" → ${email}`);

    if (productName.includes("Student"))       await sendEmail(email, "student");
    else if (productName.includes("Rising Star"))  await sendEmail(email, "rising");
    if (productName.includes("North Star"))   await sendEmail(email, "north");
    if (productName.includes("Executive"))    await sendEmail(email, "executive");
  }

  return res.status(200).json({ received: true });
}

// ─── EMAIL SENDER ─────────────────────────────────────────────────────────────

async function sendEmail(to, type) {
  const templates = {
    student: {
      subject: "You're in. Welcome to MN Women in AI 💜",
      html: STUDENT_STAR_HTML,
    },
    rising: {
      subject: "You're in. Welcome to the MN Women in AI Rising Star Membership Program 💜",
      html: RISING_STAR_HTML,
    },
    north: {
      subject: "You're a North Star Member. Welcome home. 💜",
      html: NORTH_STAR_HTML,
    },
    executive: {
      subject: "Welcome to Executive Insider. Let's build something. 💜",
      html: EXECUTIVE_HTML,
    },
  };

  const { subject, html } = templates[type];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Caroline Holden <caroline@contact.swiftstartgo.com>",
      to,
      cc: "caroline@swiftstartgo.com",
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Resend error for [${type}] to ${to}:`, error);
    throw new Error(`Resend failed: ${error}`);
  } else {
    console.log(`Email [${type}] sent to ${to}`);
  }
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────

const SHARED_STYLES = `
<style>
  body { margin: 0; padding: 0; background-color: #f4eeff; font-family: Georgia, 'Times New Roman', serif; }
  table { border-collapse: collapse; }
  img { display: block; border: 0; outline: none; text-decoration: none; }
  .preheader { display: none; max-height: 0; overflow: hidden; mso-hide: all; }
  .outer { background-color: #f4eeff; padding: 36px 16px; }
  .card { background-color: #ffffff; max-width: 580px; margin: 0 auto; }
  .header-cell { background-color: #3b0075; padding: 44px 48px 36px; text-align: center; }
  .logo-img { width: 90px; height: 90px; margin: 0 auto 20px; }
  .badge-text {
    display: inline-block;
    font-family: Helvetica, Arial, sans-serif;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: #ddc8ff;
    border: 1px solid rgba(220,180,255,0.4);
    padding: 4px 14px;
    margin-bottom: 18px;
  }
  h1 {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 28px;
    font-weight: normal;
    color: #ffffff;
    line-height: 1.3;
    margin: 0 0 12px;
  }
  .tagline {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 14px;
    color: #c8a8f0;
    line-height: 1.65;
    margin: 0;
  }
  .body-cell { background-color: #ffffff; padding: 40px 48px; }
  .body-cell p {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 15px;
    line-height: 1.75;
    color: #2d1a4a;
    margin: 0 0 20px;
  }
  .divider { border: none; border-top: 1px solid #e8dcf7; margin: 28px 0; }
  .section-label {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #7700cc;
    margin: 0 0 10px;
  }
  .section-heading {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 19px;
    font-weight: normal;
    color: #2d0055;
    margin: 0 0 14px;
    line-height: 1.3;
  }
  .body-cell ol, .body-cell ul {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 14px;
    color: #2d1a4a;
    line-height: 1.85;
    margin: 0 0 16px;
    padding-left: 20px;
  }
  .body-cell a { color: #6600bb; text-decoration: underline; }
  .note-text {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 12px;
    color: #9070b0;
    font-style: italic;
    margin: 8px 0 0;
  }
  .founding-cell {
    background-color: #f7f0ff;
    border-left: 3px solid #9933ee;
    padding: 20px 24px;
    margin: 24px 0;
  }
  .founding-label {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #7700cc;
    margin: 0 0 10px;
  }
  .founding-cell p {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 14px;
    color: #2d1a4a;
    line-height: 1.75;
    margin: 0 0 10px;
  }
  .founding-cell ul {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 14px;
    color: #2d1a4a;
    line-height: 1.85;
    margin: 0;
    padding-left: 18px;
  }
  .code-label {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #9070b0;
    text-align: center;
    margin: 0 0 10px;
  }
  .code-value {
    font-family: 'Courier New', Courier, monospace;
    font-size: 24px;
    font-weight: bold;
    letter-spacing: 4px;
    color: #3b0075;
    text-align: center;
    background-color: #f0e8ff;
    padding: 14px 32px;
    display: block;
  }
  .footer-cell { background-color: #ffffff; padding: 0 48px 44px; }
  .footer-cell p {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 14px;
    color: #5a3a7a;
    line-height: 1.75;
    margin: 0 0 6px;
  }
  .footer-cell strong { color: #2d0055; }
  .footer-cell em { color: #9070b0; font-style: italic; }
</style>`;

// ─── STUDENT STAR ─────────────────────────────────────────────────────────────

const STUDENT_STAR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome, Student Star</title>
  ${SHARED_STYLES}
</head>
<body>
<span class="preheader">You're officially in. Welcome to MN Women in AI. 💜</span>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4eeff;">
  <tr><td class="outer">
    <table class="card" width="580" cellpadding="0" cellspacing="0" border="0" align="center" style="background:#ffffff;max-width:580px;margin:0 auto;">

      <!-- HEADER -->
      <tr>
        <td class="header-cell" align="center" style="background-color:#3b0075;padding:44px 48px 36px;text-align:center;">
          <img src="https://onboarding-email-setup.vercel.app/logo.png" alt="MN Women in AI" width="90" height="90" class="logo-img" style="width:90px;height:90px;margin:0 auto 20px;display:block;" />
          <div class="badge-text" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2.5px;text-transform:uppercase;color:#ddc8ff;border:1px solid rgba(220,180,255,0.4);padding:4px 14px;display:inline-block;margin-bottom:18px;">Student Star Membership</div>
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:normal;color:#ffffff;line-height:1.3;margin:0 0 12px;">You're officially in. 💜</h1>
          <p class="tagline" style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#c8a8f0;line-height:1.65;margin:0;">Welcome to MN Women in AI — 500+ women learning, building, and shaping the future of AI in Minnesota. We're so glad you're starting your journey with us.</p>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td class="body-cell" style="background-color:#ffffff;padding:40px 48px;">
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#2d1a4a;margin:0 0 20px;">We believe the next generation of AI leaders is already in the room — and we're so glad you're one of them. This community was built for women who are curious, driven, and ready to grow. That's you.</p>

          <hr class="divider" style="border:none;border-top:1px solid #e8dcf7;margin:28px 0;" />

          <p class="section-label" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#7700cc;margin:0 0 8px;">A quick favor ✨</p>
          <p class="section-heading" style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:normal;color:#2d0055;margin:0 0 14px;line-height:1.3;">Two small things that make a big difference</p>
          <ol style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#2d1a4a;line-height:1.85;margin:0 0 16px;padding-left:20px;">
            <li style="margin-bottom:10px;"><strong>Please fill out <a href="https://forms.gle/iZkc4o1CsYYLiMa38" style="color:#6600bb;">our welcome survey</a></strong> — it helps us match you to the right people and opportunities. Takes just 3–5 minutes.</li>
            <li><strong>Check your inbox</strong> — we sent you invitations to our <strong>Substack newsletter</strong> and <strong>Slack channel</strong>. These are the best ways to hear about new events and connect with members daily.</li>
          </ol>

          <hr class="divider" style="border:none;border-top:1px solid #e8dcf7;margin:28px 0;" />

          <p class="section-label" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#7700cc;margin:0 0 8px;">Your membership</p>
          <p class="section-heading" style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:normal;color:#2d0055;margin:0 0 14px;line-height:1.3;">What's included</p>
          <ul style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#2d1a4a;line-height:1.85;margin:0 0 10px;padding-left:20px;">
            <li>Up to 3 paid expert-led events per month (AI Study Group is always free)</li>
            <li>Access to all available event recordings</li>
            <li>Opportunities to grow your network and skills</li>
          </ul>
          <p class="note-text" style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#9070b0;font-style:italic;margin:8px 0 0;">Keep an eye on Slack and our Substack for event announcements and invites.</p>

          <hr class="divider" style="border:none;border-top:1px solid #e8dcf7;margin:28px 0;" />

          <!-- EVENT CODE -->
          <p class="code-label" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#9070b0;text-align:center;margin:0 0 10px;">Your code for up to 3 free events per month</p>
          <p class="code-value" style="font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:bold;letter-spacing:4px;color:#3b0075;text-align:center;background-color:#f0e8ff;padding:14px 32px;margin:0;">STUDENTSTAR</p>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td class="footer-cell" style="background-color:#ffffff;padding:8px 48px 44px;">
          <hr style="border:none;border-top:1px solid #e8dcf7;margin:0 0 28px;" />
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#5a3a7a;line-height:1.75;margin:0 0 6px;">With excitement,</p>
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#5a3a7a;line-height:1.75;margin:0;"><strong style="color:#2d0055;">Caroline Holden</strong><br>Founder, MN Women in AI<br><em style="color:#9070b0;">Brought to you by Swift Start Go</em></p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

// ─── RISING STAR ──────────────────────────────────────────────────────────────

const RISING_STAR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome, Rising Star</title>
  ${SHARED_STYLES}
</head>
<body>
<span class="preheader">You're officially in. Welcome to MN Women in AI. 💜</span>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4eeff;">
  <tr><td class="outer">
    <table class="card" width="580" cellpadding="0" cellspacing="0" border="0" align="center" style="background:#ffffff;max-width:580px;margin:0 auto;">

      <!-- HEADER -->
      <tr>
        <td class="header-cell" align="center" style="background-color:#3b0075;padding:44px 48px 36px;text-align:center;">
          <img src="https://onboarding-email-setup.vercel.app/logo.png" alt="MN Women in AI" width="90" height="90" class="logo-img" style="width:90px;height:90px;margin:0 auto 20px;display:block;" />
          <div class="badge-text" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2.5px;text-transform:uppercase;color:#ddc8ff;border:1px solid rgba(220,180,255,0.4);padding:4px 14px;display:inline-block;margin-bottom:18px;">Rising Star Membership</div>
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:normal;color:#ffffff;line-height:1.3;margin:0 0 12px;">You're officially in. 💜</h1>
          <p class="tagline" style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#c8a8f0;line-height:1.65;margin:0;">Welcome to the MN Women in AI community — 500+ women learning, building, and shaping the future of AI in Minnesota.</p>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td class="body-cell" style="background-color:#ffffff;padding:40px 48px;">
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#2d1a4a;margin:0 0 20px;">We are so glad you're here. You've just joined a community of curious, driven women who are showing up at the forefront of AI in Minnesota — and we can't wait for you to be part of it.</p>

          <hr class="divider" style="border:none;border-top:1px solid #e8dcf7;margin:28px 0;" />

          <p class="section-label" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#7700cc;margin:0 0 8px;">A quick favor ✨</p>
          <p class="section-heading" style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:normal;color:#2d0055;margin:0 0 14px;line-height:1.3;">Two small things that make a big difference</p>
          <ol style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#2d1a4a;line-height:1.85;margin:0 0 16px;padding-left:20px;">
            <li style="margin-bottom:10px;"><strong>Please fill out <a href="https://forms.gle/iZkc4o1CsYYLiMa38" style="color:#6600bb;">our welcome survey</a></strong> — it helps us match you to the right people and opportunities. Takes just 3–5 minutes.</li>
            <li><strong>Check your inbox</strong> — we sent you invitations to our <strong>Substack newsletter</strong> and <strong>Slack channel</strong>. These are the best ways to hear about new events and connect with members daily.</li>
          </ol>

          <hr class="divider" style="border:none;border-top:1px solid #e8dcf7;margin:28px 0;" />

          <p class="section-label" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#7700cc;margin:0 0 8px;">Your membership</p>
          <p class="section-heading" style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:normal;color:#2d0055;margin:0 0 14px;line-height:1.3;">What's included</p>
          <ul style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#2d1a4a;line-height:1.85;margin:0 0 10px;padding-left:20px;">
            <li>Up to 3 paid expert-led events per month (AI Study Group is always free)</li>
            <li>Access to all available event recordings</li>
            <li>Opportunities to grow your network and skills</li>
          </ul>
          <p class="note-text" style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#9070b0;font-style:italic;margin:8px 0 0;">Keep an eye on Slack and our Substack for event announcements and invites.</p>

          <hr class="divider" style="border:none;border-top:1px solid #e8dcf7;margin:28px 0;" />

          <!-- EVENT CODE -->
          <p class="code-label" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#9070b0;text-align:center;margin:0 0 10px;">Your code for up to 3 free events per month</p>
          <p class="code-value" style="font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:bold;letter-spacing:4px;color:#3b0075;text-align:center;background-color:#f0e8ff;padding:14px 32px;margin:0;">RISINGSTAR</p>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td class="footer-cell" style="background-color:#ffffff;padding:8px 48px 44px;">
          <hr style="border:none;border-top:1px solid #e8dcf7;margin:0 0 28px;" />
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#5a3a7a;line-height:1.75;margin:0 0 6px;">With excitement,</p>
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#5a3a7a;line-height:1.75;margin:0;"><strong style="color:#2d0055;">Caroline Holden</strong><br>Founder, MN Women in AI<br><em style="color:#9070b0;">Brought to you by Swift Start Go</em></p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

// ─── NORTH STAR ───────────────────────────────────────────────────────────────

const NORTH_STAR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome, North Star Member</title>
  ${SHARED_STYLES}
</head>
<body>
<span class="preheader">You're a North Star Member. Welcome home. 💜</span>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4eeff;">
  <tr><td class="outer">
    <table class="card" width="580" cellpadding="0" cellspacing="0" border="0" align="center" style="background:#ffffff;max-width:580px;margin:0 auto;">

      <!-- HEADER -->
      <tr>
        <td class="header-cell" align="center" style="background-color:#3b0075;padding:44px 48px 36px;text-align:center;">
          <img src="https://onboarding-email-setup.vercel.app/logo.png" alt="MN Women in AI" width="90" height="90" class="logo-img" style="width:90px;height:90px;margin:0 auto 20px;display:block;" />
          <div class="badge-text" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2.5px;text-transform:uppercase;color:#ddc8ff;border:1px solid rgba(220,180,255,0.4);padding:4px 14px;display:inline-block;margin-bottom:18px;">North Star Membership</div>
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:normal;color:#ffffff;line-height:1.3;margin:0 0 12px;">Welcome and thank you for going all in. 💜</h1>
          <p class="tagline" style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#c8a8f0;line-height:1.65;margin:0;">You just became a North Star Member of MN Women in AI — a community of 500+ women across Minnesota at the center of how AI gets built and adopted.</p>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td class="body-cell" style="background-color:#ffffff;padding:40px 48px;">

          <p class="section-label" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#7700cc;margin:0 0 8px;">A quick favor ✨</p>
          <p class="section-heading" style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:normal;color:#2d0055;margin:0 0 14px;line-height:1.3;">Two small things that make a big difference</p>
          <ol style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#2d1a4a;line-height:1.85;margin:0 0 16px;padding-left:20px;">
            <li style="margin-bottom:10px;"><strong>Please fill out <a href="https://forms.gle/iZkc4o1CsYYLiMa38" style="color:#6600bb;">our welcome survey</a></strong> — this helps us match you with the right AI Accountability group, member matches, and other opportunities. Takes 3–5 minutes.</li>
            <li><strong>Check your inbox</strong> — if you aren't already on our lists, we sent you invitations to our <strong>Substack newsletter</strong> and <strong>Slack channel</strong>. These are the best ways to hear about new events and connect with members daily.</li>
          </ol>

          <hr class="divider" style="border:none;border-top:1px solid #e8dcf7;margin:28px 0;" />

          <p class="section-label" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#7700cc;margin:0 0 8px;">Your membership</p>
          <p class="section-heading" style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:normal;color:#2d0055;margin:0 0 14px;line-height:1.3;">What's included</p>
          <ul style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#2d1a4a;line-height:1.85;margin:0 0 10px;padding-left:20px;">
            <li><strong>All monthly events</strong> — talks, panels, AI workshops, study groups, &amp; exclusive events</li>
            <li><strong>All available recordings</strong> of events, minus AI Study Group <em>(coming in April)</em></li>
            <li><strong>Curated AI Accountability Groups</strong> &amp; Member Matching <em>(coming in April)</em></li>
            <li><strong>Exclusive Workshops</strong> &amp; Virtual Pop-Ups <em>(coming in April)</em></li>
            <li><strong>Your local AI opportunities newsletter</strong> <em>(coming in April)</em></li>
          </ul>
          <p class="note-text" style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#9070b0;font-style:italic;margin:8px 0 0;">Keep an eye on Slack and our Substack for event announcements. AI Accountability Group invitations will arrive via email.</p>

          <hr class="divider" style="border:none;border-top:1px solid #e8dcf7;margin:28px 0;" />

          <!-- EVENT CODE -->
          <p class="code-label" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#9070b0;text-align:center;margin:0 0 10px;">Your code for up to 3 free events per month</p>
          <p class="code-value" style="font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:bold;letter-spacing:4px;color:#3b0075;text-align:center;background-color:#f0e8ff;padding:14px 32px;margin:0;">NORTHSTAR</p>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td class="footer-cell" style="background-color:#ffffff;padding:8px 48px 44px;">
          <hr style="border:none;border-top:1px solid #e8dcf7;margin:0 0 28px;" />
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#5a3a7a;line-height:1.75;margin:0 0 6px;">With excitement,</p>
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#5a3a7a;line-height:1.75;margin:0;"><strong style="color:#2d0055;">Caroline Holden</strong><br>Founder, MN Women in AI<br><em style="color:#9070b0;">Brought to you by Swift Start Go</em></p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

// ─── EXECUTIVE INSIDER ────────────────────────────────────────────────────────

const EXECUTIVE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome, Executive Insider</title>
  ${SHARED_STYLES}
</head>
<body>
<span class="preheader">Welcome to Executive Insider. Let's build something. 💜</span>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4eeff;">
  <tr><td class="outer">
    <table class="card" width="580" cellpadding="0" cellspacing="0" border="0" align="center" style="background:#ffffff;max-width:580px;margin:0 auto;">

      <!-- HEADER -->
      <tr>
        <td class="header-cell" align="center" style="background-color:#3b0075;padding:44px 48px 36px;text-align:center;">
          <img src="https://onboarding-email-setup.vercel.app/logo.png" alt="MN Women in AI" width="90" height="90" class="logo-img" style="width:90px;height:90px;margin:0 auto 20px;display:block;" />
          <div class="badge-text" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2.5px;text-transform:uppercase;color:#ddc8ff;border:1px solid rgba(220,180,255,0.4);padding:4px 14px;display:inline-block;margin-bottom:18px;">Executive Insider</div>
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:normal;color:#ffffff;line-height:1.3;margin:0 0 12px;">Let's build something. 💜</h1>
          <p class="tagline" style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#c8a8f0;line-height:1.65;margin:0;">Welcome to Executive Insider — Minnesota's network for women leading, shaping, and accelerating AI.</p>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td class="body-cell" style="background-color:#ffffff;padding:40px 48px;">
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.75;color:#2d1a4a;margin:0 0 20px;">You didn't just join a membership — you stepped into a leadership circle. Executive Insider is designed for women who are already making moves in AI and want a community that matches that energy. We are honored you're here.</p>

          <hr class="divider" style="border:none;border-top:1px solid #e8dcf7;margin:28px 0;" />

          <p class="section-label" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#7700cc;margin:0 0 8px;">A quick favor ✨</p>
          <p class="section-heading" style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:normal;color:#2d0055;margin:0 0 14px;line-height:1.3;">Two small things that make a big difference</p>
          <ol style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#2d1a4a;line-height:1.85;margin:0 0 16px;padding-left:20px;">
            <li style="margin-bottom:10px;"><strong>Please fill out <a href="https://forms.gle/iZkc4o1CsYYLiMa38" style="color:#6600bb;">our welcome survey</a></strong> — this helps us connect you to the right rooms, people, and opportunities from day one. Takes 3–5 minutes.</li>
            <li><strong>Check your inbox</strong> — watch for your invitations to our <strong>Substack newsletter</strong> and <strong>Slack community</strong>. That's where Executive Insider members stay sharp and connected daily.</li>
          </ol>

          <hr class="divider" style="border:none;border-top:1px solid #e8dcf7;margin:28px 0;" />

          <p class="section-label" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#7700cc;margin:0 0 8px;">Your membership</p>
          <p class="section-heading" style="font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:normal;color:#2d0055;margin:0 0 14px;line-height:1.3;">Executive Insider benefits</p>
          <ul style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#2d1a4a;line-height:1.85;margin:0 0 10px;padding-left:20px;">
            <li>Free tickets to all monthly events</li>
            <li>Full event recordings library</li>
            <li>Curated AI Accountability Groups &amp; Member Matching</li>
            <li>Exclusive workshops &amp; virtual pop-ups</li>
            <li>Local AI opportunities newsletter</li>
            <li>Speaking invitations at MN Women in AI events</li>
            <li>PR &amp; speaking referrals</li>
            <li>Opportunities to share content on our website &amp; socials</li>
            <li>Scholarships for students and new grads in your network</li>
          </ul>

          <hr class="divider" style="border:none;border-top:1px solid #e8dcf7;margin:28px 0;" />

          <!-- EVENT CODE -->
          <p class="code-label" style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#9070b0;text-align:center;margin:0 0 10px;">Your event access code</p>
          <p class="code-value" style="font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:bold;letter-spacing:4px;color:#3b0075;text-align:center;background-color:#f0e8ff;padding:14px 32px;margin:0;">EXECUTIVE</p>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td class="footer-cell" style="background-color:#ffffff;padding:8px 48px 44px;">
          <hr style="border:none;border-top:1px solid #e8dcf7;margin:0 0 28px;" />
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#5a3a7a;line-height:1.75;margin:0 0 6px;">With excitement,</p>
          <p style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#5a3a7a;line-height:1.75;margin:0;"><strong style="color:#2d0055;">Caroline Holden</strong><br>Founder, MN Women in AI<br><em style="color:#9070b0;">Brought to you by Swift Start Go</em></p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;