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
  const [slippage, setSlippage] = useState(2.5); //滑点
  const [tokenOneAmount, setTokenOneAmount] = useState(null);
  const [tokenTwoAmount, setTokenTwoAmount] = useState(null);
  const [tokenOne, setTokenOne] = useState(tokenList[0]);
  const [tokenTwo, setTokenTwo] = useState(tokenList[1]);
  const [isOpen, setIsOpen] = useState(false);
  const [changeToken, setChangeToken] = useState(1);
  const [methodParameters, setMethodParameters] = useState(null);
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const handlesSlippageChange = (e) => {
    setSlippage(e.target.value);
  };
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (tokenOneAmount) {
        console.log("请求报价");
        setLoading(true);
        const data = await fetchPrices(tokenOne, tokenTwo, tokenOneAmount);
        setMethodParameters(data);
        setTokenTwoAmount(data.quote);
        setLoading(false);
      }
    }, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [tokenOneAmount, tokenOne, tokenTwo]);
  const changeAmount = async (e) => {
    setTokenOneAmount(e.target.value.trim());
  };
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
  const fetchPrices = async (one, two, amountIn) => {
    const res = await axios("http://localhost:8000/tokenPrice", {
      params: {
        tokenInAddress: one.address,
        tokenOutAddress: two.address,
        amountIn: amountIn,
        tokenInDecimals: one.decimals,
        tokenOutDecimals: two.decimals,
      },
    });
    return res.data;
  };

  const approveToken = async (tokenAddress, amount, spender) => {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        "function approve(address,uint256) external returns (bool)",
        "function allowance(address,address) external view returns (uint256)",
      ],
      signer
    );
    console.log(address, amount, spender);
    const currentAllowance = await tokenContract.allowance(address, spender);
    if (currentAllowance.gt(0)) {
      console.log("⚠️ 当前已存在授权额度，先清零...");
      const tx0 = await tokenContract.approve(spender, 0);
      await tx0.wait();
    }
    console.log("✅ 执行授权...");
    const tx1 = await tokenContract.approve(spender, amount);
    await tx1.wait();
    console.log("✅ 授权成功");
  };
  const executeSwap = async () => {
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
    console.log("交易发送成功:", sentTx.hash);
    const receipt = await sentTx.wait();
    console.log("✅ 交易已确认:", receipt.transactionHash);
  };
  const fetchDexSwap = async () => {
    setLoading(true);
    approveToken(
      tokenOne.address,
      ethers.BigNumber.from(tokenOneAmount.toString()),
      UNISWAP_ROUTER
    );
    executeSwap();
    setLoading(false);
  };

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

  return (
    <>
      <Modal
        open={isOpen}
        footer={null}
        onCancel={() => {
          setIsOpen(false);
        }}
        title="Select a token"
      >
        <div className="modalContent">
          {tokenList?.map((e, i) => {
            return (
              <div
                className="tokenChoice"
                key={i}
                onClick={() => modifyToken(i)}
              >
                <img src={e.img} alt={e.ticker} className="tokenLogo" />
                <div className="tokenChoiceNames">
                  <div className="tokenName">{e.name}</div>
                  <div className="tokenTicker">{e.ticker}</div>
                </div>
              </div>
            );
          })}
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
          <div
            className="assetOne"
            onClick={(e) => {
              openModa(1);
            }}
          >
            <img src={tokenOne.img} alt="assetOneLogo" className="assetLogo" />
            {tokenOne.ticker}
            <DownOutlined />
          </div>
          <div
            className="assetTwo"
            onClick={(e) => {
              openModa(2);
            }}
          >
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
