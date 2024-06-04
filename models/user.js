const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema({
  id: Number, // 笔记所有者用户下的笔记id
  title: String, // 笔记标题
  content: String // JSON，表示笔记内容
});

const UserSchema = new mongoose.Schema({
  userID: String, // 用户名
  email: String, // 邮箱
  password: String, // 密码
  avatar: String, // 头像，Base64编码
  userBio: String, // 用户签名
  notes: [NoteSchema] // 用户的笔记
});

UserSchema.index({ userID: 1 , email: 1}); // 创建索引

// 从Schema编译模型
module.exports = mongoose.model("user", UserSchema);
