const express = require("express");
const router = express.Router();

const User = require("../models/user")

const auth = require("../middlewares/auth");

async function upload_notes(req, res) {
    try {
        console.log(req.body.notebooks[0].areas);

        const { notebooks } = req.body;
        const userID = req.session.user.userID;

        // 找到用户
        let user = await User.findOne({ userID: userID });

        if (!user) {
            return res.status(404).json({ message: '未找到用户！' });
        }

        // 更新用户的笔记
        user.notes = notebooks;

        // 保存用户信息
        await user.save();

        return res.status(200).json({ message: '笔记上传成功！' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
}

async function download_notes(req, res) {
    try {
        const userID = req.session.user.userID;

        let user = await User.findOne({ userID: userID });

        if (!user) {
            return res.status(404).json({ message: '未找到用户！' });
        }

        return res.status(200).json({ notebooks: user.notes });
        
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
}

router.post("/upload", auth.verifyLoginState, upload_notes);

router.get("/download", auth.verifyLoginState, download_notes);

module.exports = router;