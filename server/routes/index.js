import express from "express";
import BlockChain from "../blockchain";
import { v1 } from "uuid";
import reqPromise from "request-promise-native";

const bitcoin = new BlockChain();
const indexRouter = express.Router();
const nodeAddress = v1()
  .split("-")
  .join("")
  .toUpperCase();

const router = () => {
  indexRouter.route("/blockchain").get((req, res) => {
    res.send(bitcoin);
  });

  indexRouter.route("/transaction").post((req, res) => {
    const newTransaction = req.body;

    // const blockIndex = bitcoin.createNewTransaction(
    //   body.amount,
    //   body.sender,
    //   body.recipient
    // );
    const blockIndex = bitcoin.addTransactionToPendingTransactions(
      newTransaction
    );
    res.send({ note: `Transaction will be added in block ${blockIndex}.` });
  });

  indexRouter.route("/transaction/broadcast").post((req, res) => {
    const { amount, sender, recipient } = req.body;
    const newTransaction = bitcoin.createNewTransaction(
      amount,
      sender,
      recipient
    );

    bitcoin.addTransactionToPendingTransactions(newTransaction);
    let reqPromises = [];
    bitcoin.networkNodes.forEach(networkNode => {
      const reqOptions = {
        uri: networkNode + "/blocks/transaction",
        method: "POST",
        body: newTransaction,
        json: true
      };
      reqPromises.push(reqPromise(reqOptions));
    });

    Promise.all(reqPromises).then(data => {
      console.log("data", data);
      res.json({ note: "Transaction created and broadcasted successfully." });
    });
  });

  // register a ndoe and broadcast it to the network
  indexRouter.route("/register-and-broadcast-node").post((req, res) => {
    const { newNodeUrl } = req.body;
    if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1) {
      bitcoin.networkNodes.push(newNodeUrl);
    }
    let regNodePromises = [];
    bitcoin.networkNodes.forEach(networkNode => {
      const reqOptions = {
        uri: networkNode + "/blocks/register-node",
        method: "POST",
        body: { newNodeUrl },
        json: true
      };
      regNodePromises.push(reqPromise(reqOptions));
    });

    Promise.all(regNodePromises)
      .then(data => {
        const bulkRegisterOptions = {
          uri: newNodeUrl + "/blocks/register-nodes-bulk",
          method: "POST",
          body: {
            allNetworkNodes: [...bitcoin.networkNodes, bitcoin.currentNodeUrl]
          },
          json: true
        };

        return reqPromise(bulkRegisterOptions);
      })
      .then(bulkData => {
        console.log("bulkData", bulkData);
        res.json({ note: `New node register with the network successfully.` });
      });
  });

  // register a with the network
  indexRouter.route("/register-node").post((req, res) => {
    const { newNodeUrl } = req.body;
    const nodeNotAlreadyPresent =
      bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;
    if (nodeNotAlreadyPresent && notCurrentNode) {
      bitcoin.networkNodes.push(newNodeUrl);
    }
    res.json({ note: `New node registered successfully.` });
  });

  // register multipe nodes at once
  indexRouter.route("/register-nodes-bulk").post((req, res) => {
    const { allNetworkNodes } = req.body;
    allNetworkNodes.forEach(networkNode => {
      const nodeNotAlreadyPresent =
        bitcoin.networkNodes.indexOf(networkNode) == -1;
      const notCurrentNode = bitcoin.currentNodeUrl !== networkNode;

      if (nodeNotAlreadyPresent && notCurrentNode) {
        bitcoin.networkNodes.push(networkNode);
      }
    });

    res.json({ note: `Bulk registration successfully.` });
  });

  indexRouter.route("/mine").get((req, res) => {
    const lastBlock = bitcoin.getLastBlock();
    const previousBlockHash = lastBlock["hash"];
    const currentBlockData = {
      transactions: bitcoin.pendingTransactions,
      index: lastBlock["index"] + 1
    };
    const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(
      previousBlockHash,
      currentBlockData,
      nonce
    );

    //
    // bitcoin.createNewTransaction(12.5, "00", nodeAddress); why this get wrong.
    const newBlock = bitcoin.createNewBlock(
      nonce,
      previousBlockHash,
      blockHash
    );
    let requestPromises = [];
    bitcoin.networkNodes.forEach(networkNode => {
      const requestOptions = {
        uri: networkNode + "/blocks/receive-new-block",
        method: "POST",
        body: { newBlock },
        json: true
      };

      requestPromises.push(reqPromise(requestOptions));
    });

    Promise.all(requestPromises)
      .then(data => {
        const requestOptions = {
          uri: bitcoin.currentNodeUrl + "/blocks/transaction/broadcast",
          method: "POST",
          body: {
            amount: 12.5,
            sender: "00",
            recipient: nodeAddress
          },
          json: true
        };

        return reqPromise(requestOptions);
      })
      .then(data => {
        res.json({
          note: "New block mined & broadcast successfully",
          block: newBlock
        });
      });
  });

  indexRouter.route("/receive-new-block").post((req, res) => {
    const { newBlock } = req.body;
    const lastBlock = bitcoin.getLastBlock();
    const validHash = lastBlock.hash === newBlock.previousBlockHash;
    const validIndex = lastBlock["index"] + 1 === newBlock["index"];

    if (validHash && validIndex) {
      bitcoin.chain.push(newBlock);
      bitcoin.pendingTransactions = [];
      res.json({ note: "New block received and accepted", newBlock });
    } else {
      res.json({ note: "New block rejected", newBlock });
    }
  });

  // consensus
  indexRouter.route("/consensus").get((req, res) => {
    let requestPromises = [];
    bitcoin.networkNodes.forEach(networkNode => {
      const requestOptions = {
        uri: networkNode + "/blocks/blockchain",
        method: "GET",
        json: true
      };

      requestPromises.push(reqPromise(requestOptions));
    });

    Promise.all(requestPromises).then(blockchains => {
      const currentChainLength = bitcoin.chain.length;
      let maxChainLength = currentChainLength;
      let newLongestChain = undefined;
      let newPendingTransactions = undefined;
      console.log("blockchains", blockchains);
      blockchains.forEach(blockchain => {
        if (blockchain.chain.length > maxChainLength) {
          maxChainLength = blockchain.chain.length;
          newLongestChain = blockchain.chain;
          newPendingTransactions = blockchain.pendingTransactions;
        }
      });
      console.log("maxChainLength", maxChainLength);
      console.log("newLongestChain", newLongestChain);
      console.log("newPendingTransactions", newPendingTransactions);
      if (
        !newLongestChain ||
        (newLongestChain && !bitcoin.chainIsValid(newLongestChain))
      ) {
        res.json({
          note: "Current chain has not been replaced.",
          chain: bitcoin.chain
        });
      } else {
        bitcoin.chain = newLongestChain;
        bitcoin.pendingTransactions = newPendingTransactions;
        res.json({
          note: "This chain has been replaced.",
          chain: bitcoin.chain
        });
      }
    });
  });

  return indexRouter;
};

export default router;
