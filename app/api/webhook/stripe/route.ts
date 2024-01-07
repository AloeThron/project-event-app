import { NextResponse } from "next/server";

import stripe from "stripe";

import { createOrder } from "@/lib/actions/order.actions";

export async function POST(request: Request) {
  // รับ Request เป็นข้อมูลชนิด text
  const body = await request.text();

  // ดึง Stripe signature และ Stripe webhook secret จาก headers และ environment variables ตามลำดับ
  const sig = request.headers.get("stripe-signature") as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  // ทำการ verify signature ของ webhook event โดยใช้ stripe.webhooks.constructEvent และเก็บ event ที่ถูกต้องลงในตัวแปร event
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    return NextResponse.json({ message: "Webhook error", error: err });
  }

  // ตรวจสอบประเภทของ event ที่เกิดขึ้น (eventType)
  // Get the ID and type
  const eventType = event.type;

  // หากเป็นเหตุการณ์ 'checkout.session.completed' จะดึงข้อมูลเพิ่มเติมเกี่ยวกับการชำระเงินออกมา เช่น id ของการชำระเงิน (stripeId), จำนวนเงินทั้งหมด (amount_total), และ metadata เพิ่มเติม
  // CREATE
  if (eventType === "checkout.session.completed") {
    const { id, amount_total, metadata } = event.data.object;
    // สร้าง object ของ order ด้วยข้อมูลที่ได้จากการชำระเงินและ metadata แล้วเรียกใช้ฟังก์ชั่น createOrder เพื่อสร้าง order ใหม่
    const order = {
      stripeId: id,
      eventId: metadata?.eventId || "",
      buyerId: metadata?.buyerId || "",
      totalAmount: amount_total ? (amount_total / 100).toString() : "0",
      createdAt: new Date(),
    };
    const newOrder = await createOrder(order);
    // ส่ง response กลับไปโดยระบุว่าการดำเนินการเสร็จสิ้น (OK) พร้อมกับข้อมูลของ order ที่สร้างใหม่
    return NextResponse.json({ message: "OK", order: newOrder });
  }

  // หากไม่ใช่เหตุการณ์ 'checkout.session.completed' จะส่ง response ว่างกลับไปด้วยสถานะ 200 ที่บอกว่าการทำงานเสร็จสิ้น โดยไม่มีข้อมูลเพิ่มเติมใน response
  return new Response("", { status: 200 });
}
