module.exports = function dispatchRequest(config){
    //提前取消请求
    throwIfCancellationRequested(config)

    //获取配置
    config.headers = config.headers||{}
    config.data = transformData.call(
        config,
        config.data,
        config.headers,
        config.transformRequest
    )
    config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers
    )
    
    //构建axios适配器
    let adapter = config.adapter||defaults.adapter
    //执行
    return adapter(config).then(function onAdapterResolution(response){
        // 提前取消请求情况
        throwIfCancellationRequested(config);
        response.data = transformData.call(
            config,
            response.data,
            response.headers,
            config.transformResponse
        )
        return response
    },function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);
          // 做数据转换
          if (reason && reason.response) {
            reason.response.data = transformData.call(
              config,
              reason.response.data,
              reason.response.headers,
              config.transformResponse
            );
          }
        }
        return Promise.reject(reason)
    })
}

function throwIfCancellationRequested(config){
    if(config.cancelToken){
        config.cancelToken.throwIfRequested()
    }
}

