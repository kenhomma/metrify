import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(
      `<html><body><p>Google OAuth error: ${error}</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  // CSRF検証
  const storedState = request.cookies.get('google_oauth_state')?.value;
  if (!stateParam || !storedState) {
    return NextResponse.json({ error: 'Missing state' }, { status: 403 });
  }

  const colonIdx = stateParam.indexOf(':');
  const state = stateParam.slice(0, colonIdx);
  const shop = stateParam.slice(colonIdx + 1);

  if (state !== storedState || !shop) {
    return NextResponse.json({ error: 'Invalid state parameter' }, { status: 403 });
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  // マーチャント存在確認
  const merchants = await sql`
    SELECT shop_domain FROM merchants WHERE shop_domain = ${shop} LIMIT 1
  `;
  if (merchants.length === 0) {
    return NextResponse.json({ error: 'Unknown merchant' }, { status: 404 });
  }

  // コード→トークン交換
  const appUrl = process.env.APP_URL!.replace(/\/$/, '');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appUrl}/api/ga/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => null);
    return NextResponse.json(
      { error: 'Failed to exchange Google token', details: err },
      { status: 502 }
    );
  }

  const tokenData = await tokenRes.json();
  const { refresh_token } = tokenData;

  if (!refresh_token) {
    return new NextResponse(
      `<html><body><p>refresh_tokenが取得できませんでした。Googleアカウント設定でアプリのアクセスを取り消してから再接続してください。</p><script>setTimeout(()=>window.close(),5000)</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  // DBに保存
  await sql`
    UPDATE merchants
    SET google_refresh_token = ${refresh_token}
    WHERE shop_domain = ${shop}
  `;

  // ポップアップを閉じて親ウィンドウをリロード
  const response = new NextResponse(
    `<html><body><script>
      if (window.opener) {
        window.opener.location.reload();
      }
      window.close();
    </script><p>接続完了。このウィンドウは自動的に閉じます。</p></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
  response.cookies.delete('google_oauth_state');

  return response;
}
