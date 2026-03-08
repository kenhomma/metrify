import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  // セッションなし → トップへリダイレクト
  if (!session.shop) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // shopパラメータがセッションと不一致 → 403
  const shopParam = searchParams.get('shop');
  if (shopParam && shopParam !== session.shop) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
