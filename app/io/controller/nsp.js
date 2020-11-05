'use strict'

const await = require('await-stream-ready/lib/await')

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
    //离开直播间
    async leaveLive(){
        const {ctx,app,service,helper} = this
        const nsp = app.io.of('/')
        //接受参数
        const message = ctx.args[0] || {}
        //当前连接
        const socket = ctx.socket
        const id = socket.id
        let {live_id,token} = message
        //验证用户token
        let user = await this.checkToken(token)
        if(!user){
            return
        }
        //验证当前直播间是否存在或是否处于直播中
        let msg = await service.live.checkStatus(live_id)
        if(msg){
            socket.emit(
                id,
                ctx.helper.parseMsg('error',msg,{
                    notoast:true,
                })
            )
            return
        }
        const room = 'live_' + live_id
        //用户离开房间
        socket.leave(room)
        const rooms = [room]
        //更新在线用户列表
        nsp.adapter.clients(rooms,(err,clients) => {
            nsp.to(room).emit('online',{
                clients,
                action:'leave',
                user:{
                    id:user.id,
                    name:user.username,
                    avatar:user.avatar,
                },
            })
        })
        //更新redis存储
        let list = await service.cache.get('userList_' + room)
        if(list){
            list = list.filter((item) => item.id !== user.id)
            service.cache.set('userList_' + room,list)
        }
    }
    //直播间发送弹幕
    async comment(){
        const {ctx,app,service,helper} = this
        const nsp = app.io.of('/')
        //接受参数
        const message = ctx.args[0] || {}
        //当前连接
        const socket = ctx.socket
        const id = socket.id
        let {live_id,token,data} = message
        if(!data){
            socket.emit(id,ctx,helper.parseMsg('error','评论内容不能为空'))
            return
        }
        //验证用户token
        let user = await this.checkToken(token)
        if(!user){
            return
        }
        //验证当前直播间是否存在或是处于直播中
        let msg = await service.live.checkStatus(live_id)
        if(msg){
            socket.emit(id,ctx.helper.parseMsg('error',msg))
        }
        const room = 'live_' + live_id
        //推送消息到直播间
        nsp.to(room).emit('comment',{
            user:{
                id:user.id,
                name:user.nickname || user.username,
                avatar:user.avatar,
            },
            id:ctx.randomString(10),
            content:data,
        })
        //生成一条comment数据
        app.model.Comment.create({
            content:data,
            live_id,
            user_id:user.id,
        })
    }
    //直播间送礼物
    async gift(){
        const {ctx,app,service,helper} = this
        const nsp = app.io.of('/')
        //接受参数
        const message = ctx.args[0] || {}
        //当前连接
        const socket = ctx.socket
        const id = socket.id
        let {live_id,token,gift_id} = message
        //验证用户token
        let user = await this.checkToken(token)
        if(!user){
            return
        }
        //验证当前直播间是否存在或是处于直播中
        let msg = await service.live.checkStatus(live_id)
        if(msg) {
            socket.emit(id,ctx.helper.parseMsg('error',msg))
            return
        }
        const room = 'live_' + live_id
        //验证礼物是否存在
        let gift = await app.model.gift.findOne({
            where:{
                id:gift_id,
            },
        })
        if(!gift){
            socket.emit(id,ctx.helper.parseMsg('error','该礼物不存在'))
            return
        }
        //当前用户金币是否不足
        if(user.coin < gift.coin){
            socket.emit(id,ctx.helper.parseMsg('error','金币不足，请先充值'))
            return
        }
        //扣除金币
        user.coin -= gift.coin
        await user.save()
        //写入到礼物记录表
        app.model.LiveGift.create({
            live_id,
            user_id:user.id,
            gift_id,
        })
        //直播间总金币数+1
        let live = await app.model.Live.findOne({
            where:{
                id:live_id,
            },
        })
        live.coin += gift.coin
        live.save()
        //推送消息到直播间
        nsp.to(room).emit('gift',{
            avatar:user.avatar,
            username:user.nickname || user.username,
            gift_name:gift.name,
            gift_image:gift.image,
            gift_coin:gift.coin,
            num:1,
        })
    }
}
module.exports = NspController