# Uniswap v3 Clone
不依赖**Moralis / Infura**第三方接口的Uniswap v3兑换系统     
支持**实时 AlphaRouter 最优路由**、**多费率自动选路**、**USDT 防堵授权**、**0.5‑5% 滑点设置**

---

## 效果预览   
![演示gif图](https://imgur.com/ndyPWrr.gif)
---

## 核心功能
|功能                    |状态  |说明|
|:---------------------:|:----:|:-----:|
| AlphaRouter 最优路由 | Done |单池 / 多池 / V2+V3 混合 |
| 实时报价(1s防抖)     | Done | 输入即显示最优输出       |
| 多费率自动优选       | Done | 500/3000/10000          |
| USDT防堵授权         | Done | 先清零再授权            |
| 滑点0.5%~5% 可调     | Done | 实时生效                |
---

## 项目结构

├── dex/      
│   ├── src/components/Swap.jsx    # 主组件    
│   ├── tokenList.json    #  主网常用代币     
│   └── constants.js     # UNISWAP_ROUTER地址     
├── dexBack/     
│   ├── index.js    # Express + AlphaRouter      
│   └── .env.example

------
## 快速开始
```
1.克隆仓库
git clone https://github.com/milaifeng/swap.git
cd swap

2.启动后端服务
cd dexBack
cp .env.example  .env
# 添加 ALCHEMY_MAIN_URL(https://www.alchemy.com/)
yarn install
node index.js

3.启动前端
cd  ../dex
yarn install
yarn start
```

## 后端API
**请求示例**
```
GET http://localhost:8000/tokenPrice
?tokenInAddress=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
&tokenOutAddress=0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9
&amountIn=1
&tokenInDecimals=6
&tokenOutDecimals=18
&recipient=0xYourWallet...
&slippage=0.5
```
**返回示例**
```
{
  "quote": "0.000542",
  "gasEstimateUSD": "0.28",
  "path": ["USDC", "WETH"],
  "pools": [...],
  "methodParameters": {
    "calldata": "0x5baeac0...",
    "value": "0x0"
  }
}
```