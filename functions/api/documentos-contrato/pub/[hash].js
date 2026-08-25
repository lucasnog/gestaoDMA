/**
 * Cloudflare Pages Function
 * Proxy publico para visualizacao de documentos do contrato via viewer
 * URL: /api/documentos-contrato/pub/{token}
 * Token HMAC auto-contido: base64url(path).exp_hex.hmac_hex
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const token = url.pathname.split('/').pop();

  if (!token) {
    return new Response('token obrigatorio', { status: 400 });
  }

  const backendUrl = `https://api.gemoc-analytics.workers.dev/api/documentos-contrato/pub/${token}`;

  try {
    const response = await fetch(backendUrl);
    if (!response.ok) {
      const text = await response.text();
      return new Response(text, { status: response.status });
    }

    const blob = await response.blob();

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (err) {
    return new Response('Erro: ' + err.message, { status: 502 });
  }
}
