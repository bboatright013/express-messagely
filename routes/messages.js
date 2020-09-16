const Router = require("express").Router;
const router = new Router();
const Msg = require("../models/message");
const ExpressError = require("../expressError");
const {ensureLoggedIn} = require("../middleware/auth");


/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get("/:id", async function(req, res, next){
    const message = await Msg.get(req.params.id);
    if(req.user.username == message.from_user.username ||
         req.user.username == message.to_user.username){
        return res.json({message});
    }else{
        throw new ExpressError("Unauthorized user", 404);
    }


})

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post("/", ensureLoggedIn, async function(req, res, next){
    let { to_username, body } = req.body;

    const message = await Msg.create(req.user.username, to_username, body);
    return res.json({message});
})

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/

router.post("/:id/read", async function(req, res, next){

    const message = Msg.get(req.params.id);
    if(req.user.username == message.from_username){
        await Msg.markRead(req.params.id);
    }
    return next();
})

module.exports = router;