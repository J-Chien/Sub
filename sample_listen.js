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
            "promotion_end_time": "结束时间",
            "READY_TO_SHIP_1": "🥡 待发货",
            "SHIPPED": "📤 已发货",
            "CONTENT_PENDING": "🎬 处理中",
            "COMPLETED": "✅ 已完成",
            "CANCELED": "🚫 已取消",
        };
        // 添加并发控制参数
        this.maxConcurrent = 10; // 最大并发数
        this.requestDelay = 10; // 请求间隔(毫秒)
    }

    // 添加延时函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 分批处理数组
    async batchProcess(items, batchSize, processFn) {
        const results = [];
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(processFn));
            results.push(...batchResults);
            if (i + batchSize < items.length) {
                await this.delay(this.requestDelay);
            }
        }
        return results;
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
    }

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
    }

    done = (body) => {
        $done(body);
    }
}

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
    // 样品管理
    getSampleRecords: {
        path: '/api/v1/affiliate/partner/sample/records/list',
        method: 'POST',
        body: {
            "search_params": [
                {
                    "search_key": 28,
                    "search_type": 1,
                    "value": "0"
                }
            ],
            "order_params": [
                {
                    "order_key": 9,
                    "order_type": 2
                }
            ],
            "page_size": 5,
            "cur_page": 1
        }
    },

};

const $ = new jamie();

(async () => {
    try {
        const sampleRecords = await $.httpAPI(apiConfigs.getSampleRecords,{},apiConfigs.getSampleRecords.body);
        if (sampleRecords["message"] === "no login") {
            console.log(sampleRecords)
            $notification.post('!!!ERROR!!!', 'Error Message', '请重新获取 Cookie');
            $.done();
        }

        const currentSampleStatus = sampleRecords.data.sample_status_num_map

        // 处理缓存和通知的逻辑...
        if ($persistentStore.read('SHENSI_Sample_stat') === null) {
            $persistentStore.write(JSON.stringify(currentSampleStatus), 'SHENSI_Sample_stat');
            console.log('缓存写入成功');
            $.done();
        }

        const previousSampleStatus = JSON.parse($persistentStore.read('SHENSI_Sample_stat'));
        const statusOrder = ["READY_TO_SHIP_1", "SHIPPED", "CONTENT_PENDING", "COMPLETED", "CANCELED"];

        let totalPrevious = 0;
        let totalCurrent = 0;
        let changes = [];
        const notifications = [];

        for (const key of statusOrder) {
            const prevValue = previousSampleStatus[key] || 0;
            const currValue = currentSampleStatus[key] || 0;
            totalPrevious += prevValue;
            totalCurrent += currValue;

            if (prevValue !== currValue) {
                const diff = currValue - prevValue;
                const symbol = diff > 0 ? '↑' : '↓';
                changes.push({
                    key,
                    value: currValue,
                    diff: diff !== 0 ? `${symbol}${Math.abs(diff)}` : ''
                });
            }
        }

        // 格式化通知内容
        const subtitleDiff = totalCurrent - totalPrevious;
        const subtitleSymbol = subtitleDiff > 0 ? `↑${subtitleDiff}` : subtitleDiff < 0 ? `↓${Math.abs(subtitleDiff)}` : '';
        const subtitle = `🔄 全部\t${totalCurrent}${subtitleSymbol ? `\t${subtitleSymbol}` : ''}`;

        const body = changes
            .filter(change => statusOrder.includes(change.key))
            .map(change => {
                return `${$.mapping[change.key]}\t${change.value}\t${change.diff}`;
            })
            .join('\n');

        // 推送通知
        if (body) {
            notifications.push({
                title: `📦 样品状态发生变更`,
                subtitle,
                body,
                //url: `https://partner.eu.tiktokshop.com/affiliate-campaign/sample-requests?market=3&tab=all `
            });
        }

        $persistentStore.write(JSON.stringify(currentSampleStatus), 'SHENSI_Sample_stat');

        if (notifications.length === 0) {
            console.log(`${$.formatTime(Date.now(), 'Asia/Taipei')} 监控，无更新`)
            $.done()
        }

        notifications.forEach(notification => {
            $notification.post(notification.title, notification.subtitle, notification.body);
            console.log(`\n${notification.title}\n${notification.subtitle}\n${notification.body}`)
        });

        $.done();

    } catch (error) {
        $notification.post('!!!ERROR!!!', 'Error Message', error);
        console.log(error)
        $.done();
    }
})();
