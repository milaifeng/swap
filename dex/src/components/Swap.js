import React, { useEffect, useState } from "react";
import { Input, Popover, Radio, Modal, message, Divider } from "antd";
import {
  ArrowDownOutlined,
  DownOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import tokenList from "../tokenList.json";
import axios from "axios";
import { useSendTransaction, useWaitForTransaction } from "wagmi";

function Swap(props) {
  const { address, isConnected } = props;
  const [slippage, setSlippage] = useState(2.5);
  const [tokenOneAmount, setTokenOneAmount] = useState(null);
  const [tokenTwoAmount, setTokenTwoAmount] = useState(null);
  const [tokenOne, setTokenOne] = useState(tokenList[0]);
  const [tokenTwo, setTokenTwo] = useState(tokenList[1]);
  const [isOpen, setIsOpen] = useState(false);
  const [changeToken, setChangeToken] = useState(1);
  const [prices, setPrices] = useState(null);
  const [txDetails, setTxDetails] = useState({
    to: null,
    data: null,
    value: null,
  });
  const { data, sendTransaction } = useSendTransaction({
    request: {
      from: address,
      to: String(txDetails.to),
      data: String(txDetails.data),
      value: String(txDetails.value),
    },
  });

  const handlesSlippageChange = (e) => {
    setSlippage(e.target.value);
  };
  const changeAmount = (e) => {
    setTokenOneAmount(e.target.value);
    if (e.target.value && prices) {
      setTokenTwoAmount((e.target.value * prices.ratio).toFixed(2));
    } else {
      setTokenTwoAmount(null);
    }
  };
  const switchTokens = () => {
    setPrices(null);
    setTokenOneAmount(null);
    setTokenTwoAmount(null);
    const one = tokenOne;
    const two = tokenTwo;
    setTokenOne(two);
    setTokenTwo(one);
    fetchPrices(two.address, one.address);
  };
  const openModa = (asset) => {
    setChangeToken(asset);
    setIsOpen(true);
  };
  const modifyToken = (index) => {
    setPrices(null);
    setTokenOneAmount(null);
    setTokenTwoAmount(null);
    if (changeToken === 1) {
      setTokenOne(tokenList[index]);
      fetchPrices(tokenList[index].address, tokenTwo.address);
    } else {
      setTokenTwo(tokenList[index]);
      fetchPrices(tokenOne.address, tokenList[index].address);
    }
    setIsOpen(false);
  };
  const fetchPrices = async (one, two) => {
    const res = await axios.get(`http://localhost:8000/tokenPrice`, {
      params: { addressOne: one, addressTwo: two },
    });
    console.log(res.data);
    setPrices(res.data);
  };

  const fetchDexSwap = async () => {
    //TODO 尝试使用ChainLink
    const allowance = await axios.get(``);
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

  useEffect(() => {
    fetchPrices(tokenList[0].address, tokenList[1].address);
  }, []);

  useEffect(() => {
    if (txDetails.to && isConnected) {
      sendTransaction();
    }
  }, [txDetails]);

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
            onClick={() => {
              openModa(1);
            }}
          >
            <img src={tokenOne.img} alt="assetOneLogo" className="assetLogo" />
            {tokenOne.ticker}
            <DownOutlined />
          </div>
          <div
            className="assetTwo"
            onClick={() => {
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
          disabled={!tokenOneAmount || isConnected}
        >
          Swap
        </button>
      </div>
    </>
  );
}

export default Swap;
