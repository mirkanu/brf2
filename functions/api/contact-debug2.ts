export const onRequestGet = async ({ env }: { request: Request; env: any }) => {
  const sender = env.BRF_CONTACT_FROM || "BRF Website <onboarding@resend.dev>";
  const recipient = env.BRF_CONTACT_TO || "secretary@britishreformed.org";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: recipient,
      subject: "Debug test",
      text: "Body",
    }),
  });
  const text = await r.text();
  return new Response(JSON.stringify({status: r.status, sender, recipient, text}, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
