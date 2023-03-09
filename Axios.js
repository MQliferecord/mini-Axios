export function Axios(instanceConfig){
    this.defaults = instanceConfig;
    this.interceptors = {
        request:new InterceptorManager(),
        response:new InterceptorManager()
    }
}