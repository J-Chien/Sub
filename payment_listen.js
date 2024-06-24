class jamie {
    constructor() {
        this.hostname = 'partner.eu.tiktokshop.com';
        this.defaultHeader = {
            'Content-Type': 'application/json',
            'cookie': $persistentStore.read('SHENSI_Cookie'),
        };
        this.mapping = {
            "sold_products": "已售商品",
            "collaborated_creators_num": "建联达人",
            "estimated_partner_commission": "预计佣金",
            "promoted_creator_num": "发布达人",
            "pending_payment": "待支付佣金",
        };
    }
    httpAPI(config, params = {}, body = null) {
        const fullPath = config.path + '?' + this.parseParam({
            ...config.params,
            ...params
        });
        const options = {
            url: `https://${this.hostname}${fullPath}`,
            headers: this.defaultHeader,
            method: config.method,
            timeout: 10,
        };
        if (config.method === 'POST') {
            options.body = JSON.stringify(body);
        }
        return new Promise((resolve, reject) => {
            let requestMethod = config.method === 'GET' ? $httpClient.get : $httpClient.post
            requestMethod(options, (error, response, data) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(JSON.parse(data));
                }
            })
        });
    };

    parseParam(params) {
        return Object.entries(params)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
    }

    formatTime(timestamp, timeZone) {
        const date = new Date(parseInt(timestamp));
        const options = {
            timeZone: timeZone,
            hour: 'numeric',
            minute: 'numeric',
            month: 'short',
            day: 'numeric',
        };
        return date.toLocaleDateString('zh-CN', options);
    };

    done = (body) => {
        $done(body);
    };
};

const apiConfigs = {
    // 获取进行中的 campaign
    getOngoingCampaign: {
        path: '/api/v1/affiliate/partner/campaign/list',
        method: 'GET',
        params: {
            "status": 3,
            "cur_page": 1,
            "page_size": 50,
            "crs_campaign_type": 3,
        },
    },
    // 获取 campaign 信息
    getCampaignDetail: {
        path: '',
        method: 'GET',
        params: {
            "campaign_id": "",
        },
    },
    // 获取 campaign 下的产品列表
    getCampaignProductList: {
        path: '/api/v1/affiliate/partner/campaign/product_list/list',
        method: 'GET',
        params: {
            "category_id": "",
            "cur_page": 1,
            "page_size": 20,
        },
    },
    // 获取 campaign 的数据信息
    getCampaignStatistics: {
        path: '/api/v1/affiliate/partner/campaign/statistics',
        method: 'GET',
        params: {
            "campaign_id": "",
        },
    },
    // 获取商品信息
    getProductStatistics: {
        path: '/api/v1/affiliate/partner/campaign/product/statistics/list',
        method: 'GET',
        params: {
            "campaign_id": "7372498587680458528",
            "cur_page": 1,
            "page_size": 100,
        },
    },
    // 获取分类列表，传 0 为所有一级分类，共三级，传语言返回中文
    getCategoryList: {
        path: '/api/v1/affiliate/lux/product/category/children',
        method: 'GET',
        params: {
            "category_id": 0,
            "user_language": "zh-CN",
        },
    },
    // 获取分类下的产品列表（筛选）
    getCategoryProductList: {
        path: '/api/v1/affiliate/partner/campaign/product/list',
        method: 'GET',
        params: {
            "marked": false,
            "category_ids": "",
            "cur_page": 1,
            "page_size": 50,
            "campaign_id": "",
        },
    },
    // 创建产品列表
    createProductList: {
        path: '/api/v1/affiliate/partner/campaign/product_list/create',
        method: 'POST',
        body: {
            "name": '',
            "campaign_id": "7372498587680458528",
            "items": [{
                product_id: '',
                creator_commission_rate: '1300'
            }],
        }
    },
    getPaymentInfo: {
        path: '/api/v1/oec/affiliate/agent/summary',
        method: 'GET',
    },
};

const $ = new jamie();

(async () => {
    try {
        const currentPaymentInfo = await $.httpAPI(apiConfigs.getPaymentInfo);

        if (currentPaymentInfo["message"] === "no login") {
            console.log(currentPaymentInfo)
            $notification.post('!!!ERROR!!!', 'Error Message', '请重新获取 Cookie');
            $.done();
        }

        if ($persistentStore.read('SHENSI_Payment_stat') === null) {
            $persistentStore.write(currentPaymentInfo, 'SHENSI_Payment_stat');
            console.log(缓存写入成功);
            $.done();
        }

        const previousPaymentInfo = JSON.parse($persistentStore.read('SHENSI_Payment_stat'))
        const notifications = [];

        if (currentPaymentInfo["data"]["pending_payment"] !== previousPaymentInfo["data"]["pending_payment"]) {
            const title =  `💰 佣金变更`;
            const subtitle = `⏰ ${$.formatTime(Date.now(), 'Asia/Taipei')}`;
            let body = `${parseFloat(currentPaymentInfo["data"]["pending_payment"]) - parseFloat(previousPaymentInfo["data"]["pending_payment"]) > 0 ? '📈 新增' : '📉 减少'} `;
            body += `£${Math.abs(parseFloat(currentPaymentInfo["data"]["pending_payment"]) - parseFloat(previousPaymentInfo["data"]["pending_payment"])).toFixed(2)}`;
            body += `，总计 £${currentPaymentInfo["data"]["pending_payment"]}`

            notifications.push({
                title: title,
                subtitle: subtitle,
                body: body,
            });
        }

        $persistentStore.write(currentPaymentInfo, 'SHENSI_Payment_stat');

        if (notifications.length === 0) {
            console.log(`${$.formatTime(Date.now(), 'Asia/Taipei')} 监控，无更新`)
            $.done()
        }

        notifications.forEach(notification => {
            $notification.post(notification.title, notification.subtitle, notification.body, {
                url: notification.url
            });
            console.log(`\n${notification.title}\n${notification.subtitle}\n${notification.body}`)
        });
        $.done();
    } catch (error) {
        $notification.post('!!!ERROR!!!', 'Error Message', error);
        console.log(error)
        $.done();
    }
})();
