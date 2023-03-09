import { createInstance } from "./createInstance";
var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var mergeConfig = require('./core/mergeConfig');
var defaults = require('./defaults');

let axios = createInstance(defaults);

//主请求的方法，所有的请求都会指向这个方法
Axios.prototype.request = function request(config) {
    //------------------axios请求核心：链式调用----------------

    //config类型判断
    if (typeof config == 'string') {
        config = arguments[1] || {};
        config.url = arguments[0];
    } else {
        config = config || {}
    }

    config = mergeConfig(this.defaults, config);

    //转化请求的方法，转化为小写:
    //主要是查看配置有没有配置相关的请求要求，如果默认配置和用户配置都没有，就采取get
    if (config.method) {
        config.method = config.method.toLowerCase();
    } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase();
    } else {
        config.method = 'get'
    }

    //针对性配置
    let transitional = config.transitional;
    if (transitional !== undefined) {
        validator.assertOptions(transitional, {
            silentJSONParsing: validators.transitional(validators.boolean, '1.0.0'),
            forcedJSONParsing: validators.transitional(validators.boolean, '1.0.0'),
            clarifyTimeoutError: validators.transitional(validators.boolean, '1.0.0')
        }, false);
    }
    /**
     * 整个promise链的执行情况：
     * 请求拦截器===>请求===>响应拦截器
     * 
        //创建存储链式调用的数组，首位是核心调用方法dispatchRequest,第二位是undefined
        //---------------dispatchRequest是微任务，按照EventLoop接下来会进入宏任务在开启新一轮事件循环
        let chain = [dispatchRequest,undefined];
        //创建promise 
        //为什么resolve(config) 因为请求拦截器是最先执行
        //所以设置请求拦截器可以拿到每次请求的所有config配置
        let promise = Promise.resolve(config);
        //设置拦截器 将成功函数/失败函数压入链中
        //注意请求拦截器是unshift 响应拦截器是push
        //整个拦截器的执行被包裹成一个洋葱模型
        this.interceptors.request.forEach(function unshiftRequestInsterceptors(interceptor){
            chain.unshift(interceptor.fulfilled,interceptor.rejected);
        })
        this.interceptors.reponse.forEach(function pushResponseInsterceptors(interceptor){
            chain.push(interceptor.fulfilled,interceptor.rejected);
        })
        //每次取出成双成对的chain来调用
        while(chain.length){
            //---------------------第二轮微任务----------------
            promise = promise.then(chain.shift(),chain.shift())
        }
    */

    /**
     * 新的Promise链式调用，针对请求拦截器有是很长的宏任务执行进行了优化。
     * 
     * 在之前的代码中，请求放在了promise.then的微任务中
     * 但是如果之前进行拦截的时候出现耗时较长的一整个EventLoop的宏任务
     * 会导致真正的Ajax请求发生延迟
     */

    //请求拦截器存储数组
    //-------------------优化关键代码(1)：将dispatch移到后面---------------
    //------------------防止用户进行拦截请求的时候插入过长的宏任务------------
    let requestInterceptorChain = [];
    //默认所有的请求拦截器都为同步
    let synchronousRequestInterceptors = true;
    //遍历请求拦截器的数组
    this.interceptors.request.forEach(function unshiftRequestInsterceptors(interceptor) {
        /**
         * interceptor实例化请求对象
         * runWhen是Axios对外暴露的属性，表示需要运行时候执行的属性
         * 这里再判断是否已经配置了正确配置该属性
         * */
        if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
            return;
        }
        // interceptor.synchronous 是对外提供的配置，可标识该拦截器是异步还是同步 默认为false(异步) 
        // 这里是来同步整个执行链的执行方式的，如果有一个请求拦截器为异步 那么下面的promise执行链则会有不同的执行方式
        synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    })

    let responseInterceptorChain = [];
    let synchronousResponseInterceptors = true;
    this.interceptors.response.forEach(function unshiftResponseInsterceptors(interceptor) {
        if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
            return;
        }
        synchronousResponseInterceptors = synchronousResponseInterceptors && interceptor.synchronous;
        responseInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    })

    let promise;
    //如果异步 默认情况
    if (!synchronousRequestInterceptors) {
        //------------优化代码(2):所有配置已经完成后，构造实例，组成promise链-------------
        let chain = [dispatchRequest, undefined]
        //请求拦截器
        Array.prototype.unshift.apply(chain, requestInterceptorChain)
        //响应拦截器
        chain = chain.concat(responseInterceptorChain)

        promise = Promise.resolve(config)
        while (chain.length) {
            promise = promise.then(chain.shift(), chain.shift())
        }
        return promise;
    }
    //同步------------可能出现阻塞时---------------
    let newConfig = config
    while (requestInterceptorChain.length) {
        let onFulfilled = requestInterceptorChain.shift();
        let onRejected = requestInterceptorChain.shift();
        try {
            newConfig = onFulfilled(newConfig)
        } catch (error) {
            onRejected(error)
            break;
        }
    }

    //----------------优化代码(3):排除错误后配置dispatchRequest-------------
    try {
        promise = dispatchRequest(newConfig);
    } catch (error) {
        return Promise.reject(error);
    }

    while (responseInterceptorChain.length) {
        promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
    }

    return promise;
}
//获取完成请求的Url
Axios.prototype.getUrl = function getUrl(config) { }

//这里将query和params等通过url传递的数据的请求，挂载到prototype上
utils.forEach(['delete', 'get', 'head', 'options', 'post'], function forEachMethodNoData(method) {
    Axios.prototype[method] = function (url, config) {
        //最终都调用request方法
        return this.request(mergeConfig(config || {}, {
            method: method,
            url: url,
            data: (config || {}).data
        }))
    }
})
//这里将包括body传递的数据的请求，挂载到prototype上
utils.forEach(['get', 'post', 'patch'], function forEachMethodNoData(method) {
    Axios.prototype[method] = function (url, data, config) {
        //最终都调用request方法
        return this.request(mergeConfig(config || {}, {
            method: method,
            url: url,
            data: data
        }))
    }
})
/**
 * Axios.prototype挂载了以下方法
axios.request(config)
axios.get(url[, config])
axios.delete(url[, config])
axios.head(url[, config])
axios.options(url[, config])
axios.post(url[, data[, config]])
axios.put(url[, data[, config]])
axios.patch(url[, data[, config]]) 
 */

//向外暴露Axios类，用于继承
axios.Axios = Axios;

//抛出 中断/取消请求 的方法入口
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

//利用promise.all实现并发
axios.all = function all(promises) {
    return Promise.all(promises)
}

//返回一个callback
axios.spread = function spread(callback) {
    return function wrap(arr) {
        return callback.apply(null, arr)
    }
}

//合并config请求，和deepClone一样使用递归实现
function merge(/* obj1, obj2, obj3, ... */) {
    var result = {};
    // 闭包处理逻辑函数
    function assignValue(val, key) {
        // result里有该键值并且 同为普通Object对象类型递归merge
        if (isPlainObject(result[key]) && isPlainObject(val)) {
            result[key] = merge(result[key], val);
            // result里没有 赋值
        } else if (isPlainObject(val)) {
            result[key] = merge({}, val);
            // 数组类型
        } else if (isArray(val)) {
            result[key] = val.slice();
            // 其他类型直接赋值
        } else {
            result[key] = val;
        }
    }
    // 循环入参调用
    for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
    }
    // 返回合并后的结果
    return result;
}

//错误抛出检测
axios.isAxiosError = require('./helpers/isAxiosError');

//导出
module.exports = axios;
//ts使用默认导出

module.exports.default = axios;
