import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirect favicon.ico requests to favicon.svg
  return NextResponse.redirect(new URL('/favicon.svg', request.url));
}
