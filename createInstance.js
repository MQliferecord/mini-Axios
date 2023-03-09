var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');

/**
 * 创建Axios实例对象的function
 * 整个过程的思路类似于new+寄生组合式继承的实现
 * @param {*} defaultConfig 
 * @returns 
 */
export function createInstance(defaultConfig){
    //构造实例对象
    let context = new Axios(defaultConfig);
    //更换this指针的指向
    let instance = bind(Axios.prototype.request,context);
    //继承相关的方法
    utils.extend(instance,Axios.prototype,context);
    //把context拷贝到instance上，隐藏相关的继承过程
    utils.extend(instance,context);

    //根据用户输入的config对配置进行修改
    instance.create = function create(instanceConfig){
        //合并默认配置和用户配置
        return createInstance(mergeConfig(defaultConfig,instanceConfig));
    }
    return instance;
}

