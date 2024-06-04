const express = require("express");
const router = express.Router();

// const config = require("../config/config");
const User = require("../models/user")

const bcrypt = require("bcryptjs")
const nodemailer = require("nodemailer");
const validator = require("validator");

async function register(req, res) {
    try {
        const { userID, email, password } = req.body;
        // 查询用户信息是否和已有重复
        User.findOne(
            {
                $or: [
                    { userID: userID },
                    { email: email },
                ],
            },
            (err, existingUser) => {
                if (err) {
                    return res.status(500).send({ message: err });
                }

                if (existingUser) {
                    const duplicateFields = [];
                    if (existingUser.userID === userID) {
                        duplicateFields.push("用户名");
                    }
                    if (existingUser.email === email) {
                        duplicateFields.push("电子邮箱");
                    }

                    // 返回带有重复字段信息的响应
                    return res.status(400).send({ message: `以下信息重复：${duplicateFields.join("，")}。` });
                }

                // 检验数据合法性
                if (email && !validator.isEmail(email)) {
                    return res.status(400).send({ message: "电子邮件格式无效。" });
                }

                // const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,20}$/;
                // if (!passwordPattern.test(password)) {
                //     return res.status(400).send({ message: "密码格式不符合要求。" });
                // }

                // 创建账户
                const user = new User({
                    userID: userID,
                    email: email,
                    password: bcrypt.hashSync(password, 8),
                });

                user.save((err, user) => {
                    if (err) {
                        return res.status(500).send({ message: err });
                    }
                    return res.send({ message: "用户注册成功！" });
                });
            }
        );
    } catch (err) {
        return res.status(500).send({ message: err.message });
    }
}

async function login(req, res) {
    try {
        const { userID_or_email, password } = req.body;
        User.findOne(
            {
                $or: [
                    { userID: userID_or_email },
                    { email: userID_or_email },
                ],
            }
        ).exec(async (err, user) => {
            if (err) {
                return res.status(500).send({ message: err });
            }

            // 没有找到用户
            if (!user) {
                return res.status(401).send({ message: "用户名或密码错误！" });
            }

            // 校验密码
            var isPasswordValid = bcrypt.compareSync(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).send({ message: "用户名或密码错误！" });
            }

            // 校验通过
            // 创建session
            const { userID, email, avatar, userBio } = user;
            const userInfo = {
                userID,
                email,
                avatar,
                userBio
            }
            req.session.user = userInfo;

            return res.send(userInfo);
        })
    } catch (err) {
        return res.status(500).send({ message: err.message });
    }
}

async function logout(req, res) {
    try {
        req.session = null;
        return res.status(200).send({ message: "您已登出！" });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: err.message });
    }
}

async function edit_bio(req, res) {
    try {
        const { new_bio } = req.body;
        if (!req.session.user) {
            return res.status(403).json({ message: "登陆状态已失效，请重新登录！" });
        }
        const { userID } = req.session.user;

        const user = await User.findOne({ userID: userID });
        if (!user) {
            return res.status(404).json({ message: "未找到用户！" });
        }
        user.userBio = new_bio;
        await user.save();
        return res.send({ message: "成功修改个性签名！" });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: err.message });
    }
}

async function edit_avatar(req, res) {
    try {
        const { avatar_base64 } = req.body;
        if (!req.session.user) {
            return res.status(403).json({ message: "登陆状态已失效，请重新登录！" });
        }
        const { userID } = req.session.user;

        const user = await User.findOne({ userID: userID });
        if (!user) {
            return res.status(404).json({ message: "未找到用户！" });
        }
        user.avatar = avatar_base64;
        await user.save();
        return res.send({ message: "成功修改头像！" });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: err.message });
    }
}

// POST /api/user/register
// 请求体形如 { userID: "xxx", email: "xxx", password: "xxx" }
// 返回200状态码和{ message: "用户注册成功！" }
router.post("/register", register);

// POST /api/user/login
// 请求体形如 { userID_or_email: "xxx", password: "xxx" }
// 返回200状态码和{ userID, email, avatar, userBio }
router.post("/login", login);

// POST /api/user/logout
// 无请求体
// 返回200状态码和{ message: "您已登出！" }
router.post("/logout", logout);

// POST /api/user/editbio
// 请求体形如 { new_bio: "xxx" }
// 返回200状态码和{ message: "成功修改个性签名！" }
router.post("/editbio", edit_bio);

// POST /api/user/editavatar
// 请求体形如 { avatar_base64: "xxx" }
// 返回200状态码和{ message: "成功修改头像！" }
router.post("/editavatar", edit_avatar);

module.exports = router;