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
  const [slippage, setSlippage] = useState(0.5);
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

  // 自动报价
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (tokenOneAmount) {
        setLoading(true);
        try {
          const data = await fetchPrices(
            tokenOne,
            tokenTwo,
            tokenOneAmount,
            address,
            slippage
          );
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
  }, [tokenOneAmount, tokenOne, tokenTwo, address, slippage]);

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
  const fetchPrices = async (one, two, amountIn, address, slippage) => {
    const res = await axios("http://localhost:8000/tokenPrice", {
      params: {
        tokenInAddress: one.address,
        tokenOutAddress: two.address,
        amountIn: amountIn,
        tokenInDecimals: one.decimals,
        tokenOutDecimals: two.decimals,
        recipient: address || null,
        slippage: slippage,
      },
    });
    return res.data;
  };

  // 授权函数
  const approveToken = async (tokenAddress, amount, spender) => {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          "function approve(address,uint256) external returns (bool)",
          "function allowance(address,address) external view returns (uint256)",
        ],
        signer
      );
      // 查询授权
      const currentAllowance = await tokenContract.allowance(address, spender);
      // 主要针对USDT代币，如果有授权则授权清零，重新授权
      if (currentAllowance.gt(0)) {
        const tx0 = await tokenContract.approve(spender, 0);
        await tx0.wait();
      }
      const tx1 = await tokenContract.approve(spender, amount);
      await tx1.wait();
    } catch (err) {
      console.error("❌ 授权失败:", err);
    }
  };

  // 🔹 交换函数
  const executeSwap = async () => {
    try {
      if (!methodParameters) throw new Error("methodParameters 未定义");
      const feeData = await provider.getFeeData();
      const tx = {
        to: UNISWAP_ROUTER,
        data: methodParameters.calldata,
        value: methodParameters.value,
        from: address,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      };
      const sentTx = await signer.sendTransaction(tx);
      const receipt = await sentTx.wait();
      console.log("交易确认成功, 区块:", receipt.blockNumber);
    } catch (err) {
      console.error("执行Swap出错:", err);
    }
  };

  //主入口
  const fetchDexSwap = async () => {
    try {
      setLoading(true);
      await approveToken(
        tokenOne.address,
        ethers.utils.parseUnits(tokenOneAmount.toString(), tokenOne.decimals),
        UNISWAP_ROUTER
      );
      await executeSwap();
    } catch (err) {
      console.error("出错了:", err);
    } finally {
      setTokenOneAmount(null);
      setTokenTwoAmount(null);
      setLoading(false);
    }
  };

  // 设置项
  const settings = (
    <>
      <div>Slippage Tolerance</div>
      <div>
        <Radio.Group value={slippage} onChange={handlesSlippageChange}>
          <Radio.Button value={0.5}>0.5%</Radio.Button>
          <Radio.Button value={1}>1.0%</Radio.Button>
          <Radio.Button value={2.5}>2.5%</Radio.Button>
          <Radio.Button value={5}>5.0%</Radio.Button>
        </Radio.Group>
      </div>
    </>
  );

  // UI 部分
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
