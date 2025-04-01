import { glo } from './glo';

const app = document.querySelector('#app')

// ui container
let con = document.createElement('div')
Object.assign(con.style, {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
})

app.appendChild(con)

// 工具条
let strip = document.createElement('div')
Object.assign(strip.style, {
    pointerEvents: 'auto',
    visibility: 'hidden',
    padding: '20px',
    display: 'flex',
    alignItem: 'center'
})
con.appendChild(strip)

// 导航按钮
let naviBtn = document.createElement('button')
naviBtn.textContent = '导航'

let boo = false
naviBtn.addEventListener('click', () => {
    boo = !boo
    glo.emit('btn-navi', boo)
    naviBtn.textContent = !boo ? '导航' : '退出导航'

    label.style.visibility = boo ? 'visibile' : 'hidden'
})

strip.appendChild(naviBtn)

// 导航信息
let label = document.createElement('div')
Object.assign(label.style, {
    backgroundColor: '#fff',
    marginLeft: '20px'
})

strip.appendChild(label)

glo.on('picked', isNavigating => {
    if (!isNavigating) {
        strip.style.visibility = 'visible'
    }
})

// 显示导航提示
glo.on('message', msg => {
    label.textContent = msg
    label.style.visibility = 'visible'
})

// 当导航到达终点后
glo.on('navi-complete', () => {
    boo = false
    naviBtn.textContent = '导航'
    label.style.visibility = 'hidden'
})

