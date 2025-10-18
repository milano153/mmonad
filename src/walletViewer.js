import React, { useState } from 'react';
import abi from "./abi.js"

const Accordion = ({ title, content }) => {
  const [isActive, setIsActive] = useState(false);

  return (
    <div class="w-4/5">
      <div class="mb-10">
        <input type="text" id="wallet_address" autofocus autocomplete="off" placeholder="Wallet address" class="w-2/5 border-2 border-blue-500 px-4 py-1 uppercase rounded-md text-xl text-blue-800 font-semibold outline-none"/>

        <button id="load_button" class="border-2 border-blue-500 bg-blue-700 text-white transition-colors px-4 outline-none py-1 uppercase rounded-md text-xl font-semibold">
          Load Punk NFTs
        </button>
      </div>

      <div id="nfts" class="flex gap-7 flex-wrap"></div>
    </div>
  );
};

export default Accordion;