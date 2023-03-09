//构建适配器====>经典设计模式：适配器模式

export function getDefaultAdapter(){
    let adapter
    //判断当前的执行环境，如果XMLHttpRequest存在，则代表浏览器环境
    if(typeof XMLHttpRequest !== 'undefined'){
        //浏览器环境
        //-------------这里可以看到axios的底层是封装的xhr--------------
        adapter = require('./adapters/xhr');
    }else if(typeof process !== 'undefined'&&Object.prototype.toString.call(process) === '[object process]'){
        //node环境
        adapter = require('./adapters/http')
    }
    return adapter
}
/**
 * 以下举例浏览器环境下的XHRAdapter:
 * 
 * 1.new XMLHttpRequest()
 * 2.对request Header做处理
 * 3.xhr.open设置请求方式
 * 4.对onreadystatechange事件做监听
 * 5.如果配置了download或者upload,则针对process进行监听
 * 6.提供取消请求功能，调用原生abort方法
 * 7.request.send()请求
 */

//以下来自于./adapters/xhr.js

//判断使用者是否配置了取消请求
if(config.cancelToken){
    /**
     * 如果配置了cancelToken，那么后续调用cancel方法
     * 将会出发下列函数
     */
    config.cancelToken.promise.then(function onCanceled(cancel){
        if(!request){
            return;
        }
        //调用原生的xhr方法
        request.abort()
        //axios的promise实例进入rejected状态，能够捕获到catch
        reject(cancel)
        request = null
    })
}
//真正的发送请求
request.send(requestData)