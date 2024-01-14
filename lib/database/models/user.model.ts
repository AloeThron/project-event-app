// ใช้ Mongoose library เพื่อจัดการกับการเชื่อมต่อกับฐานข้อมูล MongoDB และการสร้างโมเดล (Model) สำหรับข้อมูลของผู้ใช้ (User)
import { Schema, model, models } from "mongoose";

// กำหนด Schema หรือโครงสร้างข้อมูลผู้ใช้ (User)
const UserSchema = new Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: {type: String, required: true },
  photo: { type: String, required: true },
})

// โมเดล User จะถูกสร้างด้วย model() และจะถูก export เพื่อให้สามารถนำไปใช้ในส่วนอื่นของโปรเจ็กต์ได้
const User = models.User || model('User', UserSchema);
export default User;