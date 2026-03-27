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

  // Buffer raw body without 'micro' — works natively on Vercel
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

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const productName = lineItems.data[0]?.description || "";

    console.log(`Purchase: "${productName}" → ${email}`);

    if (productName.includes("Rising Star")) await sendEmail(email, "rising");
    if (productName.includes("North Star"))  await sendEmail(email, "north");
    if (productName.includes("Executive"))   await sendEmail(email, "executive");
  }

  return res.status(200).json({ received: true });
}

// ─── EMAIL SENDER ─────────────────────────────────────────────────────────────

async function sendEmail(to, type) {
  const templates = {
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
      from: "Caroline Holden <caroline@swiftstartgo.com>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Resend error for [${type}] to ${to}:`, error);
  } else {
    console.log(`Email [${type}] sent to ${to}`);
  }
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
// LOGO SETUP:
//   1. Create a /public folder in your project root
//   2. Add your logo as /public/logo.png
//   3. Deploy to Vercel
//   4. Replace YOUR_LOGO_URL below (all 3 spots) with:
//      https://your-project.vercel.app/logo.png

const SHARED_STYLES = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Playfair+Display:wght@700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background-color: #1a0033;
    color: #f0e6ff;
    font-family: 'DM Sans', Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 0;
  }
  .wrapper { background-color: #1a0033; padding: 40px 16px; }
  .container {
    max-width: 580px;
    margin: 0 auto;
    background: linear-gradient(160deg, #2a005c 0%, #1a0033 100%);
    border-radius: 20px;
    border: 1px solid rgba(180, 100, 255, 0.2);
    overflow: hidden;
  }
  .header {
    background: linear-gradient(135deg, #4a00a0 0%, #2a005c 100%);
    padding: 40px 40px 32px;
    text-align: center;
    border-bottom: 1px solid rgba(180, 100, 255, 0.2);
  }
  .logo { width: 100px; margin-bottom: 24px; }
  .badge {
    display: inline-block;
    background: rgba(180, 100, 255, 0.2);
    border: 1px solid rgba(180, 100, 255, 0.4);
    color: #d9a8ff;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 5px 14px;
    border-radius: 100px;
    margin-bottom: 16px;
  }
  h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 30px;
    color: #ffffff;
    line-height: 1.25;
    margin-bottom: 14px;
  }
  .tagline { font-size: 15px; color: #c9a8ff; line-height: 1.6; }
  .body { padding: 36px 40px; }
  p { font-size: 15px; line-height: 1.7; color: #e0ccff; margin-bottom: 20px; }
  .section {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(180, 100, 255, 0.15);
    border-radius: 14px;
    padding: 24px;
    margin: 24px 0;
  }
  .section h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 18px;
    color: #e8ccff;
    margin-bottom: 14px;
  }
  .section p { margin-bottom: 12px; }
  .section ol { padding-left: 20px; }
  .section ol li { font-size: 14px; color: #d4b3ff; line-height: 2; margin-bottom: 4px; }
  .section ul { padding-left: 18px; }
  .section ul li { font-size: 14px; color: #d4b3ff; line-height: 2; }
  .section a { color: #d9a8ff; text-decoration: underline; }
  .section strong { color: #e8d0ff; }
  .note { font-size: 13px; color: #a07ac0; font-style: italic; margin-top: 10px; margin-bottom: 0; }
  .code-block { text-align: center; margin: 28px 0; }
  .code-block .label {
    font-size: 12px;
    color: #a07ac0;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .code {
    display: inline-block;
    background: linear-gradient(135deg, #5e00b5, #7c00e0);
    border: 1px solid rgba(180, 100, 255, 0.4);
    color: #ffffff;
    font-family: 'Courier New', monospace;
    font-size: 22px;
    font-weight: bold;
    letter-spacing: 3px;
    padding: 12px 32px;
    border-radius: 10px;
  }
  .founding-banner {
    background: linear-gradient(135deg, rgba(180, 100, 255, 0.12), rgba(100, 0, 200, 0.12));
    border: 1px solid rgba(180, 100, 255, 0.3);
    border-radius: 14px;
    padding: 22px 24px;
    margin: 24px 0;
  }
  .founding-title {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: #c97bff;
    margin-bottom: 12px;
  }
  .founding-banner p { font-size: 14px; color: #d4b3ff; line-height: 1.7; margin-bottom: 10px; }
  .founding-banner ul { padding-left: 18px; }
  .founding-banner ul li { font-size: 14px; color: #d4b3ff; line-height: 2; }
  .footer { padding: 0 40px 40px; }
  .footer p { font-size: 15px; color: #c9a8ff; }
  .footer strong { color: #ffffff; }
  .footer em { color: #9060b0; font-style: italic; }
  hr { border: none; border-top: 1px solid rgba(180, 100, 255, 0.15); margin: 28px 0; }
</style>`;

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
<div class="wrapper">
  <div class="container">

    <div class="header">
      <img src="YOUR_LOGO_URL" alt="MN Women in AI" class="logo" />
      <div class="badge">Rising Star Membership</div>
      <h1>You're officially in. 💜</h1>
      <p class="tagline">Welcome to the MN Women in AI community — 500+ women learning, building, and shaping the future of AI in Minnesota.</p>
    </div>

    <div class="body">
      <p>We are so glad you're here. You've just joined a community of curious, driven women who are showing up at the forefront of AI in Minnesota — and we can't wait for you to be part of it.</p>

      <div class="section">
        <h2>✨ Could You Do Us a Quick Favor?</h2>
        <ol>
          <li>
            <strong>Please fill out <a href="https://forms.gle/iZkc4o1CsYYLiMa38">our welcome survey</a></strong> — it helps us match you to the right people and opportunities. Takes just 3–5 minutes.
          </li>
          <li>
            <strong>Check your inbox</strong> — we sent you invitations to our <strong>Substack newsletter</strong> and <strong>Slack channel</strong>. These are the best ways to hear about new events and connect with members daily.
          </li>
        </ol>
      </div>

      <div class="section">
        <h2>What's Included in Your Membership</h2>
        <ul>
          <li>Up to 3 paid expert-led events per month (AI Study Group is always free)</li>
          <li>Access to all available event recordings</li>
          <li>Opportunities to grow your network and skills</li>
        </ul>
        <p class="note">Keep an eye on Slack and our Substack for event announcements and invites.</p>
      </div>

      <div class="founding-banner">
        <div class="founding-title">⭐ Founding Member Bonus</div>
        <p>Because you joined before March 31st, you're a Founding Member. You'll receive special recognition on our website and an exclusive invitation to our Founding Member celebration this spring. A shareable graphic marking this moment is attached below!</p>
        <ul>
          <li>Special recognition on our website</li>
          <li>A shareable Founding Member graphic for your socials</li>
          <li>Exclusive invitation to our Founding Member celebration this spring</li>
        </ul>
      </div>

      <div class="code-block">
        <p class="label">Your code for up to 3 free events per month</p>
        <span class="code">RISINGSTAR</span>
      </div>

      <hr />
    </div>

    <div class="footer">
      <p>Genuinely thrilled to have you here.</p>
      <br>
      <p>With excitement,<br><strong>Caroline Holden</strong><br>Founder of MN Women in AI<br><em>(Brought to you by Swift Start Go)</em></p>
    </div>

  </div>
</div>
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
<div class="wrapper">
  <div class="container">

    <div class="header">
      <img src="YOUR_LOGO_URL" alt="MN Women in AI" class="logo" />
      <div class="badge">North Star Membership</div>
      <h1>Welcome and thank you for going all in. 💜</h1>
      <p class="tagline">You just became a North Star Member of MN Women in AI — a community of 500+ women across Minnesota at the center of how AI gets built and adopted.</p>
    </div>

    <div class="body">

      <div class="section">
        <h2>✨ Could You Do Us a Quick Favor?</h2>
        <ol>
          <li>
            <strong>Please fill out <a href="https://forms.gle/iZkc4o1CsYYLiMa38">our welcome survey</a></strong> — this helps us match you with the right AI Accountability group, member matches, and other opportunities. Takes 3–5 minutes.
          </li>
          <li>
            <strong>Check your inbox</strong> — if you aren't already on our lists, we sent you invitations to our <strong>Substack newsletter</strong> and <strong>Slack channel</strong>. These are the best ways to hear about new events and connect with members daily.
          </li>
        </ol>
      </div>

      <div class="section">
        <h2>What's Included in Your Membership</h2>
        <p>As a North Star Member you have access to:</p>
        <ul>
          <li><strong>All monthly events</strong> — talks, panels, AI workshops, study groups, &amp; exclusive events</li>
          <li><strong>All available recordings</strong> of events, minus AI Study Group <em>(coming in April)</em></li>
          <li><strong>Curated AI Accountability Groups</strong> &amp; Member Matching <em>(coming in April)</em></li>
          <li><strong>Exclusive Workshops</strong> &amp; Virtual Pop-Ups <em>(coming in April)</em></li>
          <li><strong>Your local AI opportunities newsletter</strong> <em>(coming in April)</em></li>
        </ul>
        <p class="note">Keep an eye on Slack and our Substack for event announcements. AI Accountability Group invitations will arrive via email.</p>
      </div>

      <div class="founding-banner">
        <div class="founding-title">⭐ Founding Member Bonus</div>
        <p>Because you joined before March 31st, you're a Founding Member. You'll receive special recognition on our website and an exclusive invitation to our Founding Member celebration this spring. A shareable graphic marking this moment is attached below!</p>
        <ul>
          <li>Special recognition on our website</li>
          <li>A shareable Founding Member graphic for your socials</li>
          <li>Exclusive invitation to our Founding Member celebration this spring</li>
        </ul>
      </div>

      <div class="code-block">
        <p class="label">Your code for up to 3 free events per month</p>
        <span class="code">NORTHSTAR</span>
      </div>

      <hr />
    </div>

    <div class="footer">
      <p>Genuinely thrilled to have you here.</p>
      <br>
      <p>With excitement,<br><strong>Caroline Holden</strong><br>Founder of MN Women in AI<br><em>(Brought to you by Swift Start Go)</em></p>
    </div>

  </div>
</div>
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
<div class="wrapper">
  <div class="container">

    <div class="header">
      <img src="YOUR_LOGO_URL" alt="MN Women in AI" class="logo" />
      <div class="badge">Executive Insider</div>
      <h1>Let's build something. 💜</h1>
      <p class="tagline">Welcome to Executive Insider — Minnesota's network for women leading, shaping, and accelerating AI.</p>
    </div>

    <div class="body">
      <p>You didn't just join a membership — you stepped into a leadership circle. Executive Insider is designed for women who are already making moves in AI and want a community that matches that energy. We are honored you're here.</p>

      <div class="section">
        <h2>✨ Could You Do Us a Quick Favor?</h2>
        <ol>
          <li>
            <strong>Please fill out <a href="https://forms.gle/iZkc4o1CsYYLiMa38">our welcome survey</a></strong> — this helps us connect you to the right rooms, people, and opportunities from day one. Takes 3–5 minutes.
          </li>
          <li>
            <strong>Check your inbox</strong> — watch for your invitations to our <strong>Substack newsletter</strong> and <strong>Slack community</strong>. That's where Executive Insider members stay sharp and connected daily.
          </li>
        </ol>
      </div>

      <div class="section">
        <h2>Your Executive Insider Benefits</h2>
        <ul>
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
      </div>

      <div class="founding-banner">
        <div class="founding-title">⭐ Founding Member Bonus</div>
        <p>Because you joined before March 31st, you're a Founding Member. You'll receive special recognition on our website and an exclusive invitation to our Founding Member celebration this spring. A shareable graphic marking this moment is attached below!</p>
        <ul>
          <li>Special recognition on our website</li>
          <li>A shareable Founding Member graphic for your socials</li>
          <li>Exclusive invitation to our Founding Member celebration this spring</li>
        </ul>
      </div>

      <div class="code-block">
        <p class="label">Your event access code</p>
        <span class="code">EXECUTIVE</span>
      </div>

      <hr />
    </div>

    <div class="footer">
      <p>Genuinely thrilled to have your leadership in this community. This is just the beginning.</p>
      <br>
      <p>With excitement,<br><strong>Caroline Holden</strong><br>Founder of MN Women in AI<br><em>(Brought to you by Swift Start Go)</em></p>
    </div>

  </div>
</div>
</body>
</html>`;