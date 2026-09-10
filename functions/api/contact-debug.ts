export const onRequestPost = async ({ request, env }: { request: Request; env: any }) => {
  const keys = env ? Object.keys(env) : [];
  const resend = env?.RESEND_API_KEY ?? "(missing)";
  const resendType = typeof resend;
  const resendLen = typeof resend === "string" ? resend.length : -1;
  const body = `keys=${JSON.stringify(keys)} resend_type=${resendType} resend_len=${resendLen} request_url=${request.url}`;
  return new Response(body, { status: 200, headers: { "content-type": "text/plain" } });
};
export const onRequestGet = onRequestPost;
