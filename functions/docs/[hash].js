/**
 * Cloudflare Pages Function
 * Proxy para servir documentos para o Google Docs Viewer
 * URL: /docs/{hash}.{ext}
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  const pathParts = url.pathname.replace('/docs/', '').split('.');
  const hash = pathParts[0];
  const ext = pathParts.length > 1 ? '.' + pathParts[1] : '';
  
  if (!hash) {
    return new Response('Hash nao fornecido', { status: 400 });
  }

  const backendUrl = `https://163.176.241.59.nip.io/api/documentos/view/${hash}?raw=true`;
  
  try {
    const response = await fetch(backendUrl);
    if (!response.ok) {
      return new Response('Arquivo nao encontrado', { status: 404 });
    }
    const blob = await response.blob();
    
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (err) {
    return new Response('Erro: ' + err.message, { status: 502 });
  }
}
