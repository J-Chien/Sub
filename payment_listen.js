class jamie {
    constructor() {
        this.hostname = 'partner.eu.tiktokshop.com';
        this.defaultHeader = {
            'Content-Type': 'application/json',
            'cookie': $persistentStore.read('SHENSI_Cookie'),
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

        if ($persistentStore.read('SHENSI_Payment_stat') == null) {
            $persistentStore.write(JSON.stringify(currentPaymentInfo), 'SHENSI_Payment_stat');
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

        if (notifications.length === 0) {
            console.log(`${$.formatTime(Date.now(), 'Asia/Taipei')} 监控，无更新`)
            $.done()
        }

	$persistentStore.write(JSON.stringify(currentPaymentInfo), 'SHENSI_Payment_stat');

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
