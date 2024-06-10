const mongoose = require("mongoose");

const PageSchema = new mongoose.Schema({
    name: String,
    content: String
});

const AreaSchema = new mongoose.Schema({
    name: String,
    pages: [PageSchema]
});

const NotebookSchema = new mongoose.Schema({
    name: String,
    areas: [AreaSchema]
});

const UserSchema = new mongoose.Schema({
    userID: String, // 用户名
    email: String, // 邮箱
    password: String, // 密码
    avatar: String, // 头像，Base64编码
    userBio: String, // 用户签名
    verificationCode: String, // 邮箱验证码
    notes: [NotebookSchema] // 用户的笔记
});

UserSchema.index({ userID: 1, email: 1 }); // 创建索引

// 从Schema编译模型
module.exports = mongoose.model("user", UserSchema);
