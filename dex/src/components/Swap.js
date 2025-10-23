import { useEffect, useState } from "react";
import { Input, Popover, Radio, Modal } from "antd";
import {
  ArrowDownOutlined,
  DownOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { ChainId, Token, WETH9, CurrencyAmount } from "@uniswap/sdk-core";
import { Pair, Route } from "@uniswap/v2-sdk";
import tokenList from "../sepoliaTokenList.json";
import axios from "axios";
import uniswapV2poolABI from "../ABI/uniswapV2poolABI.json";
import { useSendTransaction } from "wagmi";
import { ethers } from "ethers";

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

  async function createPair(oneToken, twoToken) {
    const pairAddress = Pair.getAddress(oneToken, twoToken);
    const SEPOLIA_RPC =
      "https://eth-sepolia.g.alchemy.com/v2/4_Fufereik6m3GWzM7L9W8alWa32O_0C";
    // const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
    const pairContract = new ethers.Contract(
      pairAddress,
      uniswapV2poolABI.abi,
      provider
    );
    const reserves = await pairContract["getReserves"]();
    const [reserve0, reserve1] = reserves;

    const tokens = [oneToken, twoToken];
    const [token0, token1] = tokens[0].sortsBefore(tokens[1])
      ? tokens
      : [tokens[1], tokens[0]];

    const pair = new Pair(
      CurrencyAmount.fromRawAmount(token0, reserve0),
      CurrencyAmount.fromRawAmount(token1, reserve1)
    );
    return pair;
  }

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
      setTokenTwoAmount((e.target.value * prices.ratio).toFixed(6));
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
    fetchPrices(two, one);
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
      fetchPrices(tokenList[index], tokenTwo);
    } else {
      setTokenTwo(tokenList[index]);
      fetchPrices(tokenOne, tokenList[index]);
    }
    setIsOpen(false);
  };
  const fetchPrices = async (one, two) => {
    const oneToken = new Token(ChainId.SEPOLIA, one.address, one.decimals);
    const twoToken = new Token(ChainId.SEPOLIA, two.address, two.decimals);

    const pair = await createPair(oneToken, twoToken);
    const route = new Route([pair], oneToken, twoToken);
    const oneTokenPrices = route.midPrice.toSignificant(6);
    const twoTokenPrices = route.midPrice.invert().toSignificant(6);
    setPrices({
      tokenOne: oneTokenPrices,
      tokenTwo: twoTokenPrices,
      ratio: oneTokenPrices,
    });
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
    fetchPrices(tokenList[0], tokenList[1]);
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
