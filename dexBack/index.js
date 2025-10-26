const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const JSBI = require("jsbi");
const { AlphaRouter, SwapType } = require("@uniswap/smart-order-router");
const {
  Token,
  CurrencyAmount,
  Percent,
  TradeType,
} = require("@uniswap/sdk-core");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const port = 8000;
const SEPOLIA = 1;

const provider = new ethers.providers.JsonRpcProvider(
  process.env.ALCHEMY_SEPOLIA_URL
);
const router = new AlphaRouter({ chainId: SEPOLIA, provider });
let num = 1;
app.get("/tokenPrice", async (req, res) => {
  console.log(`第${num}次开始报价~~~`);

  const {
    tokenInAddress,
    tokenOutAddress,
    amountIn,
    tokenInDecimals,
    tokenOutDecimals,
    recipient,
  } = req.query;

  try {
    if (!tokenInAddress || !tokenOutAddress || !amountIn) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const tokenIn = new Token(SEPOLIA, tokenInAddress, Number(tokenInDecimals));
    const tokenOut = new Token(
      SEPOLIA,
      tokenOutAddress,
      Number(tokenOutDecimals)
    );

    const rawAmountIn = ethers.utils.parseUnits(
      amountIn.toString(),
      tokenInDecimals
    );
    const amountCurrency = CurrencyAmount.fromRawAmount(
      tokenIn,
      JSBI.BigInt(rawAmountIn.toString())
    );

    const route = await router.route(
      amountCurrency,
      tokenOut,
      TradeType.EXACT_INPUT, // EXACT_INPUT
      {
        recipient: recipient || ethers.constants.AddressZero,
        slippageTolerance: new Percent(5, 100),
        deadline: Math.floor(Date.now() / 1000) + 1800,
        type: SwapType.SWAP_ROUTER_02,
      }
    );

    if (!route) {
      return res.status(404).json({ error: "No route found between tokens" });
    }
    res.json({
      quote: route.quote.toSignificant(6),
      gasEstimateUSD: route.estimatedGasUsedUSD?.toFixed(4),
      path: route.trade.swaps.map((s) =>
        s.route.tokenPath.map((t) => t.symbol || t.address).join(" → ")
      ),
      methodParameters: route.methodParameters,
    });
  } catch (err) {
    console.error("❌ Error fetching route:", err);
    res.status(500).json({ error: err.message });
  } finally {
    num++;
  }
});

app.listen(port, () => {
  console.log(`✅ 服务器启动成功: http://localhost:${port}`);
});
