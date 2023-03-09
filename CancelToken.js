function CancelToken(executor){
    //类型判断
    if(typeof executor !== 'function'){
        throw new TypeError('executor must be a function')
    }
    //创建一个promise的实例
    let resolvePromise;
    this.promise = new Promise(function promiseExecutor(resolve){
        //把resolve方法提出来，当作resolvePromise执行，this.promise状态会编程fulfilled
        resolvePromise = resolve;
    })

    let token = this

    executor(function cancel(message){
        if(token.reason){
            return;
        }
        token.reason = new Cancel(message)
        resolvePromise(token.reason)
    })
}

CancelToken.source = function source(){
    let cancel
    //new CancelToken会立刻调用executor方法，也就是 cancel = c
    /**
     * 结果变成 
     * cancel = function cancel(message){
         if(token.reason){
             return;
         }
         token.reason = new Cancel(message)
         resolvePromise(token.reason)
         像是Demo中的例子，最后会变成resolvePromise('主动取消请求')
       }
     */
    let token = new CancelToken(function executor(c){
        cancel = c;
    })
    return {
        token:token,
        cancel:cancel
    }
}

CancelToken.prototype.throwIfRequested = function throwIfRequested(){
    if(this.reason){
        throw this.reason;
    }
}