const express = require("express");
const router = express.Router();

// const config = require("../config/config");
const User = require("../models/user")

const bcrypt = require("bcryptjs")
const nodemailer = require("nodemailer");
const validator = require("validator");
const auth = require("../middlewares/auth");

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

async function edit_userid(req, res) {
    try {
        const { new_userid } = req.body;

        const { userID } = req.session.user;

        const user = await User.findOne({ userID: userID });
        if (!user) {
            return res.status(404).json({ message: "未找到用户！" });
        }
        user.userID = new_userid;
        await user.save();
        req.session.user.userID = new_userid;
        return res.send({ message: "成功修改昵称！" });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: err.message });
    }
}

async function edit_password(req, res) {
    try {
        const { old_password, new_password } = req.body;

        const { userID } = req.session.user;

        const user = await User.findOne({ userID: userID });
        if (!user) {
            return res.status(404).json({ message: "未找到用户！" });
        }

        var isPasswordValid = bcrypt.compareSync(old_password, user.password);
        if (!isPasswordValid) {
            return res.status(401).send({ message: "原密码错误！" });
        }

        if (old_password === new_password) {
            return res.status(400).send({ message: "新密码不能和原密码相同！" });
        }

        user.password = bcrypt.hashSync(new_password, 8);
        await user.save();
        req.session = null;
        return res.send({ message: "成功修改密码，请重新登录！" });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: err.message });
    }
}

async function sendCode(email, code) {
    return new Promise(async (resolve, reject) => {
        let transporter = nodemailer.createTransport({
            host: "ydmsk.xyz", // 你的 SMTP 服务器地址
            port: 465, // SMTP 服务器的端口，通常是 587 或 465
            secure: true, // 如果端口是 465，需要将这个选项设置为 true
            auth: {
                user: "potatores@ydmsk.xyz", // SMTP 服务器的用户名
                pass: "sbwzs233", // SMTP 服务器的密码
            },
        });

        let mailOptions = {
            from: "potatores@ydmsk.xyz", // 发件人地址
            to: email, // 收件人地址，可以是一个数组，表示多个收件人
            subject: "验证码", // 邮件主题
            text: `您的验证码：${code}。`, // 邮件内容
        };

        try {
            let info = await transporter.sendMail(mailOptions);
            console.log("Email sent: " + info.response);
            resolve();
        } catch (error) {
            console.error("Error sending email: " + error);
            reject(new Error("发送邮件时遇到错误：" + error));
        }
    });
}

function generateVerificationCode() {
    let code = Math.floor(Math.random() * 1000000);
    return String(code).padStart(6, '0');
}

async function requestCode(req, res) {
    try {
        const { userID_or_email } = req.body;
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
                return res.status(401).send({ message: "没有找到用户！" });
            }

            // 生成验证码
            const code = generateVerificationCode();
            user.verificationCode = code;
            await user.save();
            sendCode(user.email, code).then(() => {
                return res.send({ message: "验证码已发送！" });
            }).catch((err) => {
                return res.status(500).send({ message: err.message });
            });
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: err.message });
    }
}

async function verifyCode(req, res) {
    try {
        const { userID_or_email, code, new_password } = req.body;
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
                return res.status(401).send({ message: "没有找到用户！" });
            }

            // 验证码错误
            if (user.verificationCode !== code) {
                user.verificationCode = "";
                await user.save();
                return res.status(401).send({ message: "验证码错误！" });
            }

            // 重置密码
            user.password = bcrypt.hashSync(new_password, 8);
            user.verificationCode = "";
            await user.save();
            return res.send({ message: "密码重置成功！" });
        });
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
router.post("/logout", auth.verifyLoginState, logout);

// POST /api/user/editbio
// 请求体形如 { new_bio: "xxx" }
// 返回200状态码和{ message: "成功修改个性签名！" }
router.post("/editbio", auth.verifyLoginState, edit_bio);

// POST /api/user/editavatar
// 请求体形如 { avatar_base64: "xxx" }
// 返回200状态码和{ message: "成功修改头像！" }
router.post("/editavatar", auth.verifyLoginState, edit_avatar);

// POST /api/user/edituserid
// 请求体形如 { new_userid: "xxx" }
// 返回200状态码和{ message: "成功修改昵称！" }
router.post("/edituserid", auth.verifyLoginState, edit_userid);

// POST /api/user/editpassword
// 请求体形如 { old_password: "xxx", new_password: "xxx" }
// 返回200状态码和{ message: "成功修改密码！" }
router.post("/editpassword", auth.verifyLoginState, edit_password);

// POST /api/user/requestcode
// 请求体形如 { userID_or_email: "xxx" }
// 返回200状态码和{ message: "验证码已发送！" }
router.post("/requestcode", requestCode);

// POST /api/user/verifycode
// 请求体形如 { userID_or_email: "xxx", code: "xxx", new_password: "xxx" }
// 返回200状态码和{ message: "密码重置成功！" }
router.post("/verifycode", verifyCode);

module.exports = router;