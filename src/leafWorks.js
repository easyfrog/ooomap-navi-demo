import L from "leaflet";
import 'leaflet/dist/leaflet.css';

import { glo } from './glo';

const con = document.querySelector('#leaflet')

// 初始化地图
const map = L.map('leaflet').setView([39.092424, 117.205818], 18); // 初始视图为北京

// 添加 OpenStreetMap 图层
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/ ">OpenStreetMap</a> 贡献者',
    maxZoom: 20,
}).addTo(map);

let currentMarker = null;

// 监听点击事件
map.on('click', function (e) {
    const lat = +e.latlng.lat.toFixed(6);   // 纬度
    const lng = +e.latlng.lng.toFixed(6);   // 经度

    const coordText = `${lng}, ${lat}`; // 注意：经度在前，纬度在后
    document.getElementById('coords').textContent = coordText;

    console.log(`WGS84 坐标: ${coordText}`);

    // 移除已有标记
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }

    // 添加新标记
    currentMarker = L.marker([lat, lng]).addTo(map);
    currentMarker.bindPopup(`<strong>坐标:</strong><br>${coordText}`).openPopup();

    // 自动复制到剪贴板
    navigator.clipboard.writeText(coordText).then(() => {
        // alert('坐标已复制到剪贴板：' + coordText);
    }).catch(err => {
        console.error('复制失败:', err);
    });

    // 触发事件, 适配 geolocation 数据接口
    glo.emit('gps', {coords: {
        longitude: lng,
        latitude: lat
    }})
});


