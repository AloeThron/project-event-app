// ใช้ Mongoose library เพื่อจัดการกับการเชื่อมต่อกับฐานข้อมูล MongoDB และการสร้างโมเดล (Model) สำหรับข้อมูลของผู้ใช้ (User)
import { Schema, model, models } from "mongoose";

// มีการกำหนด Schema หรือโครงสร้างข้อมูลสำหรับผู้ใช้ (User) โดยมีคุณสมบัติต่าง ๆ ที่กำหนดไว้เช่น clerkId, email, username, firstName, lastName, และ photo แต่ละ property ต้องมีประเภทของข้อมูลและมีการกำหนดเงื่อนไข
const UserSchema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: {type: String, required: true },
  photo: { type: String, required: true },
})

// โมเดล User จะถูกสร้างด้วย model() ซึ่งจะถูกใช้ในการจัดการข้อมูลใน MongoDB และจะถูก export เพื่อให้สามารถนำไปใช้ในส่วนอื่นของโปรเจ็กต์ได้ในภายหลัง
const User = models.User || model('User', UserSchema);
export default User;