import './style.css'
import './ui';
import { glo } from './glo';

const app = document.querySelector('#app')

// 创建Map对象
const map = new om.Map({
    container: app,
    verifyUrl: 'https://www.ooomap.com/ooomap-verify/check/a83b7010ee631c04c43250dc7b907a6a',
    appID: 'f885c56988582790b06f82c43810972c',
    autoIndoorThreshold: 0.5
})

/////////////////// 用于坐标映射 ////////////////// 
// 拾取的ooomap地图上的平面坐标
// let map_coord = {
//     center: [-187.24, -248.10, 0],
//     x_pos: [76.19, -248.54, 0]
// }
let map_coord = {
    center: [52.314, -204.882, 0],
    x_pos: [-156.357, -206.81, 0]
}

// 需要将经纬度转为墨卡托坐标
// let m1 = om.utils.coordTransform.lngLatToMercator(120.16902413994117, 36.0033176776926)
// let m2 = om.utils.coordTransform.lngLatToMercator(120.17187609545955, 36.00374745435119)
// let m1 = om.utils.coordTransform.lngLatToMercator(117.20523011646581, 39.09223374182203)
// let m2 = om.utils.coordTransform.lngLatToMercator(117.20625656738201, 39.09225105035402)
let m1 = om.utils.coordTransform.lngLatToMercator(117.2053831, 39.0923111)
let m2 = om.utils.coordTransform.lngLatToMercator(117.206352, 39.092321)

// 经纬度对应的墨卡托坐标点
let real_coord = {
    center: [m1.x, m1.y, 0],
    x_pos: [m2.x, m2.y, 0]
}

// 构建坐标映射
const cp = new om.CoordProjection(real_coord, map_coord)
console.log('cp', cp)

// 将经纬度转为墨卡托坐标
function transCoord(lng, lat) {
    let coord = om.utils.coordTransform.lngLatToMercator(lng, lat)
    let v = cp.realToMap(coord.x, coord.y)
    v.z = 1
    return v
}
/////////////////// 用于坐标映射 end ////////////////// 

// 导航结束点标注
/** @type {om.SpriteMarkerNode} */
let endMarker = null;
/** @type {om.PlaneMarkerNode} */
let pointer = null;
let isNavigating = false;

// 导航选项
let naviOption = {
    followPosition: true,       // 位置跟随
    followDirection: true,      // 角度跟随
    autoChangeFloor: true,      // 自动切换楼层 会触发 (changeFloor, focusFloors) 事件
    zoom: 300,                  // 导航时的地图缩放值
    zoomOutOnComplete: true,    // 导航结束, 缩小视图
    offsetDistance: 5,          // 当偏离此值(米)时, 触发 "您已经偏离路线,请回到路线上" 事件 (navi-return-to-line)
    newPathDistance: 10,        // 当偏离大于此值(米)时, 触发 "重新规划路线" 事件 (navi-new-path)
    idleTime: 3000,             // 无操作此值(毫秒)后, 恢复跟随, 有操作时会暂停跟随
    completeDistance: 3         // 当与目的地相差此值(米)距离以内时, 触发 "到达终点" 事件 (navi-complete)
}

// 创建导航方法
let naviObj = null;
/**
 * @type {om.OMBuilding}
 */
let building = null;

/** @type {om.RouteResult} */
let routeRes = null;

// 拾取地图数据
let pickReuslt = null;

// 当建筑加载完成时 
map.on('buildingLoaded', b => {
    building = b;

    // 创建一个定位点
    pointer = om.createNaviPointer(map, 'images/pointer.png')

    console.log('pointer', pointer)
    
    // 设置一下它的初始坐标
    pointer.position = transCoord(117.214621, 39.095565)
    
    // 创建导航目标点标注,默认创建后是隐藏的
    endMarker = om.createNaviMarker(map, 'images/end.png')
})

// 注册地图拾取事件
map.on('picked', res => {
    console.log('拾取的地图坐标', res.intersect.point.toArray())

    pickReuslt = res

    if (!building) {
        return
    }

    // 如果不在导航状态时
    if (!isNavigating) {
        // 设置结束标注的位置
        endMarker.position = res.intersect.point
        // 并将其显示出来
        endMarker.show = true

        // 路线规划
        findPath()

        glo.emit('picked', isNavigating)
    }
    // 如果处于导航中
    else {

        // 在获取到新的位置后, 更新导航
        naviObj?.update(res.intersect.point, 1)

    }
})

/**
 * @typedef {{longitude: number, latitude: number}} GPS_Coord
 */

/**
 * @type {{
 * android: GPS_Coord[],
 * iOS: GPS_Coord[],
 * }}
 */
let gps = null;

/** @type {GPS_Coord[]} */
let currentGPSArray = null
let gpsIndex = 0;
/** @type {GPS_Coord} */
let currentLnglat = null

fetch('./gps2.json')
    .then(res => res.json())
    .then(res => {
        // 获得gps数据
        gps = res
        currentGPSArray = gps.android
    })

// 模拟gps获取位置经纬度坐标
// setInterval(() => {

//     if (!currentGPSArray || !pointer) {
//         return
//     }

//     let index = gpsIndex % currentGPSArray.length
//     currentLnglat = currentGPSArray[index]

//     let v = transCoord(currentLnglat.longitude, currentLnglat.latitude)

//     console.log('数据索引:', index, '数据地图坐标:', v.x, v.y)

//     pointer.moveTo({
//         position: v
//     })

//     gpsIndex ++
// }, 500);

navigator.geolocation.watchPosition(res => {
    if (!pointer) {
        return
    }

    let v = transCoord(res.coords.longitude, res.coords.latitude)

    v.z = 6

    pointer.moveTo({
        position: v
    })
})

/**
 * 路线规划方法
 * @returns {Promise<om.RouteResult>}
 */
function findPath() {
    // 先清除建筑之前的路线
    building.clearRoutes()

    // 起始
    let from = {
        floorNumber: 1,
        point: pointer.position
    }

    // 终点
    let to = {
        floorNumber: 1,
        point: endMarker.position
    }

    return new Promise((res, rej) => {
        // 路线规划
        building.findPath(from, to).then(routeResult => {
            routeRes = routeResult
            res(routeRes)
        })
    })

    
}

// 当UI中导航按钮点击时
glo.on('btn-navi', boo => {

    isNavigating = !isNavigating
    
    // 将之前的导航实例进行销毁
    naviObj?.dispose()

    // 如果是退出导航
    if (!boo) {
        building?.clearRoutes()
        endMarker.show = false   
        // 放大视角
        map.view.zoom = 800     
    } 
    // 开始导航
    else {
        
        // 创建一个导航对象实例
        naviObj = new om.Navigator(map, routeRes, naviOption)

        // 开启导航, 可以使用鼠标点击模拟移动的位置
        naviObj.start()
        
        // 导航每更新一次位置
        naviObj.on('walk', walkData => {
            console.log('walkData', walkData)
    
            let p = walkData.linePoint
            // z 值为高度: 即为距离楼板 0.56米
            p.z = .56
    
            // 将Pointer移动过度到路径线上点
            pointer.moveTo({
                position: p,
                duration: 200
            })
    
            // 在UI中显示导航提示
            glo.emit('message', walkData.description)
        })

        // 当位置偏离时
        naviObj.on('navi-return-to-line', () => {
            glo.emit('message', "您已经偏离路线")
        })
    
        // 当位置偏离大于10米时, 重新规划路线
        naviObj.on('navi-new-path', () => {
            glo.emit('message', "偏离路线大于5米, 重新规划路线")

            // 因为与规划路线相送很远, 所以这里使用鼠标点击的位置
            pointer.position = pickReuslt.intersect.point

            // 重新规划路线
            findPath().then(res => {
                // 为导航对象设置新的路径数据
                naviObj.setRouteResult(routeRes)
            })

        })

        // 当导航到达终点后
        naviObj.on('navi-complete', () => {
            endMarker.show = false
            isNavigating = false

            // 向UI传递导航完成的消息
            glo.emit('navi-complete')
        })
        
    }
})

// 注册窗口resize事件
window.addEventListener('resize', () => {
    map.view.resize()
})