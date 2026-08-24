/**
 * Proxy para download de medicoes autenticadas
 * Usa o token da query string para autenticar no backend
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  const token = url.searchParams.get('token');

  if (!path) {
    return new Response('Path nao fornecido', { status: 400 });
  }

  const backendUrl = `https://api.gemoc-analytics.workers.dev/api/medicoes/download?path=${encodeURIComponent(path)}`;

  try {
    const response = await fetch(backendUrl, {
      headers: { 'Authorization': `Bearer ${token || ''}` }
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(text, { status: response.status });
    }

    const blob = await response.blob();
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const disposition = response.headers.get('Content-Disposition') || 'inline';

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      }
    });
  } catch (err) {
    return new Response('Erro: ' + err.message, { status: 502 });
  }
}
