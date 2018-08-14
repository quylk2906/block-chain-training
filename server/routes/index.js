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
    const blockIndex = bitcoin.addTransactionToPendingTransactions(newTransaction);
    res.send({ note: `Transaction will be added in block ${blockIndex}.` });
  });

  indexRouter.route("/transaction/broadcast").post((req, res) => {
    const { amount, sender, recipient } = req.body;
    const newTransaction = bitcoin.createNewTransaction(amount, sender, recipient);
    console.log(newTransaction);
    bitcoin.addTransactionToPendingTransactions(newTransaction);
    let reqPromises = [];
    bitcoin.networkNodes.forEach(networkNodeUrl => {
      const reqOptions = {
        uri: networkNodeUrl + "/blocks/transaction",
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
    bitcoin.networkNodes.forEach(networkNodeUrl => {
      const reqOptions = {
        uri: networkNodeUrl + "/blocks/register-node",
        method: "POST",
        body: { newNodeUrl },
        json: true
      };
      regNodePromises.push(reqPromise(reqOptions));
    });

    Promise.all(regNodePromises)
      .then(data => {
        console.log("data", data);
        const bulkRegisterOptions = {
          uri: newNodeUrl + "/blocks/register-nodes-bulk",
          method: "POST",
          body: { allNetworkNodes: [...bitcoin.networkNodes] },
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
    const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = bitcoin.currentNodeUrl !== newNodeUrl;
    if (nodeNotAlreadyPresent && notCurrentNode) {
      bitcoin.networkNodes.push(newNodeUrl);
    }
    res.json({ note: `New node registered successfully.` });
  });

  // register multipe nodes at once
  indexRouter.route("/register-nodes-bulk").post((req, res) => {
    const { allNetworkNodes } = req.body;
    console.log("allNetworkNodes", allNetworkNodes);
    allNetworkNodes.forEach(networkNodeUrl => {
      const nodeNotAlreadyPresent = bitcoin.networkNodes.indexOf(networkNodeUrl) == -1;
      const notCurrentNode = bitcoin.currentNodeUrl !== networkNodeUrl;

      if (nodeNotAlreadyPresent && notCurrentNode) {
        bitcoin.networkNodes.push(networkNodeUrl);
      }
    });

    res.json({ note: `Bulk registration successfully.` });
  });

  indexRouter.route("/mine").get((req, res) => {
    const lastBlock = bitcoin.getLastBlock();
    const previousHash = lastBlock["hash"];
    const currentBlockData = {
      transactions: bitcoin.pendingTransactions,
      index: lastBlock["index"] + 1
    };
    const nonce = bitcoin.proofOfWork(previousHash, currentBlockData);
    const blockHash = bitcoin.hashBlock(previousHash, currentBlockData, nonce);

    bitcoin.createNewTransaction(12.5, "00", nodeAddress);
    const newBlock = bitcoin.createNewBlock(nonce, previousHash, blockHash);
    res.json({ note: "New block has mined successfully", block: newBlock });
  });
  return indexRouter;
};

export default router;
