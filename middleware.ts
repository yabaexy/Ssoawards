import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BLOCKED_COUNTRIES = [
  'CN', // 중국
  'HK', // 홍콩
  'MO', // 마카오
  'CU', // 쿠바
  'UA', // 우크라이나
  'RU', // 러시아
  'BY', // 벨라루스
  'KP', // 북한
  'SY', // 시리아
  'IR', // 이란
  'VE', // 베네수엘라
  'MY', // 말레이시아
  'ID', // 인도네시아
  'MM', // 미얀마
  'NP', // 네팔
  'BO', // 볼리비아
];

export function middleware(request: NextRequest) {
  const country = request.geo?.country || 'UNKNOWN';

  if (BLOCKED_COUNTRIES.includes(country)) {
    return new NextResponse(
      'Access Denied: Your region is restricted.',
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};