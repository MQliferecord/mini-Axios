import {CancelToken} from axios

/**
 * source = {
        token:token,
        cancel:cancel
    }

    token = this.promise

    cancel = function cancel(message){
         if(token.reason){
             return;
         }
         token.reason = new Cancel(message)
         resolvePromise(token.reason)
    }
 */
const source = CancelToken.source()

axios
    .get('/user',{
        cancelToken:source.token,
    })
    .catch(function(thrown){
        if(axios.isCancel(thrown)){
            console.log('主动取消',thrown.message)
        }else{
            console.error(thrown)
        }
    })

source.cancel('主动取消请求')

/**
 * (1)创建请求
 * (2)发起真正的请求前
 * (3)是否配置cancelToken
 * (4)如果配置cancelToken则注册原生取消请求的函数
 * (5)调用cancel方法
 */


/**
 * axios的并发能力
 */

function getUserAccount(){
    return axios.get('./user/12345')
}
function getUserPermissions(){
    return axios.get('./user/12345/permissions')
}
axios.all([getUserAccount(),getUserPermissions()])
    .then(axios.spread((acct,perms)=>{
        //两个请求执行完触发spread的callback
    }))