/*
参考博客: https://blog.csdn.net/qq_23375733/article/details/81417296
参考代码: https://github.com/hujinchen/Image_upload_aliyun

只需更改utils/config.js

阿里云key from pacemaker_backstage/../aliyun.properties :

aliyun.endpoint = oss-cn-shanghai.aliyuncs.com
aliyun.accessKeyId = LTAI5t9QcXCSVkzuf2qdrRjE
aliyun.accessKeySecret = eHnN5Ie3hEfKwOhbCpPA29jDKlygBD
aliyun.bucketName = sakucy
aliyun.urlPrefix = https://sakucy.oss-cn-shanghai.aliyuncs.com/

 */
const env = require('config.js'); //配置文件，在这文件里配置你的OSS keyId和KeySecret,timeout:87600;

const base64 = require('base64.js'); //Base64,hmac,sha1,crypto相关算法
require('hmac.js');
require('sha1.js');
const Crypto = require('crypto.js');

/*
 *上传文件到阿里云oss
 *@param - filePath :图片的本地资源路径
 *@param - dir:表示要传到哪个目录下
 *@param - successc:成功回调
 *@param - failc:失败回调
 */
const uploadFile = function (filePath, dir, successc, failc) {
    if (!filePath || filePath.length < 9) {
        wx.showModal({
          title: '图片错误',
          content: '请重试（注意：图片不能大于5M或者请勿勾选原图）',
          showCancel: false,
        })
        console.log("上传图片发生错误, /utils/uploadFile")
        return;
    }

    // console.log('上传图片.....');

    // 获取上传的文件类型
    let fileTypeIndex = filePath.lastIndexOf('.');
    let fileType = filePath.substring(fileTypeIndex);

    //图片名字 可以自行定义，     这里是采用当前的时间戳 + 150内的随机数来给图片命名的
    // const aliyunFileKey = dir + new Date().getTime() + Math.floor(Math.random() * 150) + '.png';
    function format(dataString) {
        //dataString是整数，否则要parseInt转换
        var time = new Date(dataString);
        var year = time.getFullYear();
        var month = time.getMonth() + 1;
        var day = time.getDate();
        var hour = time.getHours();
        var minute = time.getMinutes();
        var second = time.getSeconds();
        return year + '-' + (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day) + '/' +
        (hour < 10 ? '0' + hour : hour) + '-' + (minute < 10 ? '0' + minute : minute) + '-' + (second < 10 ? '0' + second : second)
    }
    const aliyunFileKey = "image/pacemaker/" + dir  + format(new Date().getTime()) + "-size-" + Math.floor(Math.random() * 150) + fileType;

    const aliyunServerURL = env.uploadImageUrl; //OSS地址，需要https
    const accessid = env.OSSAccessKeyId;
    const policyBase64 = getPolicyBase64();
    const signature = getSignature(policyBase64); //获取签名

    wx.uploadFile({
        url: aliyunServerURL, //开发者服务器 url
        filePath: filePath, //要上传文件资源的路径
        name: 'file', //必须填file
        // header: {
        //   "Content-Type":"multipart/form-data;",
        // },
        formData: {
            'key': aliyunFileKey,
            'policy': policyBase64,
            'OSSAccessKeyId': accessid,
            'signature': signature,
            'success_action_status': '200',
        },
        success: function (res) {
            if (res.statusCode != 200) {
                failc(new Error('上传错误:' + JSON.stringify(res)))
                return;
            }
            successc(aliyunServerURL + aliyunFileKey);
        },
        fail: function (err) {
            err.wxaddinfo = aliyunServerURL;
            failc(err);
        },
    })
}

const getPolicyBase64 = function () {
    let date = new Date();
    date.setHours(date.getHours() + env.timeout);
    let srcT = date.toISOString();
    const policyText = {
        "expiration": srcT, //设置该Policy的失效时间，超过这个失效时间之后，就没有办法通过这个policy上传文件了 
        "conditions": [
            ["content-length-range", 0, 5 * 1024 * 1024] // 设置上传文件的大小限制,5mb
        ]
    };

    const policyBase64 = base64.encode(JSON.stringify(policyText));
    return policyBase64;
}

const getSignature = function (policyBase64) {
    const accesskey = env.AccessKeySecret;

    const bytes = Crypto.HMAC(Crypto.SHA1, policyBase64, accesskey, {
        asBytes: true
    });
    const signature = Crypto.util.bytesToBase64(bytes);

    return signature;
}

module.exports = uploadFile;