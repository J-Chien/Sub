if ($request && $request.method != 'OPTIONS') {
    const cookie = $request.headers['cookie'];
    console.log(cookie);
    $persistentStore.write(cookie, 'SHENSI_Cookie');
    $notification.post('getCookie success', 'Stored in SHENSI_Cookie', cookie);
    $done;
}