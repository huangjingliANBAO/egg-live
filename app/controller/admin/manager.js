'use strict';

const Controller = require('egg').Controller;

class ManagerController extends Controller {
    // 创建管理员表单
    async create(){
        const { ctx } = this;
        await ctx.render('admin/manager/create.html');
    }
    // 创建管理员逻辑
    async save(){
        const { ctx,app } = this;

        ctx.validate({
            username:{
                type:"string",
                required:true,
                desc:"管理员账户"
            },
            password:{
                type:"string",
                required:true,
                desc:"密码"
            }
        })


        let { username,password } = ctx.request.body;


        if(await app.model.Manager.findOne({
            where:{
                username
            }
        })){
            return ctx.apiFail('该管理员已存在');
        }


        let manager = await app.model.Manager.create({
            username,password
        })


        ctx.apiSuccess(manager)
    }
    // 管理员列表
  async index() {
    const { ctx, app } = this
    let data = await ctx.page('Manager')
    await ctx.render('admin/manager/index.html', {
      data,
    })
  }
  //删除管理员
  async delete() {
    const { ctx, app } = this
    const id = ctx.params.id
    await app.model.Manager.destroy({
      where: {
        id,
      },
    })
    ctx.toast('删除成功', 'success')
    ctx.redirect('/admin/manager')
  }
}

module.exports = ManagerController;
