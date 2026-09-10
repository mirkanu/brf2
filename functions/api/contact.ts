// Cloudflare Pages Function — receives POST /api/contact from the About → Contact
// form and forwards it to Resend. The Resend API key must be supplied via the
// `RESEND_API_KEY` env var on the Cloudflare Pages project (see
// docs/agent-handbook/ for the deployment workflow). No secrets are committed.

interface Env {
  RESEND_API_KEY: string;
  BRF_CONTACT_TO?: string;
  BRF_CONTACT_FROM?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const html = (body: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

const escape = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderConfirmationPage = (
  title: string,
  message: string,
  isError: boolean,
): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escape(title)} — British Reformed Fellowship</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <style>
    body { font-family: Georgia, serif; max-width: 36rem; margin: 4rem auto; padding: 0 1.25rem; color: #14110d; background: #fbf8f3; }
    h1 { font-size: 1.75rem; margin: 0 0 1rem; }
    p { line-height: 1.6; }
    a { color: #6c1c1c; }
    .error h1 { color: #6c1c1c; }
  </style>
</head>
<body class="${isError ? "error" : ""}">
  <h1>${escape(title)}</h1>
  <p>${escape(message)}</p>
  <p><a href="/contact/">Back to the contact form</a></p>
</body>
</html>`;

export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  if (!env?.RESEND_API_KEY) {
    return html(
      renderConfirmationPage(
        "Contact form unavailable",
        "The contact form is not configured on this deployment yet. Please email the BRF Webmaster at manuelkuhs@gmail.com.",
        true,
      ),
      503,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Invalid form submission." }, 400);
  }

  const name = (form.get("name") ?? "").toString().trim();
  const email = (form.get("email") ?? "").toString().trim();
  const subject = (form.get("subject") ?? "").toString().trim();
  const message = (form.get("message") ?? "").toString().trim();

  if (!name || !email || !subject || !message) {
    return json({ error: "All fields are required." }, 400);
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: "A valid email address is required." }, 400);
  }
  if (name.length > 200 || subject.length > 200 || message.length > 5000) {
    return json({ error: "One of the fields is too long." }, 400);
  }

  const recipient = env.BRF_CONTACT_TO || "manuelkuhs@gmail.com";
  const sender = env.BRF_CONTACT_FROM || "BRF Website <onboarding@resend.dev>";

  const emailSubject = `[BRF contact] ${subject}`;
  const textBody = [
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Subject: ${subject}`,
    "",
    message,
  ].join("\n");
  const htmlBody = `<p><strong>Name:</strong> ${escape(name)}</p>
<p><strong>Email:</strong> ${escape(email)}</p>
<p><strong>Subject:</strong> ${escape(subject)}</p>
<hr>
<p>${escape(message).replace(/\n/g, "<br>")}</p>`;

  // Decide response shape: JSON for fetch() from the page, HTML for fallback.
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        reply_to: email,
        subject: emailSubject,
        text: textBody,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("Resend error:", resendResponse.status, errText);
      if (wantsJson) return json({ error: "Unable to send right now." }, 502);
      return html(
        renderConfirmationPage(
          "Could not send your message",
          "We had a problem sending your message. Please try again in a moment, or email the Secretary directly.",
          true,
        ),
        502,
      );
    }
  } catch (error) {
    console.error("Resend call failed:", error);
    if (wantsJson) return json({ error: "Unable to send right now." }, 502);
    return html(
      renderConfirmationPage(
        "Could not send your message",
        "We had a problem sending your message. Please try again in a moment, or email the Secretary directly.",
        true,
      ),
      502,
    );
  }

  if (wantsJson) return json({ ok: true });
  return html(
    renderConfirmationPage(
      "Thanks for your message",
      "We will get back to you shortly.",
      false,
    ),
    200,
  );
};

export const onRequest = ({ request }: { request: Request }) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }
};
