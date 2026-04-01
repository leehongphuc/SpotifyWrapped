// plugins/withSpotifyQueries.js
//
// Custom Expo config plugin để thêm <queries> vào AndroidManifest.xml
// cho phép app mở Spotify bằng deep link (spotify:track:xxx, spotify:artist:xxx)
//
// Đặt file này tại: plugins/withSpotifyQueries.js

const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withSpotifyQueries(config) {
    return withAndroidManifest(config, async (config) => {
        const manifest = config.modResults;

        // Đảm bảo có mảng queries
        if (!manifest.manifest.queries) {
            manifest.manifest.queries = [];
        }

        // Kiểm tra xem đã có chưa để tránh duplicate khi build nhiều lần
        const alreadyAdded = manifest.manifest.queries.some(
            q => q.package && q.package[0]?.$?.['android:name'] === 'com.spotify.music'
        );

        if (!alreadyAdded) {
            manifest.manifest.queries.push(
                // Khai báo package Spotify
                {
                    package: [
                        {
                            $: { 'android:name': 'com.spotify.music' }
                        }
                    ]
                },
                // Khai báo intent với scheme spotify://
                {
                    intent: [
                        {
                            action: [
                                {
                                    $: { 'android:name': 'android.intent.action.VIEW' }
                                }
                            ],
                            data: [
                                {
                                    $: { 'android:scheme': 'spotify' }
                                }
                            ]
                        }
                    ]
                }
            );
        }

        return config;
    });
};