import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let data = null;

  try {
    const text = await req.text();
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    console.error("Webhook JSON parse failed:", e);
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log("Webhook received:", data);

  return new Response("OK");
}
