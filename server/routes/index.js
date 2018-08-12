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
    const body = req.body;
    const blockIndex = bitcoin.createNewTransaction(
      body.amount,
      body.sender,
      body.recipient
    );
    res.send({ note: `Transaction will be added in block ${blockIndex}.` });
  });

  // register a ndoe and broadcast it to the network
  indexRouter.route("/register-and-broadcast-node").post((req, res) => {
    const body = req.body;
    const { newNodeUrl } = body;
    if (bitcoin.networkNodes.indexOf(newNodeUrl) == -1) {
      bitcoin.networkNodes.push(newNodeUrl);
    }
    let regNodePromises = [];
    bitcoin.networkNodes.forEach(networdNodeUrl => {
      const reqOptions = {
        uri: networdNodeUrl + "/register-node",
        method: "GET",
        body: { networdNodeUrl },
        json: true
      };
      regNodePromises.push(reqPromise(reqOptions));
    });

    Promise.all(regNodePromises).then(data => {});
    res.send({ note: `Transaction will be added in block ${blockIndex}.` });
  });

  // register a with the network
  indexRouter.route("/register-node").post((req, res) => {
    const body = req.body;
    const { newNodeUrl } = body;
    res.send({ note: `Transaction will be added in block ${blockIndex}.` });
  });

  // register multipe nodes at once
  indexRouter.route("/register-nodes-bulk").post((req, res) => {
    const body = req.body;
    const { newNodeUrl } = body;
    res.send({ note: `Transaction will be added in block ${blockIndex}.` });
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
