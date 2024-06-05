function verifyLoginState(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(403).send({message: "登录状态无效，请重新登录！"})
    }
}

const auth = {
    verifyLoginState
};

module.exports = auth;