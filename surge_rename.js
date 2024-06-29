// 国家名映射，添加时移除空格
const countryMap = {
    'Taiwan|台湾': 'TW',
    'HongKong|香港': 'HK',
    'Japan|日本': 'JP',
    'UnitedStates|美国': 'US',
    'Singapore|新加坡': 'SG',
    'Canada': 'CA',
    'UnitedKingdom': 'UK',
    'Germany': 'DE',
    'Netherlands': 'NL',
    'Italy': 'IT',
    'Spain': 'ES',
    'Turkey': 'TR',
    'Australia': 'AU',
    'Argentina': 'AR',
    'Brazil': 'BR',
    'Chile': 'CL',
    'Korea': 'KR',
    'India': 'IN',
    'Israel': 'IL',
    'Thailand': 'TH',
    'Vietnam': 'VN',
    'Malaysia': 'MY',
    'Johannesburg': 'ZA'
};
// $argument 映射
const providersMap = {
    'WestData': 'WD',
    'AmyTelecom': 'Amy',
};

let body;

try {
    body = $response.body.toString('utf8');
    body = processData(body, $argument);
    body = body.replace(/🇨🇳/g, '🇹🇼');
} catch (error) {
    console.log(error);
} finally {
    $done({
        body
    });
}

function getCountryCode(match) {
    // 遍历 countryMap 对象
    for (const [key, value] of Object.entries(countryMap)) {
        // 检查 key 是否包含 match
        if (key.includes(match)) {
            return value;
        }
    }
    // 如果没有找到匹配项，返回 null
    return null;
}

function processData(body, provider) {
    const lines = body.split('\n');
    const processedLines = lines.map(line => {
        // 匹配节点名
        const proxy = line.match(/^(.*?)=/);
        if (!proxy) {
            return line;
        }
        const prefix = proxy[1].trim();
        // 将空格跟 ‘|’ 移除
        const sanitizedPrefix = prefix.replace(/[\s|]/g, '');
        // 利用国家映射表进行替换
        let countryCode = sanitizedPrefix.replace(new RegExp(Object.keys(countryMap).join('|'), 'gi'), country => ` ${providersMap[provider]} | ${getCountryCode(country)} `);
        // 将替换后的国家代码重新插入到原始字符串中
        return line.replace(prefix, countryCode);
    });
    return processedLines.join('\n');
}
