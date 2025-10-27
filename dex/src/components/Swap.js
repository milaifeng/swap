import { useEffect, useState } from "react";
import { Input, Popover, Radio, Modal } from "antd";
import {
  ArrowDownOutlined,
  DownOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import tokenList from "../tokenList.json";
import axios from "axios";
import { ethers } from "ethers";
import { UNISWAP_ROUTER } from "./constants";

function Swap(props) {
  const { address, isConnected } = props;
  const [loading, setLoading] = useState(false);
  const [slippage, setSlippage] = useState(2.5);
  const [tokenOneAmount, setTokenOneAmount] = useState(null);
  const [tokenTwoAmount, setTokenTwoAmount] = useState(null);
  const [tokenOne, setTokenOne] = useState(tokenList[0]);
  const [tokenTwo, setTokenTwo] = useState(tokenList[1]);
  const [isOpen, setIsOpen] = useState(false);
  const [changeToken, setChangeToken] = useState(1);
  const [methodParameters, setMethodParameters] = useState(null);

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();

  const handlesSlippageChange = (e) => setSlippage(e.target.value);

  // 🔹 自动报价
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (tokenOneAmount) {
        console.log("💰 请求报价...");
        setLoading(true);
        try {
          const data = await fetchPrices(
            tokenOne,
            tokenTwo,
            tokenOneAmount,
            address
          );
          console.log("🧮 报价返回:", data);
          setMethodParameters(data.methodParameters);
          setTokenTwoAmount(data.quote);
        } catch (err) {
          console.error("❌ 报价请求失败:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setTokenTwoAmount(null);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [tokenOneAmount, tokenOne, tokenTwo, address]);

  const changeAmount = (e) => setTokenOneAmount(e.target.value.trim());

  const switchTokens = () => {
    setMethodParameters(null);
    setTokenOneAmount(null);
    setTokenTwoAmount(null);
    const one = tokenOne;
    const two = tokenTwo;
    setTokenOne(two);
    setTokenTwo(one);
  };

  const openModa = (asset) => {
    setChangeToken(asset);
    setIsOpen(true);
  };

  const modifyToken = (index) => {
    setMethodParameters(null);
    setTokenOneAmount(null);
    setTokenTwoAmount(null);
    if (changeToken === 1) {
      setTokenOne(tokenList[index]);
    } else {
      setTokenTwo(tokenList[index]);
    }
    setIsOpen(false);
  };

  // 🔹 报价
  const fetchPrices = async (one, two, amountIn, address) => {
    console.log("🔍 获取报价参数:", {
      tokenIn: one.address,
      tokenOut: two.address,
      amountIn,
      address,
    });
    const res = await axios("http://localhost:8000/tokenPrice", {
      params: {
        tokenInAddress: one.address,
        tokenOutAddress: two.address,
        amountIn: amountIn,
        tokenInDecimals: one.decimals,
        tokenOutDecimals: two.decimals,
        recipient: address || null,
      },
    });
    return res.data;
  };

  // 🔹 授权函数（带详细调试日志）
  const approveToken = async (tokenAddress, amount, spender) => {
    try {
      console.log("========== 🧾 开始授权调试 ==========");
      console.log("🔹 Token 地址:", tokenAddress);
      console.log("🔹 Spender (Router):", spender);
      console.log("🔹 授权金额 (原始):", amount.toString());

      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          "function approve(address,uint256) external returns (bool)",
          "function allowance(address,address) external view returns (uint256)",
        ],
        signer
      );

      const currentAllowance = await tokenContract.allowance(address, spender);
      console.log("🔑 当前授权额度:", currentAllowance.toString());

      if (currentAllowance.gt(0)) {
        console.log("⚠️ 存在旧授权，清零中...");
        const tx0 = await tokenContract.approve(spender, 0);
        console.log("🕓 清零中, Tx:", tx0.hash);
        await tx0.wait();
      }

      console.log("✅ 开始授权新的额度...");
      const tx1 = await tokenContract.approve(spender, amount);
      console.log("📤 授权交易哈希:", tx1.hash);
      await tx1.wait();
      console.log("✅ 授权成功!");
      console.log("=====================================");
    } catch (err) {
      console.error("❌ 授权失败:", err);
    }
  };

  // 🔹 交换函数（含 Not WETH9 调试）
  const executeSwap = async () => {
    try {
      console.log("========== ⚙️ 开始执行 Swap ==========");
      if (!methodParameters) throw new Error("methodParameters 未定义");

      const network = await provider.getNetwork();
      console.log(
        "🌐 当前网络:",
        network.name,
        "(ChainId:",
        network.chainId,
        ")"
      );
      console.log("🔗 Router 地址:", UNISWAP_ROUTER);
      console.log("📜 Calldata:", methodParameters.calldata);
      console.log(
        "💰 Value:",
        methodParameters.value?.toString?.() ?? methodParameters.value
      );

      const feeData = await provider.getFeeData();
      console.log("⛽ FeeData:", feeData);

      const balance = await provider.getBalance(address);
      console.log("👛 当前 ETH 余额:", ethers.utils.formatEther(balance));

      const tx = {
        to: UNISWAP_ROUTER,
        data: methodParameters.calldata,
        value: methodParameters.value,
        from: address,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      };

      console.log("🚀 即将发送交易:", tx);

      const sentTx = await signer.sendTransaction(tx);
      console.log("📤 交易已发送:", sentTx.hash);
      const receipt = await sentTx.wait();
      console.log("✅ 交易确认成功, 区块:", receipt.blockNumber);
      setTokenOneAmount(null);
      setTokenTwoAmount(null);
    } catch (err) {
      console.error("❌ 执行 Swap 出错:", err);
      if (err?.message?.includes("Not WETH9")) {
        console.error(
          "🚨 调试提示: 路径中可能没有正确的 WETH 地址或链 ID 不匹配！"
        );
      }
    }
  };

  // 🔹 主入口
  const fetchDexSwap = async () => {
    try {
      setLoading(true);
      console.log("========== 🚀 开始 Swap 全流程 ==========");
      console.log("🔹 输入 Token:", tokenOne.ticker, tokenOne.address);
      console.log("🔹 输出 Token:", tokenTwo.ticker, tokenTwo.address);
      console.log("🔹 数量:", tokenOneAmount);
      console.log("🔹 当前 Router:", UNISWAP_ROUTER);

      await approveToken(
        tokenOne.address,
        ethers.utils.parseUnits(tokenOneAmount.toString(), tokenOne.decimals),
        UNISWAP_ROUTER
      );

      await executeSwap();
      console.log("✅ Swap 全流程完成");
    } catch (err) {
      console.error("❌ 全流程出错:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔧 设置项
  const settings = (
    <>
      <div>Slippage Tolerance</div>
      <div>
        <Radio.Group value={slippage} onChange={handlesSlippageChange}>
          <Radio.Button value={0.5}>0.5%</Radio.Button>
          <Radio.Button value={2.5}>2.5%</Radio.Button>
          <Radio.Button value={5}>5.0%</Radio.Button>
        </Radio.Group>
      </div>
    </>
  );

  // 🔹 UI 部分
  return (
    <>
      <Modal
        open={isOpen}
        footer={null}
        onCancel={() => setIsOpen(false)}
        title="Select a token"
      >
        <div className="modalContent">
          {tokenList?.map((e, i) => (
            <div className="tokenChoice" key={i} onClick={() => modifyToken(i)}>
              <img src={e.img} alt={e.ticker} className="tokenLogo" />
              <div className="tokenChoiceNames">
                <div className="tokenName">{e.name}</div>
                <div className="tokenTicker">{e.ticker}</div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <div className="tradeBox">
        <div className="tradeBoxHeader">
          <h4>Swap</h4>
          <Popover
            content={settings}
            title="Settings"
            trigger="click"
            placement="bottomRight"
          >
            <SettingOutlined className="cog" />
          </Popover>
        </div>
        <div className="inputs">
          <Input
            placeholder="0"
            value={tokenOneAmount}
            onChange={changeAmount}
          />
          <Input placeholder="0" value={tokenTwoAmount} disabled={true} />
          <div className="switchButton" onClick={switchTokens}>
            <ArrowDownOutlined className="switchArrow" />
          </div>
          <div className="assetOne" onClick={() => openModa(1)}>
            <img src={tokenOne.img} alt="assetOneLogo" className="assetLogo" />
            {tokenOne.ticker}
            <DownOutlined />
          </div>
          <div className="assetTwo" onClick={() => openModa(2)}>
            <img src={tokenTwo.img} alt="assetOneLogo" className="assetLogo" />
            {tokenTwo.ticker}
            <DownOutlined />
          </div>
        </div>
        <button
          className="swapButton"
          disabled={!tokenTwoAmount || !isConnected}
          onClick={fetchDexSwap}
        >
          {loading ? "Loading....." : "Swap"}
        </button>
      </div>
    </>
  );
}

export default Swap;
