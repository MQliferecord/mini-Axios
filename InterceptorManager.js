//构造对象
function InterceptorManager(){
    this.handlers = []
}

//注册配置属性
InterceptorManager.prototype.use = function use(fulfilled,rejected,options){
    this.handlers.push({
        fulfilled:fulfilled,
        rejected:rejected,
        synchronous:options?options.synchronous:false,
        runWhen:options?options.runWhen:null,
    })
    return this.handlers.length-1;
}

//注销该拦截器
InterceptorManager.prototype.eject = function eject(id){
    if(this.handlers[id]){
        this.handlers[id] = null;
    }
}

//重构遍历 执行函数
InterceptorManager.prototype.forEach = function forEach(fn){
    utils.forEach(this.handlers,function forEachHandler(h){
        //确定没有被eject注销 才执行
        if(h!==null){
            fn(h)
        }
    })
}
module.exports = InterceptorManager