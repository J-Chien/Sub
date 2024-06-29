// 国家名映射
const countryMap = {
    TW: ['Taiwan', '台湾'],
    HK: ['Hong Kong', '香港'],
    JP: ['Japan', '日本'],
    US: ['United States', '美国'],
    SG: ['Singapore', '新加坡'],
    CA: ['Canada'],
    UK: ['United Kingdom'],
    DE: ['Germany'],
    NL: ['Netherlands'],
    IT: ['Italy'],
    ES: ['Spain'],
    TR: ['Turkey'],
    AU: ['Australia'],
    AR: ['Argentina'],
    BR: ['Brazil'],
    CL: ['Chile'],
    KR: ['Korea'],
    IN: ['India'],
    IL: ['Israel'],
    TH: ['Thailand'],
    VN: ['Vietnam'],
    MY: ['Malaysia'],
    ZA: ['Johannesburg']
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
    $done({ body });
}

function processData(body, provider) {
    const lines = body.split('\n').filter(Boolean);
    const processedLines = lines.map(line => {
        const proxy = line.match(/^(.*?)\s(.*?)\d/);
        if (!proxy) {
            return line;
        }
        let node = proxy[2];
        for (const key in countryMap) {
            const countryName = countryMap[key];
            for (const i in countryName) {
                if (node.indexOf(countryName[i]) != -1) {
                    node = `${providersMap[provider]} | ${key} `;
                }
            }
        }
        return line.replace(proxy[2], node);
    });
    return processedLines.join('\n');
}
