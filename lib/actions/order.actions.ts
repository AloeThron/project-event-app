"use server";

import { redirect } from "next/navigation";

import Stripe from "stripe";
import { ObjectId } from "mongodb";

import { handleError } from "../utils";
import { connectToDatabase } from "../database";
import Order from "../database/models/order.model";
import Event from "../database/models/event.model";
import User from "../database/models/user.model";
import {
  CheckoutOrderParams,
  CreateOrderParams,
  GetOrdersByEventParams,
  GetOrdersByUserParams,
} from "@/types";

// ฟังก์ชันสำหรับทำการ Checkout โดยรับพารามิเตอร์ order ที่เป็น object ที่มีข้อมูลที่เกี่ยวข้องกับการสั่งซื้อ
export async function checkoutOrder(order: CheckoutOrderParams) {
  // สร้างอ็อบเจ็กต์ Stripe โดยใช้คีย์ลับลับที่เก็บไว้ใน .env
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // คำนวณราคา โดยกำหนดค่า price ซึ่งถ้า Free จะกำหนดราคาเป็น 0, และถ้าไม่ใช่ จะกำหนดราคาจาก order.price และคูณด้วย 100 (เพราะ Stripe ใช้หน่วยเป็น cents)
  const price = order.isFree ? 0 : Number(order.price) * 100;

  try {
    //  สร้าง session ใน Stripe Checkout และกำหนด URL สำหรับ redirect เมื่อชำระเงินสำเร็จ (success_url) และเมื่อยกเลิก (cancel_url)
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: price,
            product_data: {
              name: order.eventTitle,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        eventId: order.eventId,
        buyerId: order.buyerId,
      },
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/profile`,
      cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/`,
    });

    redirect(session.url!);
  } catch (error) {
    throw error;
  }
}

export async function createOrder(order: CreateOrderParams) {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    await connectToDatabase();

    // สร้าง order ในฐานข้อมูล
    const newOrder = await Order.create({
      ...order,
      event: order.eventId,
      buyer: order.buyerId,
    });

    // แปลงเป็นวัตถุ JSON ก่อนที่จะส่งค่าออก
    return JSON.parse(JSON.stringify(newOrder));
  } catch (error) {
    handleError(error);
  }
}

// GET ORDERS BY EVENT
export async function getOrdersByEvent({
  searchString,
  eventId,
}: GetOrdersByEventParams) {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    await connectToDatabase();

    // ตรวจสอบว่า eventId ถูกส่งมาหรือไม่
    if (!eventId) throw new Error("Event ID is required");

    // แปลง eventId เป็น ObjectId ที่ใช้ในการค้นหาข้อมูล
    const eventObjectId = new ObjectId(eventId);

    // aggregation pipeline ของ MongoDB สำหรับการดึงข้อมูล orders
    const orders = await Order.aggregate([
      {
        // เชื่อมโยงข้อมูลจากคอลเลคชัน "users" โดยเทียบกับฟิลด์ "buyer"
        $lookup: {
          from: "users",
          localField: "buyer",
          foreignField: "_id",
          as: "buyer",
        },
      },
      {
        // แยกส่วนจากการ $lookup
        $unwind: "$buyer",
      },
      {
        // เชื่อมโยงข้อมูลจากคอลเลคชัน "events" โดยเทียบกับฟิลด์ "event"
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "event",
        },
      },
      {
        // แยกส่วนจากการ $lookup
        $unwind: "$event",
      },
      {
        // ระบุเอาเฉพาะฟิลด์ที่ต้องการแสดงผล
        $project: {
          _id: 1, // แสดงฟิลด์ _id ในผลลัพธ์
          totalAmount: 1, // แสดงฟิลด์ totalAmount ในผลลัพธ์
          createdAt: 1, // แสดงฟิลด์ createdAt ในผลลัพธ์
          eventTitle: "$event.title", // แสดงฟิลด์ใหม่ eventTitle ในผลลัพธ์, โดยค่ามาจากฟิลด์ title ของ event
          eventId: "$event._id", // แสดงฟิลด์ใหม่ eventId ในผลลัพธ์, โดยค่ามาจากฟิลด์ _id ของเอกสาร event
          buyer: {
            $concat: ["$buyer.firstName", " ", "$buyer.lastName"], // แสดงฟิลด์ใหม่ buyer ในผลลัพธ์, โดยค่าเป็นการต่อกันของฟิลด์ firstName และ lastName จาก buyer
          },
        },
      },
      {
        // ใช้กรองข้อมูลตามเงื่อนไขที่กำหนด, ในที่นี้คือ eventId และ searchString
        $match: {
          $and: [
            { eventId: eventObjectId },
            { buyer: { $regex: RegExp(searchString, "i") } },
          ],
        },
      },
    ]);

    // แปลงเป็นวัตถุ JSON ก่อนที่จะส่งค่าออก
    return JSON.parse(JSON.stringify(orders));
  } catch (error) {
    handleError(error);
  }
}

// GET ORDERS BY USER
export async function getOrdersByUser({
  userId,
  limit = 3,
  page,
}: GetOrdersByUserParams) {
  try {
    // เชื่อมต่อกับฐานข้อมูล
    await connectToDatabase();

    // คำนวณค่า skipAmount เพื่อให้แสดงข้อมูลในหน้าที่ถูกต้อง
    const skipAmount = (Number(page) - 1) * limit;

    // เงื่อนไขการค้นหาข้อมูล
    const conditions = { buyer: userId };

    // ดึงข้อมูลการสั่งซื้อจาก Order collection
    const orders = await Order.distinct("event._id")
      .find(conditions)
      .sort({ createdAt: "desc" })
      .skip(skipAmount)
      .limit(limit)
      .populate({
        path: "event",
        model: Event,
        populate: {
          path: "organizer",
          model: User,
          select: "_id firstName lastName",
        },
      });

    // นับจำนวนรายการทั้งหมดของการสั่งซื้อ
    const ordersCount = await Order.distinct("event._id").countDocuments(
      conditions
    );

    // ส่งคืนข้อมูล order และข้อมูลสำหรับ pagination
    return {
      data: JSON.parse(JSON.stringify(orders)),
      totalPages: Math.ceil(ordersCount / limit),
    };
  } catch (error) {
    handleError(error);
  }
}
