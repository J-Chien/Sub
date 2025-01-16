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

    formatTime(timestamp,timeZone) {
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
            "partner_id": "8650039763468192517",
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
            "partner_id": "8650039763468192517",
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

};

const $ = new jamie();

(async () => {
    try {
        const campaignList = await $.httpAPI(apiConfigs.getOngoingCampaign);
        if (campaignList["code"] !== 0) {
            console.log(campaignList)
            const msg = campaignList["message"] || campaignList["msg"];
            $notification.post('❌ ERROR!!!', `code: ${campaignList["code"]}`, `msg: ${msg}`);
            $.done();
        }

        const campaigns = campaignList.data.campaign.map((campaign) => ({
            name: campaign.name,
            campaign_id: campaign.campaign_id,
            promotion_start_time: campaign.promotion_start_time,
            promotion_end_time: campaign.promotion_end_time,
        }));

        // 使用批处理获取统计数据
        const getCampaignStat = async (campaign) => {
            const campaignStat = await $.httpAPI(apiConfigs.getCampaignStatistics, {
                campaign_id: campaign.campaign_id,
            });
            
            return {
                ...campaign,
                sold_products: campaignStat.data.sold_products,
                collaborated_creators_num: campaignStat.data.indicator_data.collaborated_creators_num,
                promoted_creator_num: campaignStat.data.indicator_data.promoted_creator_num,
                estimated_partner_commission: campaignStat.data.indicator_data.estimated_partner_commission,
            };
        };

        const campaignStats = await $.batchProcess(campaigns, $.maxConcurrent, getCampaignStat);

        campaignStats.sort((a, b) => {
            if (a.estimated_partner_commission === b.estimated_partner_commission) {
                return b.collaborated_creators_num - a.collaborated_creators_num
            } else {
                return b.estimated_partner_commission - a.estimated_partner_commission
            }
        });

        const currentCampaignData = campaignStats;
        
        // 处理缓存和通知的逻辑...
        let previousCampaignData = $persistentStore.read('SHENSI_Camp_stat')
        if (!previousCampaignData) {
        	$persistentStore.write(JSON.stringify(currentCampaignData), 'SHENSI_Camp_stat');
            console.log('缓存写入成功');
            $.done();
        } else {
        	previousCampaignData = JSON.parse(previousCampaignData)
        }
        
        const notifications = [];

        // 比较逻辑和通知生成保持不变...
        currentCampaignData.forEach(currentCampaign => {
            const previousCampaign = previousCampaignData.find(item => item.campaign_id === currentCampaign.campaign_id);

            if (!previousCampaign) {
                notifications.push({
                    title: `⬆️ Campaign 已新增`,
                    subtitle: `📌 ${currentCampaign.name}`,
                    body: `⏰ 活动开始时间: ${$.formatTime(currentCampaign.promotion_start_time, 'Europe/London')}`,
                    //url: `https://partner.eu.tiktokshop.com/affiliate-campaign/platform-campaign/detail?campaign_id=${currentCampaign.campaign_id}&tab=details`,
                });
                return;
            }

            for (const key in currentCampaign) {
                if (currentCampaign[key] !== previousCampaign[key]) {
                    const title = `📊 ${$.mapping[key] || key}发生变更`;
                    const subtitle = `📌 ${currentCampaign.name}`;
                    let body = `${parseFloat(currentCampaign[key]) - parseFloat(previousCampaign[key]) > 0 ? '📈 新增' : '📉 减少'} `;
                    if (key === "estimated_partner_commission") {
                        body += `£${Math.abs(parseFloat(currentCampaign[key]) - parseFloat(previousCampaign[key])).toFixed(2)}`;
                        body += `，总计 £${currentCampaign[key]}`
                    } else if (key === "promotion_end_time") {
                        body += `${Math.abs(parseFloat(currentCampaign[key]) - parseFloat(previousCampaign[key]))/86400000} 天`;
                        body += `，活动结束时间: ${$.formatTime(currentCampaign.promotion_end_time, 'Europe/London')}`;
                    } else {
                        body += `${Math.abs(parseFloat(currentCampaign[key]) - parseFloat(previousCampaign[key]))}`;
                        body += `，总计 ${currentCampaign[key]}`
                    }
                    notifications.push({
                        title: title,
                        subtitle: subtitle,
                        body: body,
                        //url: `https://partner.eu.tiktokshop.com/affiliate-campaign/platform-campaign/detail?campaign_id=${currentCampaign.campaign_id}&tab=performance`,
                    });
                }
            }
        });

        previousCampaignData.forEach(previousCampaign => {
            const currentCampaign = currentCampaignData.find(
                item => item.campaign_id === previousCampaign.campaign_id
            );
            if (!currentCampaign) {
                notifications.push({
                    title: `⬇️ Campaign 已移除`,
                    subtitle: `📌 ${previousCampaign.name}`,
                    body: `⏰ 活动结束时间: ${$.formatTime(previousCampaign.promotion_end_time, 'Europe/London')}`,
                    //url: `https://partner.eu.tiktokshop.com/affiliate-campaign/platform-campaign/detail?campaign_id=${previousCampaign.campaign_id}&tab=details`,
                });
            }
        });

        $persistentStore.write(JSON.stringify(currentCampaignData), 'SHENSI_Camp_stat');

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
