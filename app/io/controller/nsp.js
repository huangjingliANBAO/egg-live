'use strict'
const Controller = require('egg').Controller
class NspController extends Controller {
    async test(){
        const {ctx,app} = this
        console.log(ctx)
        let message = ctx.args[0]
        console.log(message)
        //当前的socket连接
        const socket = ctx.socket
        //取得socket的id
        const id = cocket.id
        //向这个socket发送消息
        socket.emit(id,'来自后端的消息')
    }
}
module.exports = NspController