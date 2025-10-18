import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { connect } from "./redux/blockchain/blockchainActions";
import { fetchData } from "./redux/data/dataActions";
import * as s from "./styles/globalStyles";
import background from "./styles/bg.png";
import styled from "styled-components";
import Accordion from './Accordion';
import styles from "./App.css"
import Web3 from "web3";
import abi from "./abi";

// ABI mínimo para leer (no toca tu contrato principal)
const ERC721_MIN_ABI = [
  { inputs: [], name: "name", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "owner", type: "address" }], name: "balanceOf", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "uint256", name: "index", type: "uint256" }], name: "tokenOfOwnerByIndex", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], name: "tokenURI", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "owner", type: "address" }], name: "tokensOfOwner", outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], name: "ownerOf", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalMinted", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "from", type: "address" }, { indexed: true, internalType: "address", name: "to", type: "address" }, { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" }], name: "Transfer", type: "event" }
];

// helpers
const PLASMA_CHAIN_ID_HEX = "0x2611"; // 9745

// === IPFS helpers con multi-gateway y timeout ===
const IPFS_GATEWAYS = [
   "https://gateway.lighthouse.storage/ipfs/", // Lighthouse
];


const isIpfs = (u) => typeof u === "string" && u.startsWith("ipfs://");

const ipfsToHttpCandidates = (u) => {
  if (!isIpfs(u)) return [u];
  const path = u.replace("ipfs://", "");
  return IPFS_GATEWAYS.map((g) => g + path);
};

const fetchWithTimeout = (url, ms = 8000) =>
  Promise.race([
    fetch(url, { cache: "no-store" }),
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);

const fetchJsonFromIpfs = async (ipfsUri) => {
  const urls = ipfsToHttpCandidates(ipfsUri);
  for (const url of urls) {
    try {
      const r = await fetchWithTimeout(url, 8000);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // console.log("✅ JSON desde:", url);
      return await r.json();
    } catch (e) {
      // console.warn("❌ JSON fallo:", url, e.message);
    }
  }
  throw new Error("All IPFS gateways failed for " + ipfsUri);
};

const ipfsImageToHttp = (ipfsUri) => {
  const candidates = ipfsToHttpCandidates(ipfsUri);
  return candidates[0]; // usamos el primero (Lighthouse); <img> probará cargarlo
};

const parseMaybeBase64Json = (uri) => {
  if (!uri || typeof uri !== "string") return null;
  const prefix = "data:application/json;base64,";
  if (uri.startsWith(prefix)) {
    try { return JSON.parse(atob(uri.slice(prefix.length))); } catch { return null; }
  }
  return null;
};

const truncate = (input, len) =>
  input.length > len ? `${input.substring(0, len)}...` : input;

export const StyledButton = styled.button`
  letter-spacing: 2px;
  font-family: 'Saira', sans-serif;
  border-radius: 20px;
  border: none;
  background-color: #6e54ff;
  font-weight: bold;
  font-size: 30px;
  color: var(--secondary);
  width: 350px;
  cursor: pointer;
  :active {
    box-shadow: none;
    -webkit-box-shadow: none;
    -moz-box-shadow: none;
  }
`;

export const StyledButton2 = styled.button`
  letter-spacing: 2px;
  font-family: 'Saira', sans-serif;
  border-radius: 15px;
  border: none;
  background-color: var(--bnb);
  font-weight: bold;
  font-size: 30px;
  color: var(--secondary);
  padding: 20px;
  width: 200px;
  cursor: pointer;
  :active {
    box-shadow: none;
    -webkit-box-shadow: none;
    -moz-box-shadow: none;
  }
`;

export const StyledButton3 = styled.button`
  letter-spacing: 2px;
  font-family: 'Saira', sans-serif;
  border-radius: 20px;
  border: none;
  background-color: var(--bnb);
  font-weight: bold;
  font-size: 25px;
  color: var(--secondary);
  padding: 20px;
  width: 200px;
  cursor: pointer;
  :active {
    box-shadow: none;
    -webkit-box-shadow: none;
    -moz-box-shadow: none;
  }
`;


export const StyledRoundButton2 = styled.button`
  background: transparent;
  border-radius: 100%;
  border: none;
  padding: 10px;
  font-weight: bold;
  font-size: 30px;
  width: 50px;
  height: 50px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ResponsiveWrapper = styled.div`
  display: flex;
  flex: 1;
  justify-content: stretched;
  align-items: stretched;
  width: 100%;
`;

export const StyledLogo = styled.img`
  width: 400px;
  transition: width 0.5s;
  transition: height 0.5s;
`;

export const ViewerButton = styled(StyledButton2)`
  width: 450px;        /* más ancho que el Mint si quieres */
  padding: 18px 28px;  /* padding similar al que ya tenías inline */
  font-size: 24px;     /* ajusta el tamaño del texto si prefieres */
  text-transform: none;
`;


export const StyledImg = styled.img`
  border-radius: 30px;
  width: 550px;
  @media (min-width: 2000px) {
    width: 800px;
  }
  transition: width 0.5s;
`;

export const StyledImgNav = styled.img`
  width: 10px;
`;

export const StyledImg2 = styled.img`
    width: 700px;
  @media (min-width: 20020px) {
    width: 1000px;
  }
  transition: width 0.5s;
`;

export const StyledImg4 = styled.img`
    width: 280px;
  @media (min-width: 20200px) {
    width: 400px;
  }
  transition: width 0.5s;
`;


export const StyledImg3 = styled.img`
  width: 30%;
  transition: transform 1s;
  :hover {
    transform: translateZ(10px);
  }
`;

export const StyledLink = styled.a`
  color: var(--secondary);
  text-decoration: none;
`;




function App() {
  const accordionData = [
    {
      title: 'What is Monad?',
      content: `
Monad is a next-generation EVM-compatible Layer-1 blockchain designed for extreme scalability, offering around 10,000 transactions per second, sub-second finality near 800 milliseconds, and ultra-low gas fees while maintaining full compatibility with Ethereum bytecode and tools. It achieves this through parallel transaction execution, a custom high-performance database called MonadDB, and an optimized consensus and execution engine. The network aims to solve the blockchain scalability trilemma by combining high throughput, decentralization, and developer accessibility. For crypto builders and traders, Monad represents a high-performance infrastructure for DeFi, DePIN, and other high-volume on-chain applications with an easy migration path from Ethereum.`
    },
    {
      title: 'How to add the network?',
      content: `You can use https://chainlist.org/ and search for Monad Mainnet to add the network automatically.
      `
    },
    {
      title: 'How to bridge?',
      content: `The cheapest way to bridge is to use the website deBridge (https://app.debridge.finance/). You can select the chain you want to bridge from and select receive $MON on the Monad Network. Make sure you send at least 201 $MON to make the individual mint.
      `
    },
    {
      title: 'How to mint?',
      content: `Once you add and connected to the Monad Network correctly, and you have your $MON bridged, 
      you can go to our mint section above and select how many Monad Punks you want to mint!`
    },
    {
      title: 'How much supply and mint cost?',
      content: `GEN 1 will consist of 1,500 Monad Punks with a total mint cost of 200 $MON each.`
    },
    {
      title: "I've already minted... now what?",
      content: `Welcome to our community! now you are part of the world of the Monad Punks on the Monad Chain! As a holder you will have access to the presale of our next $MPUNKS token which will be used on our future NFT staking. Stay tuned!`
    },
    
  ];
  const dispatch = useDispatch();
  const ref = useRef(null);
  const faqRef = useRef(null);
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [totalMintedUI, setTotalMintedUI] = useState(0);

  const handleClick = (e) => {
    setCoords({ x: e.clientX, y: e.clientY });
    setShow(true);

    setTimeout(() => {
      setShow(false);
    }, 1500);
  };
  const blockchain = useSelector((state) => state.blockchain);
  const data = useSelector((state) => state.data);
  const [isActive, setIsActive] = useState(false);
  const [claimingNft, setClaimingNft] = useState(false);
  const [feedback, setFeedback] = useState(`How many Monad Punks you want to mint?`);
  const [mintAmount, setMintAmount] = useState(1);
  const [CONFIG, SET_CONFIG] = useState({
    CONTRACT_ADDRESS: "",
    SCAN_LINK: "",
    NETWORK: {
      NAME: "",
      SYMBOL: "",
      ID: 0,
    },
    NFT_NAME: "",
    SYMBOL: "",
    MAX_SUPPLY: 1,
    WEI_COST: 0,
    DISPLAY_COST: 0,
    GAS_LIMIT: 0,
    MARKETPLACE: "",
    MARKETPLACE_LINK: "",
    SHOW_BACKGROUND: false,
  });

  const claimNFTs = () => {
    let cost = 15000000000000000000;
    let gasLimit = CONFIG.GAS_LIMIT;
    let totalCostWei = String(cost * mintAmount);
    let totalGasLimit = String(gasLimit * mintAmount);
    let totalCostWeiNum = cost * mintAmount
    let trueCost = BigInt(totalCostWeiNum).toString();
    const refreshTotalMinted = async () => {
  try {
    if (!blockchain.smartContract) return;
    const v = await blockchain.smartContract.methods.totalMinted().call();
    setTotalMintedUI(Number(v));
  } catch (e) {
    console.error("totalMinted() read failed:", e);
  }
};
    console.log("Cost: ", totalCostWei);
    console.log("Gas limit: ", totalGasLimit);
    setFeedback(`Minting...`);
    setClaimingNft(true);
    blockchain.smartContract.methods
      .mint(mintAmount)
      .send({
        gasLimit: String(totalGasLimit),
        to: CONFIG.CONTRACT_ADDRESS,
        from: blockchain.account,
        value: trueCost,
      })
      .once("error", (err) => {
        console.log(err);
        setFeedback("Something went wrong. Try again later.");
        setClaimingNft(false);
      })
      .then((receipt) => {
        console.log(receipt);
        setFeedback(
          `Congratulations! You minted ${mintAmount} ${CONFIG.NFT_NAME}!`
        );
        setClaimingNft(false);
        dispatch(fetchData(blockchain.account));
        refreshTotalMinted(); // actualiza el número mostrado
      });
  };

  const decrementMintAmount = () => {
    let newMintAmount = mintAmount - 1;
    if (newMintAmount < 1) {
      newMintAmount = 1;
    }
    setMintAmount(newMintAmount);
  };

  const incrementMintAmount = () => {
    let newMintAmount = mintAmount + 1;
    if (newMintAmount > 10) {
      newMintAmount = 10;
    }
    setMintAmount(newMintAmount);
  };

  const getData = () => {
    if (blockchain.account !== "" && blockchain.smartContract !== null) {
      dispatch(fetchData(blockchain.account));
    }
  };

  const getConfig = async () => {
    const configResponse = await fetch("/config/config.json", {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const config = await configResponse.json();
    SET_CONFIG(config);
  };

// -------- Viewer de mis NFTs --------
const [viewerLoading, setViewerLoading] = useState(false);
const [viewerError, setViewerError] = useState("");
const [viewerItems, setViewerItems] = useState([]); // [{tokenId, name, image, raw}]
const [collectionName, setCollectionName] = useState("");
const [collectionSymbol, setCollectionSymbol] = useState("");

// forzar estar en Plasma
const ensurePlasma = async () => {
  if (!window.ethereum) throw new Error("No wallet provider.");
  const cid = await window.ethereum.request({ method: "eth_chainId" });
  if ((cid || "").toLowerCase() !== PLASMA_CHAIN_ID_HEX) {
    throw new Error("Switch wallet to Monad Network (chainId ).");
  }
};

// usar el contrato que ya crea Redux; si no está, instanciar uno de solo lectura
const getReadContract = async () => {
  if (blockchain.smartContract) return blockchain.smartContract;
  const web3 = blockchain.web3 ? blockchain.web3 : new Web3(window.ethereum);
  if (!CONFIG.CONTRACT_ADDRESS) throw new Error("Missing CONFIG.CONTRACT_ADDRESS");
  return new web3.eth.Contract(ERC721_MIN_ABI, CONFIG.CONTRACT_ADDRESS);
};

// utilidad: limitar concurrencia
const mapWithConcurrency = async (items, limit, fn) => {
  const out = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
};

// obtener tokenIds del owner con 4 estrategias
const getOwnedTokenIds = async (contract, owner) => {
  // 1) ERC721AQueryable
  try {
    if (contract.methods.tokensOfOwner) {
      const tokenIds = await contract.methods.tokensOfOwner(owner).call();
      if (tokenIds?.length) return tokenIds.map((x) => Web3.utils.toBN(x).toString());
    }
  } catch {}

  // 2) ERC721Enumerable
  try {
    if (contract.methods.tokenOfOwnerByIndex) {
      const bal = Number(await contract.methods.balanceOf(owner).call());
      if (bal > 0) {
        const ids = [];
        for (let i = 0; i < bal; i++) {
          const id = await contract.methods.tokenOfOwnerByIndex(owner, i).call();
          ids.push(Web3.utils.toBN(id).toString());
        }
        if (ids.length) return ids;
      }
    }
  } catch {}

  // 3) Logs Transfer (puede no estar soportado por el nodo)
  try {
    const received = await contract.getPastEvents("Transfer", { filter: { to: owner }, fromBlock: 0, toBlock: "latest" });
    const sent = await contract.getPastEvents("Transfer", { filter: { from: owner }, fromBlock: 0, toBlock: "latest" });
    const bag = new Set();
    for (const ev of received) bag.add(Web3.utils.toBN(ev.returnValues.tokenId).toString());
    for (const ev of sent) bag.delete(Web3.utils.toBN(ev.returnValues.tokenId).toString());
    const arr = Array.from(bag);
    if (arr.length) return arr;
  } catch {}

  // 4) Universal: escanear 1..totalMinted con ownerOf
  try {
    const total = Number(await contract.methods.totalMinted().call());
    if (!total) return [];
    const ids = Array.from({ length: total }, (_, i) => (i + 1).toString()); // empieza en 1

    const owned = await mapWithConcurrency(ids, 10, async (id) => {
      try {
        const who = await contract.methods.ownerOf(id).call();
        return who.toLowerCase() === blockchain.account.toLowerCase() ? id : null;
      } catch { return null; }
    });

    return owned.filter(Boolean);
  } catch (e) {
    console.error("ownerOf scan failed:", e);
  }

  return [];
};

// metadata por token
const fetchTokenMeta = async (contract, tokenId) => {
  let tokenUri = "";
  try {
    tokenUri = await contract.methods.tokenURI(tokenId).call();
  } catch {
    tokenUri = ""; // algunos contratos fallan pero igual se puede armar después si tuvieras baseURI
  }

  // 1) ¿metadata embebido?
  let meta = parseMaybeBase64Json(tokenUri);

  // 2) IPFS / HTTP normal con retries
  if (!meta && tokenUri) {
    try {
      if (isIpfs(tokenUri)) {
        meta = await fetchJsonFromIpfs(tokenUri);
      } else {
        const r = await fetchWithTimeout(tokenUri, 8000);
        if (r.ok) meta = await r.json();
      }
    } catch (e) {
      console.warn(`metadata fetch failed for #${tokenId}`, e?.message || e);
      meta = {};
    }
  }

  // 3) Normalizar imagen y nombre
  let imageUri = meta?.image || meta?.image_url || "";
  if (isIpfs(imageUri)) imageUri = ipfsImageToHttp(imageUri);

  const fallbackName = (meta?.name && String(meta.name).trim().length)
    ? meta.name
    : `${collectionName || "Monad Punks"} #${tokenId}`;

  return { tokenId, name: fallbackName, image: imageUri, raw: meta };
};

// handler del botón
const handleViewMyNfts = async () => {
  try {
    setViewerError("");
    setViewerLoading(true);
    setViewerItems([]);

    if (!blockchain.account) throw new Error("Connect your wallet first.");
    await ensurePlasma();
    const contract = await getReadContract();

    // info de la colección (opcional)
    try {
      const [n, s] = await Promise.all([
        contract.methods.name().call().catch(() => ""),
        contract.methods.symbol().call().catch(() => ""),
      ]);
      setCollectionName(n || "");
      setCollectionSymbol(s || "");
    } catch {}

    const ids = await getOwnedTokenIds(contract, blockchain.account);
    // console.log("owned ids:", ids);
    if (!ids.length) {
      setViewerItems([]);
      return;
    }

    const metas = await Promise.allSettled(ids.map((id) => fetchTokenMeta(contract, id)));
    const ok = metas.filter((m) => m.status === "fulfilled").map((m) => m.value);
    setViewerItems(ok);
  } catch (err) {
    console.error(err);
    setViewerError(err?.message || "Failed to load NFTs.");
  } finally {
    setViewerLoading(false);
  }
};



  useEffect(() => {
    getConfig();
  }, []);

  useEffect(() => {
    getData();
  }, [blockchain.account]);

 useEffect(() => {
  if (!blockchain.smartContract || !blockchain.account) return;

  let cancelled = false;

  const readTotal = async () => {
    try {
      // DEBUG: verifica address y métodos
      console.log("SC address:", blockchain.smartContract.options?.address);
      console.log("Has totalMinted method?:", !!blockchain.smartContract.methods?.totalMinted);

      if (!blockchain.smartContract.methods?.totalMinted) {
        console.error("ABI no tiene totalMinted(). Revisa abi.json.");
        return;
      }

      const v = await blockchain.smartContract.methods.totalMinted().call();
      console.log("totalMinted() ->", v);

      if (!cancelled) setTotalMintedUI(Number(v));
    } catch (e) {
      console.error("totalMinted() call failed:", e);
    }
  };

  // leer una vez
  readTotal();

  // intentar refrescar en Transfer (si el provider lo soporta)
  let sub;
  try {
    sub = blockchain.smartContract.events.Transfer().on("data", () => {
      readTotal();
    });
  } catch (e) {
    console.warn("No WS events, solo lectura inicial/tras mint");
  }

  return () => {
    cancelled = true;
    if (sub && sub.unsubscribe) {
      sub.unsubscribe();
    }
  };
}, [blockchain.smartContract, blockchain.account]);



  const handleFaq = () => {
    faqRef.current?.scrollIntoView({behavior: 'smooth'});
  };

   const handleMint = () => {
    ref.current?.scrollIntoView({behavior: 'smooth'});
  };


  const handleTwitter = () => {
    window.open(
      'https://twitter.com/PunksOnPlasma',
      '_blank'
    );
  };

  const handleTelegram = () => {
    window.open(
      'https://t.me/',
      '_blank'
    );
  };

  const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkMobile = () => {
    const mobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
    setIsMobile(mobile);
  };
  checkMobile();
  window.addEventListener("resize", checkMobile);
  return () => window.removeEventListener("resize", checkMobile);
}, []);


if (isMobile) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "#340285",
      color: "#fff",
      flexDirection: "column",
      textAlign: "center",
      fontFamily: "Saira, sans-serif",
      padding: "20px"
    }}>
      <StyledLogo
              src={"/config/images/logo.png"}
                />
      <h1 style={{ fontSize: "28px", marginBottom: "10px" }}>Our mint website is currently designed for desktop</h1>
      <p style={{ fontSize: "18px" }}>A mobile version is coming soon!</p>
    </div>
  );
}
  return (
    <s.Screen>
      <s.Container
        ai={"center"}>

        <div className="nav" style={{display:"flex"}}>
          <div className="logo" style={{marginTop: "45px", marginLeft:"-10px"}}>
          <StyledLogo
              src={"/config/images/logofinal.png"}/>
          </div>
          
          <div className="bar" style={{display:"flex", marginLeft: "-150px"}}>

          <div className="option2" style={{marginLeft:"500px"}} onClick={handleMint} >
          <s.TextNav
            style={{
              textAlign: "center",
              fontSize: 30,
              fontWeight: "bold",
              letterSpacing: 4,
              color: "var(--accent)",
              marginTop: "80px",
              cursor: "pointer"
              }}
            >
              MINT
       </s.TextNav>
          </div>

          <div className="option2" onClick={handleClick} style={{marginLeft:"80px"}}>
          <s.TextNav
            style={{
              textAlign: "center",
              fontSize: 30,
              fontWeight: "bold",
              letterSpacing: 4,
              color: "var(--accent)",
              marginTop: "80px",
              cursor: "pointer"
              }}
            >
              STAKING
       </s.TextNav>
       
          </div>

           {show && (
        <div
          style={{
            position: "fixed",
            top: coords.y + 10,
            left: coords.x + 10,
            backgroundColor: "black",
            color: "white",
            padding: "5px 12px",
            borderRadius: "8px",
            pointerEvents: "none",
            fontWeight: "bold",
            zIndex: 9999,
          }}
        >
          Soon
        </div>
      )}

          <div className="option3" style={{marginLeft:"80px"}} onClick={handleFaq} >
          <s.TextNav
            style={{
                textAlign: "center",
                fontSize: 30,
                fontWeight: "bold",
                letterSpacing: 4,
                color: "var(--accent)",
                marginTop: "80px",
                cursor: "pointer",
                
              }}
            >
              FAQ
       </s.TextNav>
          </div>



          <div className="option3" style={{marginLeft:"50px", marginTop: "90px"}} onClick={handleTwitter} >
          <StyledImgNav
        src={"/config/images/tw.png"}
        style={{
          width: "40px",
          cursor: "pointer",
        }}
        />
          </div>
          </div>  
       </div>

       <s.SpacerLargeX />

<div className="menu1" style={{display:"flex", marginTop:"20px"}}>

<StyledImg
        src={"/config/images/monos1.png"}
        style={{
          marginLeft: "80px",
          width: '26%',
          height:'26%'
        }}
        />

    <s.TextTitle 
       style={{
          fontSize: 30,
          fontWeight: "bold",
          textAlign: "center",
          marginTop:"80px",
          marginLeft: "30px",
          marginRight: "30px"
       }}>
          The <b>Monad Punks</b> arrived to the <b>Monad</b> Ecosystem
        </s.TextTitle>

<StyledImg
        src={"/config/images/monos2.png"}
        style={{
          marginRight: "80px",
          width: '26%',
          height:'26%'
        }}
        />
</div>

<StyledButton3

                    onClick={(e) => {
                     ref.current?.scrollIntoView({behavior: 'smooth'});
                    }}
                    style={{ marginTop: "-60px" }}
                  >
                    MINT LIVE
                  </StyledButton3>

<s.SpacerLargeSX />
<div class="separator">
  <div class="marquee">
    <div class="marquee-content">
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
    </div>
  </div>
</div>

<s.SpacerLargeX />




<div className="grid" style={{marginLeft:"0px"}}>
<s.TextTitle 
      style={{
        fontSize: 60,
        textAlign: "center",
        letterSpacing: 10,
        fontWeight: 1000,
      }}
      >
        GEN 1 &nbsp; <b class="live">Live</b> 
      </s.TextTitle>
      <s.SpacerLarge />
<StyledImg2
        src={"/config/images/grid1.png"}
        style={{
          marginLeft: "0px"
        }}
        />

<StyledImg2
        src={"/config/images/grid2.png"}
        style={{
          marginLeft: "18px"
        }}
        />


</div>

<s.SpacerLargeXX />
<s.TextTitle 
      style={{
        fontSize: 60,
        textAlign: "center",
        letterSpacing: 5
      }}
      >
        Welcome to the <b>Monad</b> Punks project
      </s.TextTitle>
<s.SpacerLargeX />
<div className="info" style={{display:"flex"}}>
  
  
  <StyledImg4
        src={"/config/images/punks11.png"}
        style={{
          marginLeft: "80px",
          marginTop: "50px"
        }}
        />

      <s.SpacerLarge />
      <s.TextSubTitle
        style={{
          fontSize: 25,
          textAlign: "center",
          marginRight:"60px",
          marginLeft:"60px",
        }}>
          The <b>Monad</b> Punks project aims to bring the original Punk vibe into the <b>Monad</b> Network and into its metaverse. The collections is fully built and deployed on-chain on the <b>Monad</b> Mainnet.<br /><br />
        
        GEN 1 includes 1,500 unique male Punks that bring the visual identity of the most stable NFT version of Punks and turn the community into a scalable, on-chain environment.<br /><br />

        Holders of GEN 1 will be able to stake their NFTs to earn $MPUNKS, the project utility token. 90% of the mint funds will be used to add liquidity.

        GEN 1 is more than just a collectible. It will be a requirement for accessing GEN 2, along with a specific amount of $MPUNKS. Together, they form our path forward as a community. This makes early ownership and participation key for those looking to be part of the next phase.
        </s.TextSubTitle>


<StyledImg4
        src={"/config/images/punks22.png"}
        style={{
          marginRight: "80px",
          marginTop: "50px"
        }}
        />
</div>

<s.SpacerLargeXX />

<div class="separator">
  <div class="marquee">
    <div class="marquee-content">
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
    </div>
  </div>
</div>
<s.SpacerLargeX />

<s.TextTitle  ref={ref}
            style={{
              fontSize: 50,
              fontWeight: 1000,
              letterSpacing: 12,
            }}
          >
            Mint <b class="live">live</b> 
          </s.TextTitle>
          <s.SpacerLargeX />

            <StyledImg3
        src={"/config/images/gif.gif"}
        style={{
          marginLeft: "0px",
          marginTop: "0px",
          border: "5px solid #000"
        }}
        />
        <s.SpacerLargeX />

          {Number(data.totalSupply) >= CONFIG.MAX_SUPPLY ? (
            <>
             <s.SpacerXSmall />
              <s.TextTitle
                style={{ textAlign: "center", color: "var(--accent-text)" }}
              >
                The sale has ended.
              </s.TextTitle>
              
            </>
          ) : (
            <>
              <s.TextTitle2
                style={{ textAlign: "center", color: "var(--accent-text)", fontSize: 25 }}
              >
                
              Price: 200 $MON | {totalMintedUI} minted of {CONFIG.MAX_SUPPLY}
              </s.TextTitle2>
              <s.SpacerLarge />
              <s.TextTitle2
                style={{ textAlign: "center", color: "var(--accent-text)", fontSize: 28 }}
              >
                
              </s.TextTitle2>
              {blockchain.account === "" ||
              blockchain.smartContract === null ? (
                <s.Container ai={"center"} jc={"center"}>
                  
                  <StyledButton2
                    onClick={(e) => {
                      e.preventDefault();
                      dispatch(connect());
                      getData();
                    }}
                    style={{ marginLeft: "-8px" }}
                  >
                    CONNECT
                  </StyledButton2>
                  

                  {blockchain.errorMsg !== "" ? (
                    <>
                  <s.SpacerSmall />
                      <s.TextDescription
                        style={{
                          textAlign: "center",
                          color: "var(--accent)",
                          letterSpacing: 2
                        }}
                      >
                      Connect to the Monad Network
                      </s.TextDescription>
                      
                    </>
                  ) : null}
                </s.Container>
              ) : (
                              <>
                                <s.TextDescription
                                  style={{
                                    textAlign: "center",
                                    color: "var(--accent-text)",
                                  }}
                                >
                                  
                                  {feedback}
                                </s.TextDescription>
                                <s.SpacerSmall />
                                <s.Container ai={"center"} jc={"center"} fd={"row"}>
                                  <StyledRoundButton2
                                    style={{ lineHeight: 0.4, color: "var(--accent)"}}
                                    disabled={claimingNft ? 1 : 0}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      decrementMintAmount();
                                    }}
                                  >
                                    -
                                  </StyledRoundButton2>
                                  <s.SpacerMedium />
                                  
                                  <s.TextDescription
                                    style={{
                                      textAlign: "center",
                                      color: "var(--accent)"
                                    }}
                                  >
                                    {mintAmount}
                                  </s.TextDescription>
                                  
                                  <s.SpacerMedium />
                                  <StyledRoundButton2
                                    disabled={claimingNft ? 1 : 0}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      incrementMintAmount();
                                    }}
                                    style={{
                                      color: "var(--accent)"
                                    }}
                                  >
                                    +
                                  </StyledRoundButton2>
                                </s.Container>
                                
                                
                                <s.Container ai={"center"} jc={"center"} fd={"row"}>
                                  <StyledButton2
                                    disabled={claimingNft ? 1 : 0}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      claimNFTs();
                                      getData();
                                    }}
                                  >
                                    {claimingNft ? "WAIT..." : "MINT"}
                                  </StyledButton2>
                    
                  </s.Container>
                </>
              )}
            </>
          )}
         
<div style={{ marginTop: 40, textAlign: "center" }}>
  <ViewerButton
    disabled={viewerLoading}
    onClick={handleViewMyNfts}
  >
    {viewerLoading ? "LOADING..." : "VIEW MY NFTs ON MONAD"}
  </ViewerButton>

  {viewerError && (
    <div style={{ color: "#ff6b6b", marginTop: 12 }}>{viewerError}</div>
  )}

  {!viewerLoading && !viewerError && viewerItems.length === 0 && (
    <div style={{ marginTop: 18 }}>No NFTs found for this address on Monad.</div>
  )}

  {viewerItems.length > 0 && (
    <>
      <div style={{ marginTop: 12, opacity: 0.75 }}>
        {collectionName} {collectionSymbol ? `(${collectionSymbol})` : ""}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 16,
          marginTop: 20,
        }}
      >
        {viewerItems.map((it) => (
          <div key={it.tokenId} style={{ border: "1px solid #123", borderRadius: 12, padding: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>#{it.tokenId}</div>
            {it.image ? (
              <img src={it.image} alt={it.name} style={{ width: "100%", borderRadius: 8 }} />
            ) : (
              <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6 }}>
                No image
              </div>
            )}
            <div style={{ marginTop: 6, fontSize: 14 }}>{it.name}</div>
          </div>
        ))}
      </div>
    </>
  )}
</div>



<s.SpacerLargeXX />



<div class="separator">
  <div class="marquee">
    <div class="marquee-content">
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Punks</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MON</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">Monad Network</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">GMonad</div>
      <img src="/config/images/dot.png" class="dot" />
      <div class="item">$MPUNKS</div>
      <img src="/config/images/dot.png" class="dot" />
    </div>
  </div>
</div>

<s.SpacerLargeXX />

<div class="accordion" ref={faqRef}>

{accordionData.map(({ title, content }) => (
  <Accordion title={title} content={content} />
))}

</div>
<s.SpacerLargeX />
<s.TextTitle2
                style={{ textAlign: "center", color: "var(--accent-text)", fontSize: 25 }}
              >
              
              Monad Punks  @  Monad
              </s.TextTitle2>

<s.SpacerLargeX />
</s.Container>
     
    </s.Screen>
  );
}

export default App;
